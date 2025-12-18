# Étape 2 : Architecture de Persistance des Données Utilisateur - Analyse & Implémentation

## 📋 État Actuel du Système

### ✅ Protection des Données Existantes

Le système backend **implémente déjà** une architecture de persistance sécurisée avec les composants suivants :

#### 1. **Middleware d'Authentification (`auth.middleware.ts`)**
```typescript
// ✅ Requis sur TOUTES les routes manipulant des données utilisateur
router.post('/', requireAuth, controllerAction);
```

- `requireAuth` : Vérifie la validité du JWT (fourni par Passport)
- `requireOwnershipAsync` : Vérifie que l'utilisateur est propriétaire de la ressource
- `requireRole` : Contrôle les rôles (admin, user, viewer)

#### 2. **Vérification de Propriété (`requireOwnershipAsync`)**

**Implémenter dans chaque route d'accès à des ressources sensibles** :

```typescript
// ❌ Avant (vulnérable si pas de vérification)
router.delete('/:workflowId', requireAuth, async (req, res) => {
  const workflow = await Workflow.findByIdAndDelete(req.params.workflowId);
  // ⚠️ N'importe quel utilisateur authentifié peut supprimer n'importe quel workflow!
});

// ✅ Après (sécurisé)
router.delete(
  '/:workflowId',
  requireAuth,
  requireOwnershipAsync(async (req) => {
    const workflow = await Workflow.findById(req.params.workflowId);
    return workflow?.userId?.toString();
  }),
  async (req, res) => {
    // À ce stade, on sait que req.user est propriétaire du workflow
    await Workflow.findByIdAndDelete(req.params.workflowId);
  }
);
```

#### 3. **Modèles MongoDB avec `userId`**

Tous les modèles critiques incluent un champ `userId` avec index :

```typescript
// Workflow.model.ts
const WorkflowSchema = new Schema<IWorkflow>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true  // ✅ Important : accélère les requêtes de filtrage
  },
  // ...
});

// Indexes pour optimisation
WorkflowSchema.index({ userId: 1, isActive: 1 });
WorkflowSchema.index({ userId: 1, updatedAt: -1 });
```

#### 4. **Assignation du Propriétaire à la Création**

Dans chaque route CREATE, le contrôleur **doit** assigner `userId` :

```typescript
// ✅ Correct
const newWorkflow = new Workflow({
  ...req.body,
  userId: user.id,  // Assignation forcée du propriétaire
});

// ❌ DANGEREUX : Permettrait à l'utilisateur de fournir userId arbitraire
const newWorkflow = new Workflow(req.body);
```

---

## 📦 Couches de Sécurité en Place

### Couche 1 : Authentification
```
Request → Passport JWT Strategy → req.user assigné → Middleware continues
```
- Si pas de token valide : **401 Unauthorized**
- Si token expiré : **401 Unauthorized**

### Couche 2 : Vérification de Propriété
```
User Action (GET/POST/PUT/DELETE) → requireOwnershipAsync → Vérifie userId
```
- Si utilisateur ≠ propriétaire ET ≠ admin : **403 Forbidden**
- Si ressource n'existe pas : **404 Not Found**

### Couche 3 : Filtrage au Niveau Application
```typescript
// Les requêtes GET listent automatiquement les ressources filtrées
const workflows = await Workflow.find({ userId: user.id });
```
- Impossible pour un utilisateur de voir les ressources d'autres utilisateurs

---

## 🔧 Middleware Ownership Réutilisable (`ownership.middleware.ts`)

Un nouveau middleware générique a été créé pour les futures migrations vers `creator_id` et l'architecture V2 des robots :

### Utilisation
```typescript
import { requireOwnership } from '../middleware/ownership.middleware';

// Pour vérifier que l'utilisateur est propriétaire d'une ressource
router.delete(
  '/:workflowId',
  requireAuth,
  requireOwnership(Workflow, 'workflowId', 'userId'),  // userIdField optionnel
  workflowController.deleteWorkflow
);

// Pour une future migration vers creator_id
router.put(
  '/:agentId',
  requireAuth,
  requireOwnership(Agent, 'agentId', 'creator_id'),
  agentController.updateAgent
);
```

### Avantages
- ✅ Réutilisable sur tous les modèles
- ✅ Gère les erreurs MongoDB (format ID invalide, etc.)
- ✅ Codes d'erreur structurés pour le frontend
- ✅ Prêt pour la migration V2 avec `creator_id`

---

## ✅ Checklist : Routes Couvertes

### Workflows (`workflows.routes.ts`)
- ✅ GET /api/workflows - Filtre par `userId`
- ✅ POST /api/workflows - Assigne `userId` à la création
- ✅ GET /api/workflows/:id - `requireOwnershipAsync`
- ✅ PUT /api/workflows/:id - `requireOwnershipAsync`
- ✅ DELETE /api/workflows/:id - `requireOwnershipAsync`
- ✅ PUT /api/workflows/:id/activate - `requireOwnershipAsync`

### Agent Prototypes (`agent-prototypes.routes.ts`)
- ✅ GET /api/agent-prototypes - Filtre par `userId`
- ✅ POST /api/agent-prototypes - Assigne `userId`
- ✅ GET /api/agent-prototypes/:id - `requireOwnershipAsync`
- ✅ PUT /api/agent-prototypes/:id - `requireOwnershipAsync`
- ✅ DELETE /api/agent-prototypes/:id - `requireOwnershipAsync`

### Agent Instances (`agent-instances.routes.ts`)
- ✅ GET /api/workflows/:workflowId/agents - Vérifie proprieté du workflow
- ✅ POST /api/workflows/:workflowId/agents - Vérifie proprieté du workflow
- ✅ GET /api/workflows/:workflowId/agents/:agentId - Vérifie proprieté
- ✅ PUT /api/workflows/:workflowId/agents/:agentId - Vérifie proprieté
- ✅ DELETE /api/workflows/:workflowId/agents/:agentId - Vérifie proprieté

### LLM Configs (`llm-configs.routes.ts`)
- ✅ GET /api/llm-configs - Filtre par `userId`
- ✅ POST /api/llm-configs - Assigne `userId`
- ✅ GET /api/llm-configs/:id - `requireOwnershipAsync`
- ✅ PUT /api/llm-configs/:id - `requireOwnershipAsync`
- ✅ DELETE /api/llm-configs/:id - `requireOwnershipAsync`

---

## 🚀 Améliorations Proposées (V2 Migration)

1. **Migration vers `creator_id`** : Pour l'architecture des robots (Archi, Bos, Com, Phil, Tim)
   - Ajouter `creator_id` (référence à un robot ou utilisateur)
   - Migration graduelle des modèles

2. **Audit Trail** : Logger les modifications pour la conformité
   - Qui a créé la ressource?
   - Qui l'a modifiée et quand?

3. **Soft Deletes** : Au lieu de supprimer, marquer comme `deletedAt`
   - Permet la récupération accidentelle

---

## 📚 Ressources

- **Auth Middleware** : `backend/src/middleware/auth.middleware.ts`
- **Ownership Middleware** : `backend/src/middleware/ownership.middleware.ts` (nouveau)
- **Modèles** : `backend/src/models/*.model.ts`
- **Routes** : `backend/src/routes/*.routes.ts`
