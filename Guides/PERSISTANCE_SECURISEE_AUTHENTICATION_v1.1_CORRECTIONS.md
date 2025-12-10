# 🔄 MISE À JOUR CRITIQUE v1.1
## Corrections Architecturales - Jalon 3

**Date**: 10 Décembre 2025  
**Basé sur**: [`ADDENDUM_CRITIQUE_WORKFLOW_SCHEMA.md`](../backend/documentation/guides/jalons/ADDENDUM_CRITIQUE_WORKFLOW_SCHEMA.md)  
**Statut**: ✅ VALIDÉ & IMPLÉMENTÉ (Phase 1)

---

## ⚠️ CORRECTIONS MAJEURES

### **1. GOUVERNANCE : Minimale (Ownership-Based)**

#### ❌ **APPROCHE INITIALE (ABANDONNÉE)**
```typescript
// backend/src/constants/robots.ts (SUPPRIMÉ)
export const ROBOT_RESOURCE_PERMISSIONS = {
  'AR_001': ['agent'],           // Seul Archi peut créer agents
  'COM_001': ['connection'],     // Seul Com peut créer connections
  // ...
};

// backend/src/middleware/robotGovernance.middleware.ts (SUPPRIMÉ)
export const validateRobotPermission = (resourceType: string) => {
  return (req, res, next) => {
    const { robotId } = req.body;
    if (!ROBOT_RESOURCE_PERMISSIONS[robotId]?.includes(resourceType)) {
      return res.status(403).json({ error: 'Robot non autorisé' });
    }
    next();
  };
};
```

**Problème** : Trop restrictif, l'utilisateur authentifié devait avoir TOUS les droits CRUD sur ses propres ressources.

---

#### ✅ **NOUVELLE APPROCHE (IMPLÉMENTÉE)**

```typescript
// backend/src/middleware/auth.middleware.ts
export const requireOwnershipAsync = (
  getResourceUserId: (req: Request) => Promise<string | null>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      const resourceUserId = await getResourceUserId(req);
      
      if (!resourceUserId) {
        return res.status(404).json({ error: 'Ressource introuvable' });
      }
      
      if (resourceUserId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès refusé: pas propriétaire' });
      }
      
      next();
    } catch (error) {
      console.error('[Auth] Ownership check error:', error);
      res.status(500).json({ error: 'Erreur vérification ownership' });
    }
  };
};
```

**Avantages** :
- ✅ User authentifié = contrôle TOTAL sur ses ressources
- ✅ `robotId` = metadata seulement (pas de restriction création)
- ✅ Governance asynchrone (supporte queries MongoDB)
- ✅ Retours 404 si ressource inexistante, 403 si mauvais propriétaire

---

### **2. HIÉRARCHIE BDD : Workflow-Centric**

#### **Ancienne Structure** ❌
```
User
  └── Agent (prototype) → AgentInstance (orphelin, pas de workflow)
  └── LLMConfig
```

#### **Nouvelle Structure** ✅
```
User
  ├── AgentPrototype (GLOBAL - accessible de tous workflows)
  ├── LLMConfig (GLOBAL - accessible de tous workflows)
  └── Workflow (1:N - plusieurs canvas)
       ├── AgentInstance (LOCAL - lié à UN workflow)
       └── WorkflowEdge (LOCAL - connexions canvas)
```

---

### **3. NOUVEAUX MODÈLES**

#### **3.1 Workflow.model.ts** *(Canvas utilisateur)*

```typescript
export interface IWorkflow extends Document {
  userId: mongoose.Types.ObjectId; // FK → User
  name: string;
  description?: string;
  isActive: boolean;        // Un seul actif par user
  isDirty: boolean;         // Détection modifications non sauvegardées
  lastSavedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Index
{ userId: 1, isActive: 1 }    // Trouver workflow actif
{ userId: 1, updatedAt: -1 }  // Listing chronologique
```

**Fonctionnalités** :
- ✅ Un seul workflow `isActive: true` par user
- ✅ `isDirty` auto-updated quand instances modifiées
- ✅ Suppression cascade (workflow → instances + edges)

---

#### **3.2 WorkflowEdge.model.ts** *(Connexions React Flow)*

```typescript
export interface IWorkflowEdge extends Document {
  workflowId: mongoose.Types.ObjectId;      // FK → Workflow
  userId: mongoose.Types.ObjectId;          // FK → User
  sourceInstanceId: mongoose.Types.ObjectId; // FK → AgentInstance
  targetInstanceId: mongoose.Types.ObjectId; // FK → AgentInstance
  sourceHandle?: string;
  targetHandle?: string;
  edgeType?: string; // 'default' | 'step' | 'smoothstep'
  animated?: boolean;
  label?: string;
}

// Index
{ workflowId: 1 }
{ sourceInstanceId: 1 }
{ targetInstanceId: 1 }
```

**Fonctionnalités** :
- ✅ Stockage connexions React Flow canvas
- ✅ Suppression automatique si workflow supprimé

---

#### **3.3 AgentPrototype.model.ts** *(Renommé depuis Agent)*

**Changements critiques** :
- `ownerId` → `userId` (nomenclature cohérente)
- Ajout `isPrototype: true` (immutable)
- `robotId` reste présent (metadata, pas de restriction)

```typescript
export interface IAgentPrototype extends Document {
  userId: mongoose.Types.ObjectId; // Ownership
  robotId: string; // Metadata uniquement
  name: string;
  role: string;
  systemPrompt: string;
  llmProvider: string;
  llmModel: string;
  capabilities: string[];
  historyConfig?: object;
  tools?: object[];
  outputConfig?: object;
  isPrototype: boolean; // Immutable = true
}

// Index
{ userId: 1, createdAt: -1 }
{ userId: 1, robotId: 1 }
```

**Portée GLOBAL** :
- ✅ Accessible de TOUS workflows user
- ✅ Templates réutilisables
- ✅ Suppression prototype ≠ suppression instances (snapshot indépendant)

---

#### **3.4 AgentInstance.model.ts** *(Modifié)*

**Changements critiques** :
- Ajout `workflowId` (FK → Workflow) **CRITIQUE pour portée LOCAL**
- Ajout `userId` (ownership direct)
- Ajout snapshot COMPLET config (name, role, systemPrompt, llmProvider, llmModel, etc.)
- Suppression `configurationJson` (remplacé par champs explicites)
- `prototypeId` devient **optionnel**

```typescript
export interface IAgentInstance extends Document {
  workflowId: mongoose.Types.ObjectId; // LOCAL scope
  userId: mongoose.Types.ObjectId;
  prototypeId?: mongoose.Types.ObjectId; // Optional
  
  // SNAPSHOT CONFIG (copie indépendante)
  name: string;
  role: string;
  systemPrompt: string;
  llmProvider: string;
  llmModel: string;
  capabilities: string[];
  historyConfig?: object;
  tools?: object[];
  outputConfig?: object;
  robotId: string;
  
  // Canvas properties
  position: { x: number; y: number };
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
}

// Index
{ workflowId: 1, createdAt: -1 }
{ userId: 1, workflowId: 1 }
{ prototypeId: 1 }
```

**Portée LOCAL** :
- ✅ Lié à UN workflow spécifique
- ✅ Snapshot indépendant (modification prototype ≠ modification instance)
- ✅ Suppression workflow → cascade delete instances

---

### **4. ROUTES API (Jalon 3 - Phase 1)**

#### **4.1 Workflows Routes**
**Fichier** : `backend/src/routes/workflows.routes.ts`

| Méthode | Endpoint | Description | Ownership |
|---------|----------|-------------|-----------|
| GET | `/api/workflows` | Liste workflows user + agent counts | requireAuth |
| GET | `/api/workflows/:id` | Workflow + agents + edges (composite) | requireAuth + requireOwnershipAsync |
| POST | `/api/workflows` | Créer workflow (premier auto-active) | requireAuth |
| PUT | `/api/workflows/:id` | Mettre à jour (gère isActive toggle) | requireAuth + requireOwnershipAsync |
| DELETE | `/api/workflows/:id` | Supprimer (cascade instances + edges) | requireAuth + requireOwnershipAsync |
| POST | `/api/workflows/:id/save` | Marquer sauvegardé (reset isDirty) | requireAuth + requireOwnershipAsync |
| POST | `/api/workflows/:id/mark-dirty` | Marquer modifié | requireAuth + requireOwnershipAsync |

**Exemple requête** :
```typescript
// GET /api/workflows
// Response
[
  {
    _id: '...',
    userId: '...',
    name: 'Mon Workflow Principal',
    isActive: true,
    isDirty: false,
    lastSavedAt: '2025-12-10T14:30:00Z',
    agentCount: 5,  // Enrichissement
    createdAt: '...',
    updatedAt: '...'
  }
]

// GET /api/workflows/:id
// Response
{
  workflow: { _id, name, isActive, isDirty, ... },
  agents: [{ _id, name, position, robotId, ... }],
  edges: [{ _id, sourceInstanceId, targetInstanceId, ... }]
}
```

---

#### **4.2 Agent Prototypes Routes** *(GLOBAL)*
**Fichier** : `backend/src/routes/agent-prototypes.routes.ts`

| Méthode | Endpoint | Description | Ownership |
|---------|----------|-------------|-----------|
| GET | `/api/agent-prototypes` | Liste prototypes (optional filter robotId) | requireAuth |
| GET | `/api/agent-prototypes/:id` | Prototype spécifique | requireAuth + requireOwnershipAsync |
| POST | `/api/agent-prototypes` | Créer prototype (AUCUNE restriction robotId) | requireAuth |
| PUT | `/api/agent-prototypes/:id` | Modifier prototype | requireAuth + requireOwnershipAsync |
| DELETE | `/api/agent-prototypes/:id` | Supprimer (instances gardent snapshot) | requireAuth + requireOwnershipAsync |

**Exemple requête** :
```typescript
// POST /api/agent-prototypes
{
  "robotId": "AR_001",  // ✅ Metadata, pas de restriction
  "name": "Agent Analyste Senior",
  "role": "Analyse de données complexes",
  "systemPrompt": "Tu es un agent expert...",
  "llmProvider": "OpenAI",
  "llmModel": "gpt-4o",
  "capabilities": ["analysis", "reporting"],
  "tools": [...]
}

// Response
{
  "_id": "...",
  "userId": "...",
  "robotId": "AR_001",
  "name": "Agent Analyste Senior",
  "isPrototype": true,
  "createdAt": "...",
  ...
}
```

**⚠️ CHANGEMENT CRITIQUE** :
- ❌ **ANCIEN** : `validateRobotPermission('agent')` - seulement AR_001 autorisé
- ✅ **NOUVEAU** : User peut créer avec N'IMPORTE QUEL robotId

---

#### **4.3 Agent Instances Routes** *(LOCAL)*
**Fichier** : `backend/src/routes/agent-instances.routes.ts`

| Méthode | Endpoint | Description | Ownership |
|---------|----------|-------------|-----------|
| GET | `/api/agent-instances?workflowId=X` | Liste instances workflow | requireAuth |
| GET | `/api/agent-instances/:id` | Instance spécifique | requireAuth + requireOwnershipAsync |
| POST | `/api/agent-instances` | Créer instance sur workflow | requireAuth |
| PUT | `/api/agent-instances/:id` | Modifier instance (auto isDirty) | requireAuth + requireOwnershipAsync |
| DELETE | `/api/agent-instances/:id` | Supprimer instance (auto isDirty) | requireAuth + requireOwnershipAsync |
| POST | `/api/agent-instances/from-prototype` | Créer depuis prototype (snapshot) | requireAuth |

**Exemple requête** :
```typescript
// POST /api/agent-instances/from-prototype
{
  "workflowId": "...",
  "prototypeId": "...",
  "position": { "x": 100, "y": 200 }
}

// Response - Instance avec SNAPSHOT complet
{
  "_id": "...",
  "workflowId": "...",
  "userId": "...",
  "prototypeId": "...",
  "name": "Agent Analyste Senior",      // Snapshot
  "role": "Analyse de données...",      // Snapshot
  "systemPrompt": "Tu es un agent...",  // Snapshot
  "llmProvider": "OpenAI",              // Snapshot
  "llmModel": "gpt-4o",                 // Snapshot
  "robotId": "AR_001",                  // Snapshot
  "position": { "x": 100, "y": 200 },
  "zIndex": 0,
  "isMinimized": false,
  "createdAt": "..."
}

// PUT /api/agent-instances/:id
{
  "systemPrompt": "Nouvelle instruction..."  // Modifie instance uniquement
}

// Side-effect: Workflow.isDirty = true automatiquement
```

**Fonctionnalités** :
- ✅ Création instance = snapshot complet du prototype
- ✅ Modifications instance ≠ modification prototype
- ✅ Suppression prototype ≠ suppression instances (snapshot indépendant)
- ✅ Auto-marque workflow comme `isDirty` à chaque modification

---

### **5. RÈGLES DE PORTÉE**

| Ressource | Portée | Accessible de | Suppression |
|-----------|--------|---------------|-------------|
| **AgentPrototype** | GLOBAL | Tous workflows user | Instances gardent snapshot |
| **LLMConfig** | GLOBAL | Tous workflows user | Pas de cascade |
| **AgentInstance** | LOCAL | UN workflow spécifique | Cascade si workflow supprimé |
| **WorkflowEdge** | LOCAL | UN workflow spécifique | Cascade si workflow supprimé |

---

### **6. UX SAUVEGARDE (Jalon 4)**

#### **Bouton Sauvegarde** (Top-Left Canvas)
```typescript
// components/WorkflowCanvas.tsx
const SaveButton = () => {
  const { activeWorkflow, isDirty } = useWorkflowStore();
  
  const handleSave = async () => {
    await fetch(`/api/workflows/${activeWorkflow.id}/save`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    // isDirty → false automatiquement
  };
  
  return (
    <button
      disabled={!isDirty}
      onClick={handleSave}
      className={isDirty ? 'text-warning' : 'text-muted'}
    >
      <SaveIcon /> {isDirty && '*'}
    </button>
  );
};
```

#### **Menu Workflows** (Header Dropdown)
```typescript
// components/Header.tsx
<Dropdown>
  <Dropdown.Toggle>
    <WorkflowIcon /> {activeWorkflow.name}
  </Dropdown.Toggle>
  <Dropdown.Menu>
    {workflows.map(w => (
      <Dropdown.Item onClick={() => loadWorkflow(w.id)}>
        {w.name} {w.isDirty && '*'}
      </Dropdown.Item>
    ))}
    <Dropdown.Divider />
    <Dropdown.Item onClick={createNewWorkflow}>
      <PlusIcon /> Nouveau Workflow
    </Dropdown.Item>
  </Dropdown.Menu>
</Dropdown>
```

#### **Modal Unsaved Changes**
```typescript
// components/modals/UnsavedChangesModal.tsx
// Affichée lors de:
// - Changement workflow alors que isDirty
// - window.onbeforeunload avec isDirty
// - Déconnexion avec isDirty

<Modal show={isDirty && attemptingNavigation}>
  <Modal.Body>
    Vous avez des modifications non sauvegardées dans "{workflowName}".
  </Modal.Body>
  <Modal.Footer>
    <Button variant="danger" onClick={discardChanges}>
      Abandonner
    </Button>
    <Button variant="primary" onClick={saveAndContinue}>
      Sauvegarder et continuer
    </Button>
  </Modal.Footer>
</Modal>
```

---

## ✅ STATUT IMPLÉMENTATION

### **Phase 1 - COMPLÉTÉE** (10 Décembre 2025)

- ✅ Suppression gouvernance Robot stricte (`robots.ts`, `robotGovernance.middleware.ts`)
- ✅ Création `Workflow.model.ts` (51 lignes, indexes optimisés)
- ✅ Création `WorkflowEdge.model.ts` (65 lignes)
- ✅ Création `AgentPrototype.model.ts` (84 lignes, renommé depuis Agent)
- ✅ Modification `AgentInstance.model.ts` (ajout workflowId + snapshot)
- ✅ Ajout `requireOwnershipAsync` middleware (async MongoDB queries)
- ✅ Création `workflows.routes.ts` (246 lignes, 8 endpoints)
- ✅ Création `agent-prototypes.routes.ts` (124 lignes, 5 endpoints)
- ✅ Création `agent-instances.routes.ts` (216 lines, 6 endpoints)
- ✅ Intégration dans `server.ts` (montage routes)
- ✅ Validation TypeScript (0 erreurs)
- ✅ Commit Git : `f416e3f` (11 fichiers, 889 insertions, 105 suppressions)

### **Phase 2 - À VENIR** (2-3 jours)

- ⏳ Routes LLM Configs (GET, POST, DELETE avec encryption)
- ⏳ Routes LLM Proxy (POST /stream, POST /generate avec SSE)
- ⏳ Chiffrement/déchiffrement API keys server-side
- ⏳ Utilisation `utils/encryption.ts` existant

### **Phase 3 - Tests** (2-3 jours)

- ⏳ Tests unitaires modèles (Workflow, AgentInstance, middlewares)
- ⏳ Tests fonctionnels routes (workflows CRUD, instances CRUD)
- ⏳ Tests non-régression (Guest mode préservé)

---

## 🔗 RÉFÉRENCES

- **Plan original** : [`PERSISTANCE_SECURISEE_AUTHENTICATION.md`](./PERSISTANCE_SECURISEE_AUTHENTICATION.md)
- **Addendum détaillé** : [`ADDENDUM_CRITIQUE_WORKFLOW_SCHEMA.md`](../backend/documentation/guides/jalons/ADDENDUM_CRITIQUE_WORKFLOW_SCHEMA.md)
- **Rapport complétion** : [`JALON3_PHASE1_COMPLETION.md`](../backend/documentation/guides/jalons/JALON3_PHASE1_COMPLETION.md)
- **Commit Phase 1** : `f416e3f`

---

## 📝 IMPACT DURÉE

| Jalon | Durée Initiale | Durée Révisée | Delta |
|-------|----------------|---------------|-------|
| Jalon 3 | 7-9 jours | 12-14 jours | +5 jours |
| Jalon 4 | 12-16 jours | 14-18 jours | +2 jours |
| **TOTAL** | 30 jours | 37 jours | **+7 jours** |

**Justification** :
- Refactoring architecture (rollback + nouveaux modèles)
- 3 fichiers routes complets (586 lignes au total)
- Documentation addendum critique (639 lignes)
- Tests validation architecture corrigée

---

**Maintenu par** : ARC-1 (Agent Architecte)  
**Dernière mise à jour** : 10 Décembre 2025  
**Statut** : ✅ CORRECTIONS VALIDÉES & IMPLÉMENTÉES (Phase 1)
