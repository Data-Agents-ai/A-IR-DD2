# Docker Setup for A-IR-DD2 MongoDB

This directory contains Docker configuration for running MongoDB locally for development.

## 📋 Documentation Index

### 🚨 **START HERE** - Correction Désynchronisation MongoDB ↔ Mongoose
- **[RAPPORT_CORRECTION_FINAL.md](./RAPPORT_CORRECTION_FINAL.md)** 👈 **LIRE EN PREMIER**
  - Synthèse complète du problème et des corrections
  - Procédure de validation étape par étape
  - Checklist de non-régression

### 📚 Documentation Technique
1. **[SCHEMA_VALIDATION.md](./SCHEMA_VALIDATION.md)** - Comparaison exhaustive schémas Docker ↔ Mongoose
2. **[CLEANUP_AND_TEST.md](./CLEANUP_AND_TEST.md)** - Guide de migration et tests
3. **[RESOLUTION_DESYNC.md](./RESOLUTION_DESYNC.md)** - Document de résolution détaillé
4. **[INDEX_STRATEGY.md](./INDEX_STRATEGY.md)** - Stratégie d'indexation MongoDB

### 🛠️ Scripts Utilitaires
- **[../scripts/cleanup-mongodb.ps1](../scripts/cleanup-mongodb.ps1)** - Nettoyage collections en double
- **[../scripts/test-sync.ps1](../scripts/test-sync.ps1)** - Tests de validation synchronisation

---

## 🚀 Quick Start (Après Corrections)

### 1. Nettoyage (Si Collections en Double Existent)
```powershell
cd backend
.\scripts\cleanup-mongodb.ps1
```

### 2. Démarrer MongoDB
```powershell
cd backend/docker
docker-compose up -d
```

### 3. Vérifier Logs
```powershell
docker-compose logs -f mongodb
```

### 4. Accès MongoDB Shell
```bash
docker exec -it a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin
```

### 5. Tests de Validation
```powershell
cd backend
npm run dev  # Dans un terminal
.\scripts\test-sync.ps1  # Dans un autre terminal
```

---

## 📁 Fichiers

- **docker-compose.yml** - Configuration Docker
- **init-mongo.sh** - Script d'initialisation Bash
- **init-collections.js** - Script création collections + validations ✅ CORRIGÉ
- **.env.docker** - Variables d'environnement

---

## 🔧 Configuration

### Variables d'Environnement
Voir `../.env` :
- `MONGO_USER=admin`
- `MONGO_PASSWORD=SecurePassword123!`
- `MONGODB_URI=mongodb://admin:SecurePassword123!@localhost:27017/a-ir-dd2-dev?authSource=admin`

### Ports
- MongoDB : `27017` (localhost)

### Volumes
- `mongodb_data` : Persistance données

---

## 🧹 Maintenance

### Arrêter MongoDB
```powershell
docker-compose down
```

### Arrêter + Supprimer Données
```powershell
docker-compose down -v
```

### Reconstruire Complètement
```powershell
docker-compose down -v
docker-compose up -d --build
```

### Vérifier Collections
```bash
docker exec -it a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin
use a-ir-dd2-dev
db.getCollectionNames()
```

---

## ✅ Collections Créées (Convention snake_case)

- `users`
- `llm_configs`
- `user_settings`
- `workflows`
- `agents` (legacy)
- `agent_prototypes`
- `agent_instances`
- `workflow_nodes`
- `workflow_edges`

---

## 🚨 Troubleshooting

### Problème : Collections en Double
**Solution** : Exécuter `cleanup-mongodb.ps1`

### Problème : "Connection Refused"
**Solution** :
```powershell
docker-compose down
docker-compose up -d
Start-Sleep -Seconds 15
```

### Problème : Index Errors
**Solution** :
```bash
# Supprimer tous les index
use a-ir-dd2-dev
db.collection.dropIndexes()  # Pour chaque collection
```
Puis redémarrer backend pour recréer.

### Problème : Permission Denied
**Solution** : Vérifier que Docker Desktop est lancé avec droits admin

---

## 📊 Health Check

```powershell
# Vérifier que MongoDB répond
docker exec a-ir-dd2-mongodb mongosh --eval "db.adminCommand('ping')"
```

**Résultat attendu** : `{ ok: 1 }`

---

## 🔒 Sécurité

- ⚠️ **Dev Only** : Credentials en clair dans `.env`
- ⚠️ **Production** : Utiliser secrets management (Azure Key Vault, AWS Secrets Manager)
- ✅ Authentication activée (admin user)
- ✅ Network isolation (bridge network Docker)

---

## 📚 Ressources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
