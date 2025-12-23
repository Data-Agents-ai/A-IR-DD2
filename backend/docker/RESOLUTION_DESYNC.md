# 🎯 Résolution du Problème de Désynchronisation MongoDB ↔ Mongoose

## 📋 Problème Identifié

**Symptôme** : Collections en double avec conventions de nommage différentes
- `agent_instances` (Docker) ✅ snake_case
- `agentinstances` (Mongoose) ❌ auto-pluralized

**Cause Racine** : Mongoose pluralise automatiquement les noms de modèles sans utiliser les underscores.

---

## ✅ Corrections Appliquées

### 1. **Modèles Mongoose** - Forçage des Noms de Collections

Ajout de l'option `collection` dans les schemas pour forcer le nom exact :

| Modèle | Fichier | Nom Forcé |
|--------|---------|-----------|
| LLMConfig | `LLMConfig.model.ts` | `llm_configs` |
| AgentPrototype | `AgentPrototype.model.ts` | `agent_prototypes` |
| AgentInstance | `AgentInstance.model.ts` | `agent_instances` |
| WorkflowNode | `WorkflowNode.model.ts` | `workflow_nodes` |
| WorkflowEdge | `WorkflowEdge.model.ts` | `workflow_edges` |

**Exemple de correction** :
```typescript
// Avant
}, {
    timestamps: true
});

// Après
}, {
    timestamps: true,
    collection: 'agent_prototypes'  // Forçage explicite
});
```

### 2. **Script Docker** - Alignement avec Mongoose

**Fichier** : `backend/docker/init-collections.js`

#### Corrections de Champs

| Collection | Champ Docker (Avant) | Champ Mongoose | Correction |
|------------|----------------------|----------------|------------|
| users | `passwordHash` | `password` | ✅ Renommé `password` |
| users | - | `role`, `lastLogin` | ✅ Ajoutés |
| workflows | `creator_id` | `userId` | ✅ Renommé `userId` |
| workflows | `status` | `isActive`, `isDirty` | ✅ Remplacé |
| agent_prototypes | `creator_id` | `userId` | ✅ Renommé `userId` |
| agent_instances | Index `agentId` | Index `workflowId` | ✅ Corrigé |

#### Ajout de Validations Complètes

Toutes les collections ont maintenant des validators JSON Schema cohérents avec les modèles Mongoose :

- ✅ Types BSON corrects (`objectId`, `string`, `bool`, `array`, `object`)
- ✅ Champs requis alignés
- ✅ Enums validés (`robotId`, `nodeType`, `edgeType`)
- ✅ Index composés identiques

---

## 📊 Mapping Final des Collections

| Mongoose Model | Collection MongoDB | État |
|----------------|-------------------|------|
| User | `users` | ✅ Natif (pluriel simple) |
| LLMConfig | `llm_configs` | ✅ Forcé |
| UserSettings | `user_settings` | ✅ Forcé (déjà existant) |
| Workflow | `workflows` | ✅ Natif (pluriel simple) |
| AgentPrototype | `agent_prototypes` | ✅ Forcé |
| AgentInstance | `agent_instances` | ✅ Forcé |
| WorkflowNode | `workflow_nodes` | ✅ Forcé |
| WorkflowEdge | `workflow_edges` | ✅ Forcé |

**Convention adoptée** : **snake_case** pour toutes les collections

---

## 🛠️ Procédure de Migration

### Étape 1 : Nettoyage (Obligatoire)

```powershell
# Exécuter le script de nettoyage
cd backend
.\scripts\cleanup-mongodb.ps1
```

Ce script supprime :
- `llmconfigs`
- `agentprototypes`
- `agentinstances`
- `workflownodes`
- `workflowedges`

### Étape 2 : Option A - Nettoyage Partiel (Données Préservées)

Si vous avez des données de test à conserver dans `users`, `workflows`, etc. :

1. Exécuter `cleanup-mongodb.ps1` (supprime uniquement les collections en double)
2. Redémarrer le backend : `npm run dev`
3. Les collections snake_case existantes seront utilisées

### Étape 2 : Option B - Reconstruction Complète (Recommandé)

Pour repartir d'un état propre :

```powershell
cd backend/docker
docker-compose down -v
docker-compose up -d

# Attendre 15 secondes
Start-Sleep -Seconds 15

# Vérifier les logs
docker-compose logs mongodb
```

### Étape 3 : Validation

```powershell
cd backend

# Compiler
npm run build

# Démarrer
npm run dev

# Tester
.\scripts\test-sync.ps1
```

---

## ✅ Tests de Validation

Le script `test-sync.ps1` valide :

1. ✅ **Création utilisateur** → Collection `users`
2. ✅ **Création workflow** → Collection `workflows`
3. ✅ **Création prototype** → Collection `agent_prototypes` (pas `agentprototypes`)
4. ✅ **Création instance** → Collection `agent_instances` (pas `agentinstances`)
5. ✅ **Absence de doublons** → Vérification MongoDB directe

**Résultat attendu** :
```
✅ Tous les tests de synchronisation réussis !
✅ Aucune collection en double détectée !
```

---

## 📁 Fichiers Modifiés

### Backend Models (5 fichiers)
- ✅ `backend/src/models/LLMConfig.model.ts`
- ✅ `backend/src/models/AgentPrototype.model.ts`
- ✅ `backend/src/models/AgentInstance.model.ts`
- ✅ `backend/src/models/WorkflowNode.model.ts`
- ✅ `backend/src/models/WorkflowEdge.model.ts`

### Docker Init Script (1 fichier)
- ✅ `backend/docker/init-collections.js`

### Documentation & Scripts (4 fichiers)
- ✅ `backend/docker/SCHEMA_VALIDATION.md` (nouveau)
- ✅ `backend/docker/CLEANUP_AND_TEST.md` (nouveau)
- ✅ `backend/scripts/test-sync.ps1` (nouveau)
- ✅ `backend/scripts/cleanup-mongodb.ps1` (nouveau)

---

## 🔍 Vérification Post-Migration

### Dans MongoDB

```bash
docker exec -it a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin

use a-ir-dd2-dev
db.getCollectionNames()
```

**Résultat attendu** :
```
agents (legacy)
agent_instances
agent_prototypes
llm_configs
user_settings
users
workflow_edges
workflow_nodes
workflows
```

**PAS** : `agentinstances`, `agentprototypes`, `llmconfigs`, etc.

### Dans les Logs Backend

```
✅ MongoDB connecté avec succès
📍 URI: mongodb://admin:<credentials>@localhost:27017/a-ir-dd2-dev
```

Aucun warning de type "Collection created dynamically".

---

## 🚨 Troubleshooting

### Problème : Collections en double persistent après nettoyage

**Solution** :
1. Arrêter le backend
2. Exécuter `cleanup-mongodb.ps1` à nouveau
3. Redémarrer le backend

### Problème : CastError sur ObjectId

**Cause** : Types incorrects dans init-collections.js

**Solution** : Vérifier [SCHEMA_VALIDATION.md](./SCHEMA_VALIDATION.md) pour le mapping exact

### Problème : Index errors

**Solution** :
```bash
# Supprimer tous les index
docker exec -it a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin
use a-ir-dd2-dev
db.agent_prototypes.dropIndexes()
db.agent_instances.dropIndexes()
# etc.

# Redémarrer backend pour recréer les index
npm run dev
```

---

## 📚 Documents de Référence

- **[SCHEMA_VALIDATION.md](./SCHEMA_VALIDATION.md)** : Comparaison détaillée champ par champ
- **[CLEANUP_AND_TEST.md](./CLEANUP_AND_TEST.md)** : Guide complet de migration
- **[../documentation/ETAPE2_ARCHITECTURE_PERSISTANCE.md](../documentation/ETAPE2_ARCHITECTURE_PERSISTANCE.md)** : Architecture de sécurité

---

## ✅ Checklist Finale

- [x] Modèles Mongoose forcent les noms snake_case via `collection: 'nom'`
- [x] Script Docker utilise `userId` au lieu de `creator_id`
- [x] Script Docker utilise `password` au lieu de `passwordHash`
- [x] Index MongoDB alignés entre Docker et Mongoose
- [x] Validations JSON Schema complètes dans init-collections.js
- [x] Scripts de nettoyage et test créés
- [x] Documentation de migration complète

---

## 🎯 Prochaines Étapes

1. **Maintenant** : Exécuter la migration (Étape 1 + 2 ci-dessus)
2. **Validation** : Lancer `test-sync.ps1` et vérifier les résultats
3. **QA** : Tester les flows complets (création workflow → agents → edges)
4. **Monitoring** : Surveiller les logs backend pour détecter toute régression

---

## 📌 Note Architecturale

Cette correction garantit la **cohérence des conventions de nommage** entre :
- Infrastructure Docker (init script)
- ORM Backend (Mongoose)
- Base de données (MongoDB)

**Principe SOLID appliqué** :
- **Single Source of Truth** : Mongoose force le nom, pas d'ambiguïté
- **Fail-Fast** : Erreur immédiate si collection incorrecte
- **Explicit over Implicit** : Noms forcés explicitement, pas de magie

Cette base solide évitera les problèmes de persistance futurs lors de l'ajout de nouvelles collections.
