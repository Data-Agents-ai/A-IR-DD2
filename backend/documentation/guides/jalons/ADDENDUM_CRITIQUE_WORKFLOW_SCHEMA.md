# 🔴 ADDENDUM CRITIQUE - PERSISTANCE_SECURISEE_AUTHENTICATION
## Clarifications Architecture & Règles Métier

**Date** : 2025-12-10  
**Statut** : 🔴 CRITIQUE - À valider avant Jalon 3  
**Impact** : Modifications majeures schéma BDD + Gouvernance + UX

---

## 🎯 CLARIFICATIONS ARCHITECTE

### **1. GOUVERNANCE : CORRECTION MAJEURE**

#### ❌ **Incompréhension Actuelle (À Corriger)**
```typescript
// IMPLÉMENTÉ (INCORRECT) : Gouvernance stricte Robot-based
POST /api/agents { creatorId: 'AR_001', ... } // ✅ Autorisé (Robot Archi)
POST /api/agents { creatorId: 'COM_001', ... } // ❌ 403 Forbidden

// Middleware actuel:
export const validateRobotPermission = (resourceType: string) => {
  // Bloque si creatorId n'a pas les droits
  if (!canCreateResource(creatorId, resourceType)) {
    return res.status(403).json({ error: 'Permission refusée' });
  }
};
```

**Problème** : Trop restrictif. L'utilisateur authentifié ne peut pas créer librement.

#### ✅ **Gouvernance Attendue (Minimale)**
```typescript
// CORRECTION : Gouvernance User-based (minimale)
// L'utilisateur authentifié a TOUS les droits CRUD sur SES ressources

POST /api/agents { name: 'Mon Agent', robotId: 'AR_001', ... }
// ✅ Autorisé : User authentifié peut créer agent avec N'IMPORTE QUEL robotId
// robotId = Métadonnée visuelle (icône, couleur), pas une contrainte de sécurité

GET /api/agents
// ✅ Retourne TOUS les agents de l'utilisateur (ownerId: req.user.id)

PUT /api/agents/:id
// ✅ Autorisé SI agent.ownerId === req.user.id
// ❌ 403 SI agent appartient à un autre user

DELETE /api/agents/:id
// ✅ Autorisé SI agent.ownerId === req.user.id
```

**Règle d'Or** : La gouvernance vérifie **ownership** (ownerId), pas permissions Robot.

#### 🔧 **Actions Requises**
- [ ] **Supprimer** middleware `validateRobotPermission` (trop strict)
- [ ] **Supprimer** constantes `ROBOT_RESOURCE_PERMISSIONS` (inutiles)
- [ ] **Garder** enum `creatorId` dans schema (validation format uniquement)
- [ ] **Implémenter** middleware `requireOwnership` (vérifie `ownerId === req.user.id`)

---

### **2. SCHÉMA BDD : RELATIONS WORKFLOW MANQUANTES**

#### ❌ **Schéma Actuel (Incomplet)**
```typescript
// PROBLÈME : AgentInstance n'est pas lié à un Workflow
interface IAgentInstance {
  prototypeId: ObjectId;  // FK → Agent
  ownerId: ObjectId;      // FK → User
  position: { x, y };
  // ❌ MANQUE : workflowId
}

// PROBLÈME : Pas de modèle Workflow
```

#### ✅ **Schéma Attendu (Relations Complètes)**

##### **Hiérarchie Entités**
```
User (utilisateur authentifié)
  │
  ├── owns (1:N, global) ──> AgentPrototype (templates)
  │                           ↑ isPrototype: true
  │                           ↑ Accessible de TOUS les workflows
  │
  ├── owns (1:N, global) ──> LLMConfig (paramètres LLM)
  │                           ↑ Accessible de TOUS les workflows
  │
  └── owns (1:N) ──────────> Workflow (canvas)
                               │
                               ├── contains (1:N) ──> AgentInstance
                               │                       ↑ Lié à UN workflow
                               │                       ↑ Référence AgentPrototype (optionnel)
                               │
                               └── contains (1:N) ──> WorkflowEdge (connexions)
```

##### **Nouveau Modèle : Workflow**
```typescript
// backend/src/models/Workflow.model.ts
export interface IWorkflow extends Document {
  userId: mongoose.Types.ObjectId;  // FK → User
  name: string;                     // "Workflow Principal", "Test Workflow"
  description?: string;
  isActive: boolean;                // Workflow actuellement ouvert
  lastSavedAt?: Date;              // Dernière sauvegarde
  isDirty: boolean;                // Modifications non sauvegardées
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: false
  },
  lastSavedAt: Date,
  isDirty: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index : Un seul workflow actif par user
WorkflowSchema.index({ userId: 1, isActive: 1 });
WorkflowSchema.index({ userId: 1, updatedAt: -1 });
```

##### **Modèle AgentPrototype (Correction)**
```typescript
// backend/src/models/AgentPrototype.model.ts
export interface IAgentPrototype extends Document {
  userId: mongoose.Types.ObjectId;  // FK → User (GLOBAL)
  name: string;
  role: string;
  systemPrompt: string;
  llmProvider: string;
  llmModel: string;
  capabilities: string[];
  historyConfig?: object;
  tools?: object[];
  outputConfig?: object;
  robotId: string;                  // 'AR_001', 'BOS_001', etc. (métadonnée)
  isPrototype: true;                // Distingue des AgentInstance
  createdAt: Date;
  updatedAt: Date;
}

const AgentPrototypeSchema = new Schema<IAgentPrototype>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  role: { type: String, required: true, trim: true, maxlength: 200 },
  systemPrompt: { type: String, required: true, minlength: 1 },
  llmProvider: { type: String, required: true },
  llmModel: { type: String, required: true },
  capabilities: [{ type: String }],
  historyConfig: Schema.Types.Mixed,
  tools: [Schema.Types.Mixed],
  outputConfig: Schema.Types.Mixed,
  robotId: {
    type: String,
    required: true,
    enum: ['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001'],
    index: true
  },
  isPrototype: {
    type: Boolean,
    default: true,
    immutable: true
  }
}, {
  timestamps: true
});

// Index pour queries
AgentPrototypeSchema.index({ userId: 1, createdAt: -1 });
AgentPrototypeSchema.index({ userId: 1, robotId: 1 });
```

##### **Modèle AgentInstance (Correction)**
```typescript
// backend/src/models/AgentInstance.model.ts
export interface IAgentInstance extends Document {
  workflowId: mongoose.Types.ObjectId;  // ✅ AJOUTÉ : FK → Workflow
  userId: mongoose.Types.ObjectId;      // Dénormalisé (queries rapides)
  prototypeId?: mongoose.Types.ObjectId; // FK → AgentPrototype (optionnel)
  
  // Snapshot config (copie indépendante du prototype)
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
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const AgentInstanceSchema = new Schema<IAgentInstance>({
  workflowId: {
    type: Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
    index: true  // ✅ CRITIQUE : Queries par workflow
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  prototypeId: {
    type: Schema.Types.ObjectId,
    ref: 'AgentPrototype',
    index: true
  },
  
  // Snapshot config
  name: { type: String, required: true },
  role: { type: String, required: true },
  systemPrompt: { type: String, required: true },
  llmProvider: { type: String, required: true },
  llmModel: { type: String, required: true },
  capabilities: [{ type: String }],
  historyConfig: Schema.Types.Mixed,
  tools: [Schema.Types.Mixed],
  outputConfig: Schema.Types.Mixed,
  robotId: {
    type: String,
    required: true,
    enum: ['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001']
  },
  
  // Canvas
  position: {
    type: {
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    },
    required: true
  },
  isMinimized: { type: Boolean, default: false },
  isMaximized: { type: Boolean, default: false },
  zIndex: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Index composés pour queries optimisées
AgentInstanceSchema.index({ workflowId: 1, createdAt: -1 });
AgentInstanceSchema.index({ userId: 1, workflowId: 1 });
AgentInstanceSchema.index({ prototypeId: 1 });
```

##### **Modèle WorkflowEdge (Nouveau)**
```typescript
// backend/src/models/WorkflowEdge.model.ts
export interface IWorkflowEdge extends Document {
  workflowId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceInstanceId: mongoose.Types.ObjectId;  // FK → AgentInstance
  targetInstanceId: mongoose.Types.ObjectId;  // FK → AgentInstance
  sourceHandle?: string;                      // React Flow handle
  targetHandle?: string;
  edgeType: 'default' | 'step' | 'smoothstep' | 'straight';
  animated: boolean;
  label?: string;
  createdAt: Date;
}

const WorkflowEdgeSchema = new Schema<IWorkflowEdge>({
  workflowId: {
    type: Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sourceInstanceId: {
    type: Schema.Types.ObjectId,
    ref: 'AgentInstance',
    required: true
  },
  targetInstanceId: {
    type: Schema.Types.ObjectId,
    ref: 'AgentInstance',
    required: true
  },
  sourceHandle: String,
  targetHandle: String,
  edgeType: {
    type: String,
    enum: ['default', 'step', 'smoothstep', 'straight'],
    default: 'default'
  },
  animated: {
    type: Boolean,
    default: false
  },
  label: String
}, {
  timestamps: true
});

// Index pour queries
WorkflowEdgeSchema.index({ workflowId: 1 });
WorkflowEdgeSchema.index({ sourceInstanceId: 1 });
WorkflowEdgeSchema.index({ targetInstanceId: 1 });
```

#### 🔧 **Actions Requises**
- [ ] **Créer** modèle `Workflow.model.ts`
- [ ] **Créer** modèle `WorkflowEdge.model.ts`
- [ ] **Renommer** `Agent.model.ts` → `AgentPrototype.model.ts`
- [ ] **Ajouter** champ `workflowId` dans `AgentInstance.model.ts`
- [ ] **Ajouter** champ `isPrototype: true` dans `AgentPrototype`
- [ ] **Mettre à jour** index MongoDB pour nouvelles relations

---

### **3. RÈGLES MÉTIER : PORTÉE DES RESSOURCES**

#### ✅ **Ressources GLOBALES (Tous Workflows)**

| Ressource | Portée | Accessibilité | Exemple Use Case |
|-----------|--------|---------------|------------------|
| **AgentPrototype** | User | Tous workflows | Templates réutilisables (ex: "Agent Analyste GPT-4") |
| **LLMConfig** | User | Tous workflows | Clés API OpenAI, Anthropic, etc. |

**Règle** : L'utilisateur peut accéder à ses templates et configs **depuis n'importe quel workflow**.

#### ✅ **Ressources LOCALES (Workflow Spécifique)**

| Ressource | Portée | Accessibilité | Cascade Delete |
|-----------|--------|---------------|----------------|
| **AgentInstance** | Workflow | Workflow actif uniquement | ✅ OUI (si workflow supprimé) |
| **WorkflowEdge** | Workflow | Workflow actif uniquement | ✅ OUI (si workflow supprimé) |

**Règle** : Les instances d'agents et connexions sont **liées à UN workflow**.

#### 🔧 **Actions Requises**
- [ ] Routes `/api/agent-prototypes` (GLOBAL)
- [ ] Routes `/api/agent-instances?workflowId=X` (LOCAL)
- [ ] Routes `/api/llm-configs` (GLOBAL)
- [ ] Routes `/api/workflows` (gestion workflows)
- [ ] Middleware `requireWorkflowOwnership` (vérifie workflow.userId === req.user.id)

---

### **4. UX SAUVEGARDE : FONCTIONNALITÉ MANQUANTE**

#### ❌ **Problème Identifié**
Le plan actuel **ne prévoit pas** :
- Bouton "Sauvegarde" dans WorkflowCanvas
- Détection état `isDirty` (modifications non sauvegardées)
- Modal confirmation si changement workflow non sauvegardé

#### ✅ **UX Attendue**

##### **4.1 Bouton Sauvegarde (WorkflowCanvas)**
```tsx
// src/components/WorkflowCanvas.tsx
<div className="workflow-header">
  {/* Haut gauche */}
  <button 
    onClick={handleSaveWorkflow}
    disabled={!isDirty || isSaving}
    className={isDirty ? 'save-btn-dirty' : 'save-btn'}
  >
    {isSaving ? (
      <><Spinner size="sm" /> Sauvegarde...</>
    ) : (
      <><SaveIcon /> {isDirty ? 'Enregistrer *' : 'Enregistré'}</>
    )}
  </button>
  
  <span className="workflow-name">{currentWorkflow.name}</span>
</div>
```

**Comportement** :
- **Activé** (bleu) si `isDirty === true` (modifications non sauvegardées)
- **Grisé** si `isDirty === false` (tout est sauvegardé)
- Affiche spinner pendant sauvegarde
- Badge `*` si modifications en attente

##### **4.2 Détection État Dirty**
```typescript
// src/stores/useWorkflowStore.ts
export const useWorkflowStore = create<WorkflowState>((set) => ({
  currentWorkflow: null,
  isDirty: false,
  
  // Marquage dirty sur modifications
  addAgentInstance: (agent) => set((state) => ({
    agents: [...state.agents, agent],
    isDirty: true  // ✅ Marque comme modifié
  })),
  
  updateAgentPosition: (id, position) => set((state) => ({
    agents: state.agents.map(a => a.id === id ? { ...a, position } : a),
    isDirty: true  // ✅ Marque comme modifié
  })),
  
  // Reset dirty après sauvegarde réussie
  saveWorkflowSuccess: () => set({ isDirty: false })
}));
```

##### **4.3 Modal Confirmation (Changement Workflow)**
```tsx
// src/components/modals/UnsavedChangesModal.tsx
export function UnsavedChangesModal({ onSave, onDiscard, onCancel }) {
  return (
    <Modal isOpen>
      <ModalHeader>Modifications non enregistrées</ModalHeader>
      <ModalBody>
        <p>Vous avez des modifications non enregistrées dans ce workflow.</p>
        <p>Que souhaitez-vous faire ?</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onSave}>
          Enregistrer et continuer
        </Button>
        <Button variant="danger" onClick={onDiscard}>
          Ignorer les modifications
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </ModalFooter>
    </Modal>
  );
}
```

**Déclenchement** :
- User clique "Charger un autre workflow" → Modal si `isDirty === true`
- User clique "Nouveau workflow" → Modal si `isDirty === true`
- User ferme onglet navigateur → `window.onbeforeunload` si `isDirty === true`

##### **4.4 Menu Gestion Workflows**
```tsx
// src/components/Header.tsx (Ajout menu)
<Dropdown>
  <DropdownToggle>
    <FolderIcon /> {currentWorkflow.name} <ChevronDownIcon />
  </DropdownToggle>
  <DropdownMenu>
    <DropdownItem onClick={handleSaveWorkflow} disabled={!isDirty}>
      <SaveIcon /> Enregistrer
    </DropdownItem>
    <DropdownDivider />
    <DropdownItem onClick={handleNewWorkflow}>
      <PlusIcon /> Nouveau workflow
    </DropdownItem>
    <DropdownItem onClick={handleLoadWorkflow}>
      <FolderOpenIcon /> Charger un workflow...
    </DropdownItem>
    <DropdownDivider />
    <DropdownItem onClick={handleManageWorkflows}>
      <ListIcon /> Gérer mes workflows
    </DropdownItem>
  </DropdownMenu>
</Dropdown>
```

**Position** : Haut gauche de l'écran, à côté du logo/nom de l'app.

##### **4.5 Modal Liste Workflows**
```tsx
// src/components/modals/WorkflowListModal.tsx
export function WorkflowListModal({ workflows, onLoad, onDelete, onClose }) {
  return (
    <Modal isOpen size="lg">
      <ModalHeader>Mes Workflows</ModalHeader>
      <ModalBody>
        <Table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Dernière modification</th>
              <th>Agents</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map(workflow => (
              <tr key={workflow.id}>
                <td>
                  {workflow.name}
                  {workflow.isActive && <Badge color="success">Actif</Badge>}
                </td>
                <td>{formatDate(workflow.updatedAt)}</td>
                <td>{workflow.agentCount} agents</td>
                <td>
                  <Button size="sm" onClick={() => onLoad(workflow.id)}>
                    Charger
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => onDelete(workflow.id)}>
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Fermer</Button>
      </ModalFooter>
    </Modal>
  );
}
```

#### 🔧 **Actions Requises**
- [ ] **Ajouter** bouton "Sauvegarde" dans `WorkflowCanvas.tsx` (haut gauche)
- [ ] **Implémenter** état `isDirty` dans `useWorkflowStore`
- [ ] **Créer** `UnsavedChangesModal.tsx`
- [ ] **Créer** `WorkflowListModal.tsx`
- [ ] **Ajouter** menu dropdown workflows dans `Header.tsx`
- [ ] **Implémenter** `window.onbeforeunload` pour prévenir perte données
- [ ] **Routes backend** :
  - `POST /api/workflows` (créer)
  - `GET /api/workflows` (lister)
  - `GET /api/workflows/:id` (charger)
  - `PUT /api/workflows/:id` (sauvegarder)
  - `DELETE /api/workflows/:id` (supprimer avec cascade)

---

## 📊 IMPACT SUR LE PLAN

### **Modifications Requises**

| Section Plan | Modification | Impact |
|--------------|--------------|--------|
| **Jalon 1.4** | Renommer `Agent` → `AgentPrototype`, ajouter `Workflow`, `WorkflowEdge` | 🔴 CRITIQUE |
| **Jalon 3.1** | Supprimer gouvernance Robot stricte, ajouter `requireOwnership` | 🟠 HAUTE |
| **Jalon 3.3** | Ajouter routes `/api/workflows`, `/api/agent-prototypes`, `/api/agent-instances` | 🟠 HAUTE |
| **Jalon 4.2** | Ajouter UI sauvegarde workflow (bouton, modal, menu) | 🟡 MOYENNE |
| **Jalon 4.3** | Implémenter état `isDirty` dans stores | 🟡 MOYENNE |

### **Nouveau Estimé Durée**

| Jalon | Durée Initiale | Durée Corrigée | Delta |
|-------|----------------|----------------|-------|
| Jalon 1 | 5-7 jours | 7-9 jours | +2 jours (nouveaux modèles) |
| Jalon 3 | 7-9 jours | 10-12 jours | +3 jours (routes workflows) |
| Jalon 4 | 10-14 jours | 12-16 jours | +2 jours (UI sauvegarde) |
| **TOTAL** | **~30 jours** | **~37 jours** | **+7 jours** |

---

## ✅ VALIDATION REQUISE

### **Questions pour Chef de Projet**

1. **Gouvernance** : Confirmez-vous que l'utilisateur authentifié doit avoir **tous les droits CRUD** sur ses ressources (pas de restriction Robot) ?

2. **Schéma Workflow** : La hiérarchie `User → Workflow → AgentInstance` correspond-elle à votre vision ?

3. **Portée Ressources** : 
   - AgentPrototypes GLOBAUX (tous workflows) ✅ ?
   - AgentInstances LOCAUX (un workflow) ✅ ?
   - LLMConfigs GLOBAUX (tous workflows) ✅ ?

4. **UX Sauvegarde** : 
   - Bouton haut gauche WorkflowCanvas ✅ ?
   - Modal confirmation si changement workflow ✅ ?
   - Menu dropdown "Charger workflow" dans Header ✅ ?

5. **Cascade Delete** : 
   - Supprimer Workflow → Supprimer AgentInstances + Edges ✅ ?
   - Supprimer AgentPrototype → **Garder** AgentInstances (snapshot indépendant) ✅ ?

6. **Durée Projet** : Acceptez-vous le delta +7 jours (37 jours au lieu de 30) ?

---

## 🚨 ACTIONS IMMÉDIATES

### **Avant de Continuer Jalon 3**

- [ ] **VALIDATION** : Chef de Projet approuve ce document
- [ ] **MISE À JOUR** : Corriger `PERSISTANCE_SECURISEE_AUTHENTICATION.md`
- [ ] **ROLLBACK** : Supprimer code gouvernance Robot stricte (commits récents)
- [ ] **CRÉATION** : Nouveaux modèles `Workflow`, `WorkflowEdge`
- [ ] **REFACTOR** : Renommer `Agent` → `AgentPrototype`
- [ ] **TESTS** : Mettre à jour tests pour nouvelles relations

---

**⚠️ BLOQUANT** : Ne pas commencer Jalon 3 sans validation de ce document.

**Maintenu par** : ARC-1 (Agent Architecte)  
**Dernière mise à jour** : 2025-12-10  
**Statut** : 🔴 EN ATTENTE VALIDATION CHEF DE PROJET
