# Index MongoDB - Documentation Complète

## 📊 Index par Collection

### 1. **users**

```javascript
// Index unique sur email (authentification)
db.users.createIndex({ email: 1 }, { unique: true });
```

**Justification** :
- ✅ Lookup rapide lors du login (`findOne({ email })`)
- ✅ Garantit unicité email (pas de doublons)
- ✅ Sécurité : authentification optimale

**Queries optimisées** :
- `User.findOne({ email: "user@example.com" })`
- `User.find({ email: { $in: [...] } })`

---

### 2. **llm_configs**

```javascript
// Index composé userId + provider (unique constraint)
db.llm_configs.createIndex({ userId: 1, provider: 1 }, { unique: true });

// Index simple userId (filtrage par user)
db.llm_configs.createIndex({ userId: 1 });

// Index enabled (listing providers actifs)
db.llm_configs.createIndex({ enabled: 1 });
```

**Justification** :
- ✅ 1 config max par provider par user
- ✅ Queries user-scoped très fréquentes
- ✅ Filtrage providers actifs pour UI

**Queries optimisées** :
- `LLMConfig.find({ userId, provider })`
- `LLMConfig.find({ userId, enabled: true })`

---

### 3. **user_settings**

```javascript
// Index unique userId (1 document par user)
db.user_settings.createIndex({ userId: 1 }, { unique: true });
```

**Justification** :
- ✅ Relation 1-to-1 User ↔ Settings
- ✅ Lookup ultra-rapide (`findOne({ userId })`)
- ✅ Garantit 1 seul document settings par user

**Queries optimisées** :
- `UserSettings.findOne({ userId })`
- `UserSettings.updateOne({ userId }, { $set: {...} })`

---

### 4. **workflows**

```javascript
// Index composé userId + isActive (workflow actif par user)
db.workflows.createIndex({ userId: 1, isActive: 1 });

// Index composé userId + updatedAt (tri chronologique)
db.workflows.createIndex({ userId: 1, updatedAt: -1 });
```

**Justification** :
- ✅ Queries user-scoped (sécurité ownership)
- ✅ Récupération workflow actif : `find({ userId, isActive: true })`
- ✅ Listing workflows triés par dernière modification

**Queries optimisées** :
- `Workflow.find({ userId, isActive: true }).limit(1)`
- `Workflow.find({ userId }).sort({ updatedAt: -1 })`

**⚠️ Note Métier** : Actuellement, pas de unique constraint sur `{ userId, isActive }` côté MongoDB. La logique métier dans le backend garantit 1 seul workflow actif par user.

---

### 5. **agent_prototypes**

```javascript
// Index composé userId + createdAt (listing prototypes)
db.agent_prototypes.createIndex({ userId: 1, createdAt: -1 });

// Index composé userId + robotId (filtrage par robot)
db.agent_prototypes.createIndex({ userId: 1, robotId: 1 });
```

**Justification** :
- ✅ Queries user-scoped (sécurité ownership)
- ✅ Filtrage par robot creator (Archi, Bos, etc.)
- ✅ Tri chronologique pour UI (derniers créés en premier)

**Queries optimisées** :
- `AgentPrototype.find({ userId }).sort({ createdAt: -1 })`
- `AgentPrototype.find({ userId, robotId: "AR_001" })`

---

### 6. **agent_instances**

```javascript
// Index composé workflowId + createdAt (agents d'un workflow)
db.agent_instances.createIndex({ workflowId: 1, createdAt: -1 });

// Index composé userId + workflowId (ownership check)
db.agent_instances.createIndex({ userId: 1, workflowId: 1 });

// Index simple prototypeId (traçabilité prototype → instances)
db.agent_instances.createIndex({ prototypeId: 1 });
```

**Justification** :
- ✅ Queries workflow-scoped très fréquentes (UI canvas)
- ✅ Ownership validation multi-niveaux (user owns workflow owns instances)
- ✅ Traçabilité : retrouver toutes instances créées depuis un prototype

**Queries optimisées** :
- `AgentInstance.find({ workflowId }).sort({ createdAt: -1 })`
- `AgentInstance.find({ userId, workflowId })`
- `AgentInstance.find({ prototypeId })` (cascade queries)

---

### 7. **workflow_nodes**

```javascript
// Index composé ownerId + nodeType (filtrage par type)
db.workflow_nodes.createIndex({ ownerId: 1, nodeType: 1 });

// Index composé ownerId + createdAt (listing chronologique)
db.workflow_nodes.createIndex({ ownerId: 1, createdAt: -1 });
```

**Justification** :
- ✅ Queries user-scoped (sécurité ownership)
- ✅ Filtrage par type de node (agent, connection, event, file)
- ✅ Tri chronologique

**Queries optimisées** :
- `WorkflowNode.find({ ownerId, nodeType: "agent" })`
- `WorkflowNode.find({ ownerId }).sort({ createdAt: -1 })`

**⚠️ Note Architecture** : Relation avec `ownerId` (User) et non `workflowId` car les nodes peuvent être réutilisés entre workflows (Design Domain).

---

### 8. **workflow_edges**

```javascript
// Index simple workflowId (edges d'un workflow)
db.workflow_edges.createIndex({ workflowId: 1 });

// Index simple sourceInstanceId (edges sortants d'un agent)
db.workflow_edges.createIndex({ sourceInstanceId: 1 });

// Index simple targetInstanceId (edges entrants vers un agent)
db.workflow_edges.createIndex({ targetInstanceId: 1 });
```

**Justification** :
- ✅ Queries workflow-scoped (charger tout le graphe)
- ✅ Queries agent-scoped (connections d'un agent spécifique)
- ✅ Support graph traversal (source → targets, target → sources)

**Queries optimisées** :
- `WorkflowEdge.find({ workflowId })`
- `WorkflowEdge.find({ sourceInstanceId })` (edges sortants)
- `WorkflowEdge.find({ targetInstanceId })` (edges entrants)

**Use Cases** :
- Canvas UI : charger tous les edges du workflow actif
- Agent isolation : supprimer un agent → trouver et supprimer ses edges
- Graph validation : vérifier cycles, connexions orphelines

---

## 🔍 Analyse de Performance

### Index Composés vs Index Simples

**Règle MongoDB** : Un index composé `{ a: 1, b: 1 }` peut optimiser :
- ✅ Queries sur `a` seul
- ✅ Queries sur `a` et `b`
- ❌ Queries sur `b` seul (inefficace)

**Application au projet** :

#### Exemple 1 : workflows
```javascript
// Index : { userId: 1, isActive: 1 }
// ✅ Optimisé
Workflow.find({ userId })
Workflow.find({ userId, isActive: true })

// ❌ Pas optimisé (scan complet)
Workflow.find({ isActive: true })
```

Solution : Si besoin de query globale sur `isActive`, créer index séparé :
```javascript
db.workflows.createIndex({ isActive: 1 });
```

#### Exemple 2 : agent_instances
```javascript
// Index : { workflowId: 1, createdAt: -1 }
// ✅ Optimisé
AgentInstance.find({ workflowId })
AgentInstance.find({ workflowId }).sort({ createdAt: -1 })

// ❌ Pas optimisé
AgentInstance.find().sort({ createdAt: -1 }) // Global sort
```

---

## 📊 Stratégie d'Indexation

### Priorité 1 : Sécurité (Ownership)
Tous les index incluent `userId` ou équivalent :
- ✅ `workflows`: `userId` en premier
- ✅ `agent_prototypes`: `userId` en premier
- ✅ `agent_instances`: `userId + workflowId`
- ✅ `workflow_nodes`: `ownerId` en premier

**Justification** : Les queries sont TOUJOURS user-scoped pour sécurité.

### Priorité 2 : Performance UI
Index sur champs fréquemment triés/filtrés :
- ✅ `createdAt`, `updatedAt` : Tri chronologique
- ✅ `isActive` : Filtrage workflow actif
- ✅ `robotId` : Filtrage par robot creator
- ✅ `nodeType` : Filtrage par type de node

### Priorité 3 : Relations FK
Index sur foreign keys pour cascades :
- ✅ `workflowId` : Charger agents d'un workflow
- ✅ `prototypeId` : Traçabilité prototype → instances
- ✅ `sourceInstanceId`, `targetInstanceId` : Graph traversal

---

## ⚡ Optimisations Futures (Si Besoin)

### Scenario 1 : Recherche Full-Text sur Agents
Si besoin de rechercher par nom/description :
```javascript
db.agent_prototypes.createIndex({
    name: "text",
    role: "text",
    systemPrompt: "text"
});
```

### Scenario 2 : Queries Admin Globales
Si admin doit voir tous les workflows sans filtrage user :
```javascript
db.workflows.createIndex({ isActive: 1 });
db.workflows.createIndex({ createdAt: -1 });
```

### Scenario 3 : Queries Multi-Filters Complexes
Si UI permet filtrage multi-critères :
```javascript
db.agent_prototypes.createIndex({
    userId: 1,
    robotId: 1,
    llmProvider: 1,
    createdAt: -1
});
```

---

## 🧪 Validation des Index

### Vérifier Index Existants

```bash
docker exec -it a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin

use a-ir-dd2-dev

# Pour chaque collection
db.workflows.getIndexes()
db.agent_prototypes.getIndexes()
db.agent_instances.getIndexes()
# etc.
```

### Analyser Performance d'une Query

```javascript
// Utiliser .explain("executionStats")
db.workflows.find({ userId: ObjectId("...") }).explain("executionStats")
```

**Indicateurs clés** :
- `totalDocsExamined` : nombre de documents scannés
- `executionTimeMillis` : temps d'exécution
- `indexesUsed` : index utilisé

**Bon résultat** : `totalDocsExamined` ≈ nombre de résultats retournés

---

## 📌 Checklist Maintenance Index

- [ ] Tous les index définis dans Mongoose sont créés dans MongoDB
- [ ] Tous les index Docker (init-collections.js) matchent les modèles Mongoose
- [ ] Pas d'index redondants (`{ userId: 1 }` si déjà `{ userId: 1, createdAt: -1 }`)
- [ ] Index unique sur champs business critiques (`email`, `userId+provider`)
- [ ] Index composés dans le bon ordre (champ le plus filtré en premier)
- [ ] Performance monitoring sur queries lentes (>100ms)

---

## 🎯 Résumé Stratégique

**Principe** : **Index Minimal mais Suffisant**
- ✅ Couvrir 100% des queries métier fréquentes
- ✅ Éviter sur-indexation (coût en write performance)
- ✅ Priorité sécurité (user-scoped) > performance absolue

**Monitoring continu** : Si queries lentes détectées en production, analyser avec `.explain()` et ajouter index ciblés.
