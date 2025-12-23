# Script de Nettoyage et Reconstruction de la Base de Données

## 🧹 Phase 1 : Nettoyage des Collections en Double

### Option A : Nettoyage Manuel (Recommandé pour contrôle)

```bash
# Se connecter à MongoDB
docker exec -it a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin

# Basculer sur la base de données
use a-ir-dd2-dev

# Lister toutes les collections
db.getCollectionNames()

# Supprimer les collections en double (noms sans underscore)
db.llmconfigs.drop()
db.agentprototypes.drop()
db.agentinstances.drop()
db.workflownodes.drop()
db.workflowedges.drop()

# Vérifier que seules les bonnes collections restent
db.getCollectionNames()
# Devrait afficher :
# - users
# - llm_configs
# - user_settings
# - workflows
# - agents (legacy)
# - agent_prototypes
# - agent_instances
# - workflow_nodes
# - workflow_edges
```

### Option B : Reconstruction Complète (Nettoyage total)

```bash
# Arrêter et supprimer tous les volumes Docker
cd backend/docker
docker-compose down -v

# Redémarrer avec le script d'init corrigé
docker-compose up -d

# Attendre que MongoDB soit prêt (environ 10-15 secondes)
sleep 15

# Vérifier les logs
docker-compose logs mongodb

# Vérifier les collections créées
docker exec -it a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin
use a-ir-dd2-dev
db.getCollectionNames()
```

---

## ✅ Phase 2 : Validation Backend

### 1. Compiler le Backend

```bash
cd backend
npm run build
```

**Résultat attendu** : 0 erreurs TypeScript

### 2. Démarrer le Backend

```bash
npm run dev
```

**Logs attendus** :
```
🔄 Tentative de connexion à MongoDB (1/5)...
✅ MongoDB connecté avec succès
📍 URI: mongodb://admin:<credentials>@localhost:27017/a-ir-dd2-dev
📦 MongoDB déjà connecté
🚀 Backend lancé sur port 3001
```

### 3. Tester l'Authentification

```powershell
# Créer un utilisateur de test
$body = @{
    email = "test-sync@example.com"
    password = "TestSync123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$token = $loginResponse.token
Write-Host "Token: $token"
```

### 4. Tester la Création de Workflow

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$workflowBody = @{
    name = "Test Workflow Sync"
    description = "Validation synchronisation schema"
} | ConvertTo-Json

$workflow = Invoke-RestMethod -Uri "http://localhost:3001/api/workflows" `
    -Method POST `
    -Headers $headers `
    -Body $workflowBody

Write-Host "Workflow créé : $($workflow._id)"
```

### 5. Tester la Création d'Agent Prototype

```powershell
$prototypeBody = @{
    name = "Agent Test Sync"
    role = "Assistant de test"
    systemPrompt = "Tu es un agent de test de synchronisation"
    llmProvider = "OpenAI"
    llmModel = "gpt-4"
    capabilities = @("chat")
    robotId = "AR_001"
} | ConvertTo-Json

$prototype = Invoke-RestMethod -Uri "http://localhost:3001/api/agent-prototypes" `
    -Method POST `
    -Headers $headers `
    -Body $prototypeBody

Write-Host "Prototype créé : $($prototype._id)"
```

### 6. Tester la Création d'Agent Instance

```powershell
$instanceBody = @{
    workflowId = $workflow._id
    prototypeId = $prototype._id
    name = "Agent Instance Test"
    role = "Assistant de test"
    systemPrompt = "Tu es un agent de test"
    llmProvider = "OpenAI"
    llmModel = "gpt-4"
    capabilities = @("chat")
    robotId = "AR_001"
    position = @{
        x = 100
        y = 100
    }
} | ConvertTo-Json -Depth 3

$instance = Invoke-RestMethod -Uri "http://localhost:3001/api/workflows/$($workflow._id)/instances" `
    -Method POST `
    -Headers $headers `
    -Body $instanceBody

Write-Host "Instance créée : $($instance._id)"
```

---

## 🔍 Phase 3 : Vérification dans MongoDB

```bash
docker exec -it a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin
use a-ir-dd2-dev

# Vérifier qu'aucune collection en double n'a été créée
db.getCollectionNames()

# Vérifier le contenu des collections
db.workflows.find().pretty()
db.agent_prototypes.find().pretty()
db.agent_instances.find().pretty()

# Vérifier que les noms de collections respectent snake_case
# Résultat attendu : workflows, agent_prototypes, agent_instances
# PAS : agentprototypes, agentinstances
```

---

## ✅ Checklist de Validation

- [ ] **Collections en double supprimées** (llmconfigs, agentprototypes, etc.)
- [ ] **Script init-collections.js** utilise bien `userId` au lieu de `creator_id`
- [ ] **Modèles Mongoose** forcent les noms de collections via `collection: 'nom'`
- [ ] **Backend compile** sans erreurs TypeScript
- [ ] **Connexion MongoDB** réussie au démarrage
- [ ] **Création utilisateur** fonctionne
- [ ] **Création workflow** persiste dans `workflows` (pas de doublon)
- [ ] **Création prototype** persiste dans `agent_prototypes` (pas `agentprototypes`)
- [ ] **Création instance** persiste dans `agent_instances` (pas `agentinstances`)
- [ ] **Relations FK** correctes (userId, workflowId, prototypeId)
- [ ] **Index MongoDB** créés correctement (vérifier avec `db.collection.getIndexes()`)

---

## 🚨 Troubleshooting

### Problème : Collections en double persistent

**Cause** : Mongoose crée les collections automatiquement si elles n'existent pas au premier `save()`

**Solution** :
```bash
# Supprimer manuellement les collections en double
docker exec -it a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin
use a-ir-dd2-dev
db.llmconfigs.drop()
db.agentprototypes.drop()
# etc.
```

### Problème : Erreur CastError lors de l'insertion

**Cause** : Type mismatch entre schéma Docker et Mongoose

**Solution** : Vérifier [SCHEMA_VALIDATION.md](./SCHEMA_VALIDATION.md) et corriger les types

### Problème : Index errors lors du démarrage

**Cause** : Index définis dans Docker et Mongoose sont différents

**Solution** :
```bash
# Reconstruire les index
docker exec -it a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin
use a-ir-dd2-dev
db.collection.dropIndexes()  # Pour chaque collection
```

Puis redémarrer le backend pour que Mongoose recrée les index.

---

## 📊 Script PowerShell Complet de Test

```powershell
# test-sync.ps1 - Script de validation de synchronisation

Write-Host "🧪 Test de Synchronisation MongoDB ↔ Mongoose" -ForegroundColor Cyan
Write-Host ""

# 1. Register
Write-Host "1️⃣ Création utilisateur test..." -ForegroundColor Yellow
$registerBody = @{
    email = "sync-test-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "SyncTest123!"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody
    Write-Host "✅ Utilisateur créé : $($registerResponse.user.email)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur création utilisateur : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Login
Write-Host "2️⃣ Login..." -ForegroundColor Yellow
$loginBody = @{
    email = $registerResponse.user.email
    password = "SyncTest123!"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

$headers = @{
    "Authorization" = "Bearer $($loginResponse.token)"
    "Content-Type" = "application/json"
}
Write-Host "✅ Token obtenu" -ForegroundColor Green

# 3. Workflow
Write-Host "3️⃣ Création workflow..." -ForegroundColor Yellow
$workflowBody = @{
    name = "Workflow Test Sync"
    description = "Validation persistance"
} | ConvertTo-Json

$workflow = Invoke-RestMethod -Uri "http://localhost:3001/api/workflows" `
    -Method POST `
    -Headers $headers `
    -Body $workflowBody
Write-Host "✅ Workflow créé : $($workflow._id)" -ForegroundColor Green

# 4. Prototype
Write-Host "4️⃣ Création agent prototype..." -ForegroundColor Yellow
$prototypeBody = @{
    name = "Agent Sync Test"
    role = "Test assistant"
    systemPrompt = "You are a test agent"
    llmProvider = "OpenAI"
    llmModel = "gpt-4"
    capabilities = @("chat")
    robotId = "AR_001"
} | ConvertTo-Json

$prototype = Invoke-RestMethod -Uri "http://localhost:3001/api/agent-prototypes" `
    -Method POST `
    -Headers $headers `
    -Body $prototypeBody
Write-Host "✅ Prototype créé : $($prototype._id)" -ForegroundColor Green

# 5. Instance
Write-Host "5️⃣ Création agent instance..." -ForegroundColor Yellow
$instanceBody = @{
    workflowId = $workflow._id
    prototypeId = $prototype._id
    name = "Instance Sync Test"
    role = "Test assistant"
    systemPrompt = "You are a test instance"
    llmProvider = "OpenAI"
    llmModel = "gpt-4"
    capabilities = @("chat")
    robotId = "AR_001"
    position = @{ x = 100; y = 100 }
} | ConvertTo-Json -Depth 3

$instance = Invoke-RestMethod -Uri "http://localhost:3001/api/workflows/$($workflow._id)/instances" `
    -Method POST `
    -Headers $headers `
    -Body $instanceBody
Write-Host "✅ Instance créée : $($instance._id)" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Tous les tests de synchronisation réussis !" -ForegroundColor Green
Write-Host "📊 Vérifiez dans MongoDB que les collections sont bien :" -ForegroundColor Cyan
Write-Host "   - workflows (pas 'workflows')" -ForegroundColor Cyan
Write-Host "   - agent_prototypes (pas 'agentprototypes')" -ForegroundColor Cyan
Write-Host "   - agent_instances (pas 'agentinstances')" -ForegroundColor Cyan
```

Sauvegarder dans `backend/scripts/test-sync.ps1` et exécuter :
```powershell
cd backend
.\scripts\test-sync.ps1
```
