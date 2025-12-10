# Tests - Plan PERSISTANCE_SECURISEE_AUTHENTICATION

## 📋 Vue d'Ensemble

Ce dossier contient les tests pour le plan d'implémentation **PERSISTANCE_SECURISEE_AUTHENTICATION** (Jalons 1-2).

---

## 🧪 Catégories de Tests

### Tests Unitaires (`unitaires/`)
**Objectif** : Valider le comportement de fonctions/classes isolées  
**Scope** : Une fonction, une méthode, un module  
**Framework** : Jest (backend)

**À implémenter** :
- [ ] `utils/jwt.test.ts` : Génération/vérification JWT tokens
- [ ] `utils/encryption.test.ts` : Chiffrement/déchiffrement AES-256-GCM
- [ ] `models/User.test.ts` : Bcrypt hooks, comparePassword()
- [ ] `models/Agent.test.ts` : Validation enum creatorId
- [ ] `models/LLMConfig.test.ts` : Méthodes encrypt/decrypt API keys
- [ ] `middleware/validation.test.ts` : Validation Zod schemas
- [ ] `middleware/robotGovernance.test.ts` : Validation permissions RobotId

---

### Tests Fonctionnels (`fonctionnels/`)
**Objectif** : Valider des flux utilisateur complets (end-to-end)  
**Scope** : Plusieurs composants/services intégrés  
**Framework** : Jest + Supertest (backend)

**À implémenter** :
- [ ] `auth-flow.test.ts` : Register → Login → Protected route
- [ ] `token-refresh-flow.test.ts` : Access token expiré → Refresh → Nouveau access
- [ ] `llm-config-encryption-flow.test.ts` : Créer config → Déchiffrer API key → Vérifier isolation user
- [ ] `robot-governance-flow.test.ts` : Créer agent avec AR_001 (✅) vs COM_001 (❌)

---

### Tests de Non-Régression (`non-regression/`)
**Objectif** : Garantir qu'aucune fonctionnalité existante n'est cassée  
**Scope** : Workflows critiques de l'application  
**Framework** : Vitest (frontend)

**À implémenter** :
- [ ] `guest-mode.test.tsx` : Mode Guest préservé (localStorage, agents volatiles)
- [ ] `python-tools.test.tsx` : Exécution Python tools sans authentification
- [ ] `llm-services.test.tsx` : Services LLM fonctionnels sans backend

---

## 📊 Couverture de Code

**Objectif Minimum** : 80% de couverture pour code critique

### Backend (Jest)
```bash
cd backend
npm run test:coverage
```

**Code critique à tester** :
- `utils/jwt.ts` : 100% (sécurité)
- `utils/encryption.ts` : 100% (sécurité)
- `models/User.model.ts` : 90%+ (bcrypt hooks)
- `middleware/auth.middleware.ts` : 90%+ (Passport)
- `routes/auth.routes.ts` : 85%+ (endpoints critiques)

---

## 🚀 Exécution des Tests

### Tous les tests
```bash
# Backend
cd backend
npm test

# Frontend (TNR)
npm test
```

### Par catégorie
```bash
# Tests unitaires backend
cd backend
npm test -- --testPathPattern=unitaires/tests_PERSISTANCE_SECURISEE_AUTHENTICATION

# Tests fonctionnels backend
npm test -- --testPathPattern=fonctionnels/tests_PERSISTANCE_SECURISEE_AUTHENTICATION

# Tests non-régression frontend
npm test -- --testPathPattern=non-regression/tests_PERSISTANCE_SECURISEE_AUTHENTICATION
```

### Watch mode (développement)
```bash
cd backend
npm test -- --watch
```

---

## 🔧 Configuration

### Jest (Backend)
Créer `backend/jest.config.js` :
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../tests'],
  testMatch: [
    '**/tests/unitaires/tests_PERSISTANCE_SECURISEE_AUTHENTICATION/**/*.test.ts',
    '**/tests/fonctionnels/tests_PERSISTANCE_SECURISEE_AUTHENTICATION/**/*.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/../tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts'
  ],
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
};
```

### Vitest (Frontend TNR)
Ajouter dans `vite.config.ts` :
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/non-regression/**/*.test.tsx', 'tests/non-regression/**/*.test.ts'],
    setupFiles: ['tests/setup.ts']
  }
});
```

---

## 📝 Exemple Tests

### Test Unitaire (JWT)
```typescript
// tests/unitaires/tests_PERSISTANCE_SECURISEE_AUTHENTICATION/jwt.test.ts
import { generateAccessToken, verifyAccessToken } from '@/utils/jwt';

describe('JWT Utils', () => {
  describe('generateAccessToken', () => {
    it('should generate valid JWT with 24h expiration', () => {
      const payload = { sub: '123', email: 'test@example.com', role: 'user' };
      const token = generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyAccessToken', () => {
    it('should decode valid token', () => {
      const payload = { sub: '123', email: 'test@example.com', role: 'user' };
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);
      
      expect(decoded.sub).toBe('123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('user');
    });

    it('should throw on invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });
  });
});
```

### Test Fonctionnel (Auth Flow)
```typescript
// tests/fonctionnels/tests_PERSISTANCE_SECURISEE_AUTHENTICATION/auth-flow.test.ts
import request from 'supertest';
import app from '@/server';
import { connectDatabase } from '@/config/database';

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  it('should register → login → access protected route', async () => {
    // 1. Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ 
        email: 'testflow@example.com', 
        password: 'Test123!@#' 
      });
    
    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toHaveProperty('accessToken');
    expect(registerRes.body).toHaveProperty('refreshToken');
    
    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ 
        email: 'testflow@example.com', 
        password: 'Test123!@#' 
      });
    
    expect(loginRes.status).toBe(200);
    const { accessToken } = loginRes.body;
    
    // 3. Access Protected Route
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe('testflow@example.com');
    expect(meRes.body.role).toBe('user');
  });
});
```

### Test Non-Régression (Guest Mode)
```typescript
// tests/non-regression/tests_PERSISTANCE_SECURISEE_AUTHENTICATION/guest-mode.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '@/App';

describe('Guest Mode TNR', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should allow creating agents without authentication', async () => {
    render(<App />);
    
    // User clicks "Create Agent"
    const createBtn = screen.getByText(/create agent/i);
    createBtn.click();
    
    // Modal opens, fill form
    const nameInput = screen.getByLabelText(/agent name/i);
    nameInput.value = 'Test Agent';
    
    const submitBtn = screen.getByText(/save/i);
    submitBtn.click();
    
    // Agent appears in sidebar
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });

  it('should store LLM configs in localStorage', () => {
    render(<App />);
    
    // User adds OpenAI config
    const addConfigBtn = screen.getByText(/add llm config/i);
    addConfigBtn.click();
    
    // Fill OpenAI API key
    const apiKeyInput = screen.getByLabelText(/api key/i);
    apiKeyInput.value = 'sk-test-123';
    
    const saveBtn = screen.getByText(/save/i);
    saveBtn.click();
    
    // Check localStorage
    const storedConfigs = JSON.parse(
      localStorage.getItem('llmAgentWorkflow_configs') || '{}'
    );
    
    expect(storedConfigs.openai).toBeDefined();
    expect(storedConfigs.openai.apiKey).toBe('sk-test-123');
  });
});
```

---

## 🎯 Checklist Implémentation

Avant de valider le plan d'implémentation PERSISTANCE_SECURISEE_AUTHENTICATION :

### Tests Unitaires Backend
- [ ] JWT utils (generate, verify)
- [ ] Encryption utils (encrypt, decrypt)
- [ ] User model (bcrypt hooks, comparePassword)
- [ ] Agent model (creatorId enum validation)
- [ ] LLMConfig model (encrypt/decrypt API keys)
- [ ] Validation middleware (Zod schemas)
- [ ] Robot governance middleware (permissions)

### Tests Fonctionnels Backend
- [ ] Auth flow (register → login → protected route)
- [ ] Token refresh flow
- [ ] LLM config encryption flow
- [ ] Robot governance flow (AR_001 ✅ vs COM_001 ❌)

### Tests Non-Régression Frontend
- [ ] Guest mode préservé (localStorage, agents volatiles)
- [ ] Python tools sans authentification
- [ ] Services LLM fonctionnels sans backend

### Métriques
- [ ] Couverture ≥ 80% pour code critique backend
- [ ] Tous tests passent (`npm test`)
- [ ] Build TypeScript sans erreurs
- [ ] Aucune régression fonctionnelle

---

## 📈 Métriques Attendues

**Backend** :
- Tests unitaires : 30-40 tests
- Tests fonctionnels : 10-15 tests
- Couverture globale : ≥ 80%
- Temps exécution : < 30 secondes

**Frontend TNR** :
- Tests non-régression : 5-10 tests
- Couverture : ≥ 60% (focus workflows critiques)
- Temps exécution : < 15 secondes

---

## 🐛 Debugging Tests

### Afficher logs
```bash
# Jest verbose
npm test -- --verbose

# Debug un test spécifique
npm test -- --testNamePattern="should register user"
```

### Breakpoints
```typescript
// Ajouter dans test
debugger;

// Lancer avec Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### MongoDB Test Database
```bash
# Utiliser DB séparée pour tests
MONGO_URI=mongodb://localhost:27017/a-ir-dd2-test npm test
```

---

**Maintenu par** : ARC-1 (Agent Architecte)  
**Dernière mise à jour** : 2025-12-10  
**Status** : ⏸️ À implémenter (Option A validée par Chef de Projet)
