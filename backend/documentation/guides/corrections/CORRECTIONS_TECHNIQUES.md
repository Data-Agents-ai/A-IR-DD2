# 🔧 CORRECTIONS & NOTES TECHNIQUES

## ✅ Corrections TypeScript (Build Errors)

### Commit: `ca63da5` - fix(backend): Corrections TypeScript pour build

#### Problème 1: Agent.model.ts - Conflit de nom `model`
**Erreur**:
```
error TS2430: Interface 'IAgent' incorrectly extends interface 'Document'
Types of property 'model' are incompatible
```

**Cause**: `model` est une méthode de `Document` de Mongoose. Utiliser `model` comme propriété crée un conflit.

**Solution**: Renommer `model` → `llmModel` dans le schéma backend.

```typescript
// ❌ AVANT
export interface IAgent extends Document {
  model: string; // Conflit avec Document.model()
}

// ✅ APRÈS
export interface IAgent extends Document {
  llmModel: string; // Pas de conflit
}
```

#### Problème 2: jwt.ts - Type inference strict
**Erreur**:
```
error TS2769: No overload matches this call
Object literal may only specify known properties, and 'expiresIn' does not exist
```

**Cause**: TypeScript strict mode nécessite typage explicite pour `jwt.sign()` options.

**Solution**: Importer et typer `SignOptions`.

```typescript
// ❌ AVANT
import jwt from 'jsonwebtoken';
return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

// ✅ APRÈS
import jwt, { SignOptions } from 'jsonwebtoken';
return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION } as SignOptions);
```

---

## 📋 Mapping Frontend ↔ Backend (Jalon 4)

### Différence de Schema: `model` vs `llmModel`

**Frontend** (`types.ts` - V1):
```typescript
export interface Agent {
  model: string; // Nom actuel
}
```

**Backend** (`Agent.model.ts` - V2):
```typescript
export interface IAgent {
  llmModel: string; // Renommé pour compatibilité Mongoose
}
```

### Action Requise: Jalon 4 (Frontend Hybride)

Lors de l'implémentation du mode Authenticated, créer un **mapper** dans le frontend:

```typescript
// Frontend → Backend (POST /api/agents)
const toBackendAgent = (agent: Agent): BackendAgent => ({
  ...agent,
  llmModel: agent.model,
  model: undefined // Supprimer ancien champ
});

// Backend → Frontend (GET /api/agents)
const fromBackendAgent = (backendAgent: BackendAgent): Agent => ({
  ...backendAgent,
  model: backendAgent.llmModel,
  llmModel: undefined // Supprimer champ backend
});
```

**Alternative**: Renommer `model` → `llmModel` dans **tout le frontend** (breaking change en V1, mais cohérence V2).

---

## ✅ Validation Build

```bash
cd backend
npm run build
```

**Résultat**: ✅ 0 erreurs TypeScript

**Fichiers compilés**: `backend/dist/`

---

## 📌 Notes Importantes

1. **Non-régression Guest Mode**: ✅ Frontend V1 continue d'utiliser `model` (aucun impact)
2. **Migration Data**: Migration wizard (Jalon 5) devra mapper `model` → `llmModel`
3. **Documentation API**: Swagger (Jalon 8) devra documenter `llmModel` comme nom officiel

---

**Date**: 2 décembre 2025  
**Branch**: V2-Backend-Persistance  
**Commits**: 
- Jalon 1: `90735fd`
- Jalon 2: `717b3c2`
- Fix TS: `ca63da5`
