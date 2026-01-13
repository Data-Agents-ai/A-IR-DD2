# Structure des Tests - A-IR-DD2

## 📁 Organisation

```
tests/
├── unitaires/           # Tests unitaires (fonctions isolées)
├── non-regression/      # Tests de non-régression (TNR)
└── fonctionnels/        # Tests fonctionnels (flux complets)
```

## 📋 Convention de Nommage

Chaque plan d'implémentation a son propre sous-dossier préfixé par `tests_` :

```
tests/
├── unitaires/
│   ├── tests_PERSISTANCE_SECURISEE_AUTHENTICATION/
│   ├── tests_WORKFLOW_EDITOR_N8N/
│   └── tests_FUTURE_PLAN/
├── non-regression/
│   └── tests_PERSISTANCE_SECURISEE_AUTHENTICATION/
└── fonctionnels/
    └── tests_PERSISTANCE_SECURISEE_AUTHENTICATION/
```

## 🧪 Catégories de Tests

### Tests Unitaires (`tests/unitaires/`)
**Objectif** : Valider le comportement de fonctions/classes isolées  
**Scope** : Une fonction, une méthode, un module  
**Exemples** :
```typescript
// backend: utils/jwt.ts
describe('generateAccessToken', () => {
  it('should generate valid JWT with 24h expiration', () => { ... });
});

// backend: utils/encryption.ts
describe('encrypt/decrypt', () => {
  it('should encrypt and decrypt correctly', () => { ... });
});

// frontend: stores/useDesignStore.ts
describe('addAgent', () => {
  it('should add agent to store', () => { ... });
});
```

### Tests de Non-Régression (`tests/non-regression/`)
**Objectif** : Garantir qu'aucune fonctionnalité existante n'est cassée  
**Scope** : Workflows critiques de l'application  
**Exemples** :
```typescript
// Mode Guest préservé
describe('Guest Mode TNR', () => {
  it('should allow creating agents without authentication', () => { ... });
  it('should store LLM configs in localStorage', () => { ... });
});

// Fonctionnalités V1
describe('Python Tools TNR', () => {
  it('should execute whitelisted Python tools', () => { ... });
});
```

### Tests Fonctionnels (`tests/fonctionnels/`)
**Objectif** : Valider des flux utilisateur complets (end-to-end)  
**Scope** : Plusieurs composants/services intégrés  
**Exemples** :
```typescript
// Flow d'authentification complet
describe('Authentication Flow', () => {
  it('should register → login → access protected route', async () => { ... });
});

// Flow de création agent authentifié
describe('Agent Creation (Authenticated)', () => {
  it('should create agent → persist to DB → retrieve from API', async () => { ... });
});
```

## 🚀 Exécution des Tests

### Backend (Jest)
```bash
cd backend
npm test                                    # Tous les tests
npm test -- --testPathPattern=unitaires     # Tests unitaires
npm test -- --testPathPattern=fonctionnels  # Tests fonctionnels
```

### Frontend (Vitest)
```bash
npm test                                           # Tous les tests
npm test -- --testPathPattern=non-regression       # TNR
npm test -- --testPathPattern=unitaires            # Unitaires
```

## 📊 Couverture de Code

**Objectif Minimum** : 80% de couverture pour code critique

```bash
# Backend
cd backend
npm run test:coverage

# Frontend
npm run test:coverage
```

## 🔧 Configuration

### Jest (Backend)
```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../tests'],
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts']
};
```

### Vitest (Frontend)
```javascript
// vite.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.tsx', 'tests/**/*.test.ts']
  }
});
```

## 📝 Standards de Qualité

1. **Nomenclature** : `*.test.ts` ou `*.test.tsx`
2. **Structure AAA** : Arrange → Act → Assert
3. **Isolation** : Tests indépendants (pas de dépendances inter-tests)
4. **Mocks** : Mocker les dépendances externes (DB, APIs)
5. **Clarté** : Noms descriptifs (`should create user when valid data provided`)

## 🎯 Checklist Tests Nouveaux Plans

Avant de valider un nouveau plan d'implémentation :

- [ ] Créer dossiers `tests_<PLAN_NAME>` dans chaque catégorie
- [ ] Tests unitaires pour nouvelles fonctions/classes
- [ ] Tests fonctionnels pour flux utilisateur principaux
- [ ] TNR si modifications de code existant
- [ ] Couverture ≥ 80% pour code critique
- [ ] Documentation des tests (README dans sous-dossier)

---

**Maintenu par** : ARC-1 (Agent Architecte)  
**Dernière mise à jour** : 2025-12-10
