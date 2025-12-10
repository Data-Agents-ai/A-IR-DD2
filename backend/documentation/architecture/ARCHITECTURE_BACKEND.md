# Architecture Backend - A-IR-DD2

## 📋 Vue d'Ensemble

Le backend est un serveur Node.js + Express fournissant :
- **Authentification JWT** (Passport.js)
- **Persistance MongoDB** (Mongoose)
- **Proxy LLM sécurisé** (streaming SSE)
- **Exécution Python** (outils whitelistés)
- **WebSocket temps réel** (Socket.IO)

---

## 🏗️ Architecture Modulaire

```
backend/
├── src/
│   ├── config/          # Configuration (Database, Redis, etc.)
│   ├── constants/       # Constantes métier (RobotIds, permissions)
│   ├── middleware/      # Middlewares Express (auth, validation, governance)
│   ├── models/          # Schémas Mongoose (User, Agent, LLMConfig, etc.)
│   ├── routes/          # Routes API (auth, agents, llm-proxy, etc.)
│   ├── services/        # Logique métier (LLM integrations, business logic)
│   ├── utils/           # Utilitaires (JWT, encryption, helpers)
│   ├── websocket/       # Gestion WebSocket (Socket.IO)
│   ├── types/           # Définitions TypeScript
│   ├── pythonExecutor.ts  # Exécution outils Python
│   ├── config.ts        # Configuration globale (whitelists, etc.)
│   └── server.ts        # Point d'entrée principal
│
├── documentation/
│   ├── architecture/    # Guides architecture (ce fichier)
│   └── guides/          # Guides opérationnels (jalons, corrections, tests)
│
├── scripts/             # Scripts maintenance (migration DB, seed, etc.)
├── .env                 # Variables d'environnement (secrets)
├── .env.example         # Template .env (à copier)
├── package.json         # Dépendances Node.js
└── tsconfig.json        # Configuration TypeScript

```

---

## 🔐 Sécurité (Jalon 1)

### Variables d'Environnement (`.env`)
```env
# Database
MONGO_URI=mongodb://localhost:27017/a-ir-dd2-dev

# JWT Secrets (256-bit hex)
JWT_SECRET=a260e27ee62caafea9bf...
REFRESH_TOKEN_SECRET=b371f38ff73dbcgfb0ca...

# Encryption (AES-256-GCM)
ENCRYPTION_KEY=c482g49gg84ecdhgc1db...

# Bcrypt
BCRYPT_ROUNDS=10

# Server
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

⚠️ **JAMAIS commiter `.env` dans Git !**

### Middleware Sécurité
```typescript
// src/server.ts
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

app.use(helmet());              // Headers HTTP sécurisés
app.use(mongoSanitize());       // Anti-injection NoSQL
app.use(cors({                  // CORS configuré
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

---

## 🗄️ Couche Données (Mongoose Models)

### Hiérarchie Entités
```
User (utilisateur)
  ↓ owns
Agent (prototype agent créé par RobotId)
  ↓ instantiates
AgentInstance (instance canvas workflow)

User
  ↓ owns
LLMConfig (clés API chiffrées par provider)

User
  ↓ owns
WorkflowNode (nœuds + edges canvas)
```

### Modèles Principaux

#### `models/User.model.ts`
```typescript
interface IUser {
  email: string;           // Unique, lowercase, indexed
  password: string;        // Bcrypt hash (jamais plaintext)
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}
```

**Hooks** :
- `pre('save')` : Hash password avec bcrypt (10 rounds)

**Méthodes** :
- `comparePassword(candidatePassword)` : Vérifie mot de passe

---

#### `models/Agent.model.ts`
```typescript
interface IAgent {
  name: string;
  role: string;
  systemPrompt: string;
  llmProvider: string;
  llmModel: string;        // ⚠️ Renommé (était 'model', conflit Document.model())
  capabilities: string[];
  historyConfig?: object;
  tools?: object[];
  outputConfig?: object;
  creatorId: string;       // RobotId (AR_001, BOS_001, etc.) - ENUM strict
  ownerId: ObjectId;       // FK → User
  createdAt: Date;
  updatedAt: Date;
}
```

**Index** :
- `{ creatorId: 1 }` : Queries par Robot
- `{ ownerId: 1 }` : Queries par User
- `{ ownerId: 1, creatorId: 1 }` : Queries composées
- `{ ownerId: 1, createdAt: -1 }` : Listing chronologique

**Validation** :
- Enum `creatorId` : Seulement 5 RobotIds autorisés (AR_001, BOS_001, COM_001, PHIL_001, TIM_001)

---

#### `models/LLMConfig.model.ts`
```typescript
interface ILLMConfig {
  userId: ObjectId;        // FK → User
  provider: string;        // 'openai', 'gemini', 'anthropic', etc.
  enabled: boolean;
  apiKeyEncrypted: string; // ⚠️ Chiffré AES-256-GCM
  capabilities: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
  getDecryptedApiKey(): string;
  setApiKey(plainKey: string): void;
}
```

**Unique Constraint** : `{ userId: 1, provider: 1 }` (1 config par provider/user)

**Index** :
- `{ enabled: 1 }` : Filtrage configs actives

**Méthodes** :
- `getDecryptedApiKey()` : Déchiffre API key avec `utils/encryption.ts`
- `setApiKey(plainKey)` : Chiffre et stocke API key

⚠️ **CRITIQUE** : API keys **JAMAIS** stockées en clair. Chiffrement avec `userId` comme salt.

---

#### `models/AgentInstance.model.ts`
```typescript
interface IAgentInstance {
  prototypeId: ObjectId;   // FK → Agent
  ownerId: ObjectId;       // FK → User (dénormalisé pour queries)
  name: string;
  position: { x: number; y: number };
  isMinimized: boolean;
  isMaximized: boolean;
  configurationJson: object; // Deep clone prototype (isolation)
  createdAt: Date;
  updatedAt: Date;
}
```

**Index** :
- `{ prototypeId: 1 }` : Cascade delete logic
- `{ ownerId: 1, createdAt: -1 }` : Listing user

---

#### `models/WorkflowNode.model.ts`
```typescript
interface IWorkflowNode {
  userId: ObjectId;        // FK → User
  nodeId: string;          // UUID frontend
  type: 'agent' | 'tool' | 'condition' | 'trigger';
  position: { x: number; y: number };
  data: object;            // React Flow node data
  connections: {           // Edges React Flow
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Index** :
- `{ userId: 1, nodeId: 1 }` : Unique par user
- `{ userId: 1 }` : Listing canvas

---

## 🔑 Authentification (Jalon 2)

### Stack Technique
- **Passport.js** : Authentification middleware
  - Stratégie Local (email/password)
  - Stratégie JWT (Bearer token)
- **jsonwebtoken** : Génération/vérification JWT
- **Zod** : Validation schémas (register, login)

### Flow d'Authentification

```
┌─────────────────────────────────────────────────────────────┐
│  1. REGISTRATION                                            │
└─────────────────────────────────────────────────────────────┘
Frontend                     Backend
   │                            │
   │  POST /api/auth/register   │
   ├───────────────────────────>│
   │  { email, password }        │
   │                            │
   │                            │ 1. Zod validation (password policy)
   │                            │ 2. Check email unique
   │                            │ 3. Bcrypt hash (pre-save hook)
   │                            │ 4. Save to MongoDB
   │                            │ 5. Generate JWT tokens
   │                            │
   │  { user, accessToken,      │
   │    refreshToken }          │
   │<───────────────────────────┤
   │                            │

┌─────────────────────────────────────────────────────────────┐
│  2. LOGIN                                                   │
└─────────────────────────────────────────────────────────────┘
Frontend                     Backend
   │                            │
   │  POST /api/auth/login      │
   ├───────────────────────────>│
   │  { email, password }        │
   │                            │
   │                            │ 1. Find user by email
   │                            │ 2. comparePassword() bcrypt
   │                            │ 3. Update lastLogin
   │                            │ 4. Generate JWT tokens
   │                            │
   │  { user, accessToken,      │
   │    refreshToken }          │
   │<───────────────────────────┤
   │                            │

┌─────────────────────────────────────────────────────────────┐
│  3. PROTECTED ROUTE                                         │
└─────────────────────────────────────────────────────────────┘
Frontend                     Backend
   │                            │
   │  GET /api/agents           │
   ├───────────────────────────>│
   │  Authorization: Bearer ... │
   │                            │
   │                            │ 1. Passport JWT Strategy
   │                            │ 2. Extract token from header
   │                            │ 3. Verify signature
   │                            │ 4. Decode payload { sub, email, role }
   │                            │ 5. Attach req.user
   │                            │ 6. Execute route handler
   │                            │
   │  { agents: [...] }         │
   │<───────────────────────────┤
   │                            │

┌─────────────────────────────────────────────────────────────┐
│  4. TOKEN REFRESH                                           │
└─────────────────────────────────────────────────────────────┘
Frontend                     Backend
   │                            │
   │  POST /api/auth/refresh    │
   ├───────────────────────────>│
   │  { refreshToken }           │
   │                            │
   │                            │ 1. Verify refresh token
   │                            │ 2. Decode payload
   │                            │ 3. Generate new access token
   │                            │
   │  { accessToken }           │
   │<───────────────────────────┤
   │                            │
```

### JWT Payload Structure
```typescript
interface JWTPayload {
  sub: string;      // User ID (MongoDB ObjectId)
  email: string;
  role: string;     // 'admin' | 'user' | 'viewer'
  iat: number;      // Issued at (timestamp)
  exp: number;      // Expiration (timestamp)
}
```

### Token Expiration
- **Access Token** : 24 heures (courte durée, sécurisé)
- **Refresh Token** : 7 jours (longue durée, stocké HttpOnly cookie frontend)

---

## 🛡️ Middleware Stack

### 1. Security Middleware (`server.ts`)
```typescript
app.use(helmet());              // Headers HTTP
app.use(mongoSanitize());       // Anti NoSQL injection
app.use(cors({ credentials: true }));
app.use(express.json());
```

### 2. Authentication Middleware (`middleware/auth.middleware.ts`)

#### `requireAuth`
Vérifie JWT valide, attache `req.user`.
```typescript
import { requireAuth } from '../middleware/auth.middleware';

router.get('/agents', requireAuth, getAgents);
// req.user disponible dans getAgents()
```

#### `requireRole(roles: string[])`
Vérifie que `req.user.role` correspond.
```typescript
router.delete('/users/:id', requireAuth, requireRole(['admin']), deleteUser);
// Seul 'admin' peut supprimer users
```

#### `requireOwnership(getUserId)`
Vérifie que la ressource appartient à `req.user`.
```typescript
router.put('/agents/:id', 
  requireAuth, 
  requireOwnership((req) => Agent.findById(req.params.id).then(a => a.ownerId)),
  updateAgent
);
// Seul le owner peut modifier l'agent
```

### 3. Validation Middleware (`middleware/validation.middleware.ts`)

Utilise **Zod** pour valider `req.body`.
```typescript
import { validateRequest } from '../middleware/validation.middleware';
import { z } from 'zod';

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().max(200),
  systemPrompt: z.string().min(1),
  llmProvider: z.string(),
  llmModel: z.string(),
  creatorId: z.string()
});

router.post('/agents', 
  requireAuth, 
  validateRequest(createAgentSchema),
  createAgent
);
// req.body validé avant d'atteindre createAgent()
```

**Réponse erreur 400** :
```json
{
  "error": "Validation échouée",
  "details": [
    {
      "field": "name",
      "message": "Le nom est requis",
      "code": "invalid_type"
    }
  ]
}
```

### 4. Robot Governance Middleware (`middleware/robotGovernance.middleware.ts`)

Valide que le `creatorId` a le droit de créer la ressource.

```typescript
import { validateRobotPermission } from '../middleware/robotGovernance.middleware';

router.post('/agents', 
  requireAuth,
  validateRobotPermission('agent'), // ✅ Seul AR_001 autorisé
  validateRequest(createAgentSchema),
  createAgent
);
```

**Règles métier** (`constants/robots.ts`) :
```typescript
export const ROBOT_RESOURCE_PERMISSIONS = {
  'AR_001': ['agent', 'orchestration'],      // Archi
  'BOS_001': ['workflow', 'supervision'],    // Bos
  'COM_001': ['connection', 'api'],          // Com
  'PHIL_001': ['transformation', 'file'],    // Phil
  'TIM_001': ['event', 'trigger', 'schedule'] // Tim
};
```

**Réponse erreur 403** :
```json
{
  "error": "Permission refusée",
  "message": "Le robot COM_001 n'est pas autorisé à créer des ressources de type 'agent'",
  "code": "ROBOT_PERMISSION_DENIED"
}
```

---

## 🔧 Utilitaires Critiques

### `utils/jwt.ts`
```typescript
export function generateAccessToken(payload: JWTPayload): string;
export function generateRefreshToken(payload: JWTPayload): string;
export function verifyAccessToken(token: string): JWTPayload;
export function verifyRefreshToken(token: string): JWTPayload;
```

**Utilisation** :
```typescript
const accessToken = generateAccessToken({ 
  sub: user.id, 
  email: user.email, 
  role: user.role 
});
```

### `utils/encryption.ts`
Chiffrement AES-256-GCM avec PBKDF2 pour dérivation clé.

```typescript
export function encrypt(plaintext: string, salt: string): string;
export function decrypt(ciphertext: string, salt: string): string;
```

**Utilisation** (dans `LLMConfig.model.ts`) :
```typescript
const config = new LLMConfig({ userId, provider, ... });
config.setApiKey('sk-openai-123456'); // Chiffre automatiquement
const plainKey = config.getDecryptedApiKey(); // Déchiffre
```

⚠️ **Salt = `userId.toString()`** : Isolation par utilisateur, clé différente par user.

---

## 📡 Routes API

### Routes Authentification (`routes/auth.routes.ts`)
```
POST   /api/auth/register      # Inscription
POST   /api/auth/login         # Connexion
POST   /api/auth/refresh       # Refresh token
POST   /api/auth/logout        # Déconnexion (stateless)
GET    /api/auth/me            # User actuel (protégé)
```

### Routes Agents (Jalon 3 - À implémenter)
```
GET    /api/agents             # Liste agents user
POST   /api/agents             # Créer agent (avec gouvernance RobotId)
GET    /api/agents/:id         # Détail agent
PUT    /api/agents/:id         # Modifier agent (ownership check)
DELETE /api/agents/:id         # Supprimer agent (ownership check)
```

### Routes LLM Configs (Jalon 3 - À implémenter)
```
GET    /api/llm-configs        # Liste configs user
POST   /api/llm-configs        # Ajouter config (chiffrement auto)
PUT    /api/llm-configs/:id    # Modifier config
DELETE /api/llm-configs/:id    # Supprimer config
```

### Routes LLM Proxy (Jalon 3 - À implémenter)
```
POST   /api/llm/stream         # SSE streaming (déchiffrement server-side)
POST   /api/llm/generate       # Génération simple (non-streaming)
```

---

## 🐍 Exécution Python (`pythonExecutor.ts`)

### Principe
Le backend peut exécuter des **scripts Python whitelistés** pour des tâches spécifiques.

### Whitelist (`config.ts`)
```typescript
export const WHITELISTED_PYTHON_TOOLS = [
  'hello_world.py',
  'data_processor.py',
  'image_analyzer.py'
];
```

⚠️ **Sécurité** : Seuls les scripts dans cette liste peuvent être exécutés.

### Contract Python Script
**Input** : JSON via `sys.argv[1]`  
**Output** : JSON vers `stdout`  
**Errors** : Messages vers `stderr`, exit code ≠ 0

**Exemple** (`utils/pythonTools/hello_world.py`) :
```python
import sys
import json

# Parse input
args = json.loads(sys.argv[1])
name = args.get('name', 'World')

# Business logic
result = f"Hello, {name}!"

# Output JSON
print(json.dumps({"message": result}))
```

### Appel depuis Backend
```typescript
import { executePythonTool } from './pythonExecutor';

const result = await executePythonTool('hello_world.py', { name: 'Alice' });
// result = { message: "Hello, Alice!" }
```

### Route API
```
POST   /api/execute-python-tool
Body:  { toolName: 'hello_world.py', args: { name: 'Alice' } }
```

---

## 🌐 WebSocket (`websocket/WebSocketManager.ts`)

### Principe (Jalon 6)
Synchronisation temps réel pour collaboration multi-utilisateurs.

### Events
```typescript
// Client → Server
socket.emit('agent:create', agentData);
socket.emit('agent:update', { id, changes });
socket.emit('agent:delete', { id });

// Server → Client (broadcast room)
socket.on('agent:created', (agent) => { ... });
socket.on('agent:updated', (agent) => { ... });
socket.on('agent:deleted', ({ id }) => { ... });
```

### Rooms par User
```typescript
socket.join(`user:${userId}`);
io.to(`user:${userId}`).emit('agent:created', agent);
```

---

## 🧪 Tests

### Structure
```
tests/
├── unitaires/
│   └── tests_PERSISTANCE_SECURISEE_AUTHENTICATION/
│       ├── jwt.test.ts
│       ├── encryption.test.ts
│       └── models/
│           ├── User.test.ts
│           └── Agent.test.ts
│
├── fonctionnels/
│   └── tests_PERSISTANCE_SECURISEE_AUTHENTICATION/
│       ├── auth-flow.test.ts
│       └── agent-crud.test.ts
│
└── non-regression/
    └── tests_PERSISTANCE_SECURISEE_AUTHENTICATION/
        └── guest-mode.test.ts
```

### Configuration Jest
```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../tests'],
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/../tests/setup.ts']
};
```

### Exemple Test Unitaire
```typescript
// tests/unitaires/.../jwt.test.ts
import { generateAccessToken, verifyAccessToken } from '@/utils/jwt';

describe('JWT Utils', () => {
  it('should generate and verify access token', () => {
    const payload = { sub: '123', email: 'test@example.com', role: 'user' };
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);
    
    expect(decoded.sub).toBe('123');
    expect(decoded.email).toBe('test@example.com');
  });
});
```

### Exemple Test Fonctionnel
```typescript
// tests/fonctionnels/.../auth-flow.test.ts
import request from 'supertest';
import app from '@/server';

describe('Authentication Flow', () => {
  it('should register → login → access protected route', async () => {
    // 1. Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Test123!@#' });
    expect(registerRes.status).toBe(201);
    
    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test123!@#' });
    const { accessToken } = loginRes.body;
    
    // 3. Protected route
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe('test@example.com');
  });
});
```

---

## 🚀 Démarrage & Développement

### Installation
```bash
cd backend
npm install
```

### Configuration
```bash
# Copier template environnement
cp .env.example .env

# Éditer secrets (JWT_SECRET, MONGO_URI, etc.)
nano .env
```

### Développement
```bash
# Lancer MongoDB (Docker)
docker run -d -p 27017:27017 --name mongodb mongo:6

# Lancer backend (hot reload)
npm run dev
# Backend: http://localhost:3001
```

### Build Production
```bash
npm run build   # Compile TypeScript → dist/
npm start       # Lance dist/server.js
```

### Tests
```bash
npm test                # Tous les tests
npm run test:watch      # Watch mode
npm run test:coverage   # Couverture de code
```

---

## 📊 Principes SOLID

### Single Responsibility
- **Routes** : Routing uniquement, délègue à services
- **Services** : Logique métier isolée
- **Models** : Schéma + méthodes liées au modèle uniquement

### Open/Closed
- Middleware composables (facile d'ajouter `requireRole`, `requireOwnership`)
- Stratégies Passport extensibles (OAuth2, SAML à ajouter)

### Liskov Substitution
- Tous les middlewares respectent `(req, res, next) => void`
- Modèles Mongoose implémentent `Document` interface

### Interface Segregation
- `JWTPayload` minimal (sub, email, role)
- Pas de propriétés inutiles dans interfaces

### Dependency Inversion
- Routes dépendent d'abstractions (middlewares, services)
- Pas de couplage direct MongoDB dans routes (via models)

---

## 🔄 Mode Hybride Guest/Authenticated

### Mode Guest (Actuel - Préservé)
```typescript
// Frontend
localStorage.setItem('llmAgentWorkflow_configs', JSON.stringify(configs));
useDesignStore.agents; // Volatile (perdu au refresh)
```

**Caractéristiques** :
- ✅ Aucune authentification requise
- ✅ API keys stockées en clair (localStorage)
- ✅ Données volatiles (perdu au refresh)
- ✅ **Non-régression garantie** (comportement inchangé)

### Mode Authenticated (Jalons 3-4)
```typescript
// Frontend
const { accessToken } = useAuth();
fetch('/api/agents', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

**Caractéristiques** :
- 🔐 Authentification JWT requise
- 🔐 API keys chiffrées (backend AES-256-GCM)
- 💾 Données persistées (MongoDB)
- 🔄 Synchronisation temps réel (WebSocket)

### Transition Guest → Auth (Jalon 5)
**Wizard de Migration** :
1. User se connecte
2. Détecte `localStorage` non vide
3. Propose import données
4. Migre vers MongoDB
5. Nettoie `localStorage` (optionnel)

---

## 📈 Métriques & Monitoring

### Health Check
```bash
curl http://localhost:3001/api/health
# { "status": "OK", "message": "Backend is running" }
```

### Database Status
```typescript
// Dans server.ts
connectDatabase()
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(() => console.warn('⚠️ Mode dégradé (Guest only)'));
```

### Logs Structure
```typescript
console.log('[AUTH] User registered:', user.email);
console.error('[DB] MongoDB connection failed:', error);
console.warn('[SECURITY] Invalid token detected');
```

---

## 🐛 Débogage

### Activer Debug Logs
```bash
# .env
DEBUG=true
LOG_LEVEL=debug
```

### MongoDB Shell
```bash
# Se connecter à MongoDB
mongosh mongodb://localhost:27017/a-ir-dd2-dev

# Lister collections
show collections

# Query user
db.users.find({ email: 'test@example.com' })

# Query agents par owner
db.agents.find({ ownerId: ObjectId('...') })
```

### Tester JWT
```bash
# Générer token (Node REPL)
node
> const jwt = require('jsonwebtoken');
> const token = jwt.sign({ sub: '123', email: 'test@test.com', role: 'user' }, 'your-secret', { expiresIn: '1h' });
> console.log(token);

# Vérifier token
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/auth/me
```

---

## 🎯 Checklist Nouveau Développeur

Avant de développer une nouvelle feature :

- [ ] Lire ce guide architecture
- [ ] Vérifier `.env` configuré (secrets MongoDB, JWT)
- [ ] MongoDB lancé (`docker ps | grep mongo`)
- [ ] Backend démarré (`npm run dev`)
- [ ] Tester health check (`curl http://localhost:3001/api/health`)
- [ ] Comprendre flow JWT (register → login → protected route)
- [ ] Lire principes SOLID ci-dessus
- [ ] Créer branche Git (`git checkout -b feature/ma-feature`)
- [ ] Écrire tests **avant** d'implémenter (TDD recommandé)
- [ ] Lancer tests (`npm test`)
- [ ] Commit atomiques (`git commit -m "feat(auth): add password reset"`)

---

## 📚 Références

- **Mongoose** : https://mongoosejs.com/docs/guide.html
- **Passport.js** : https://www.passportjs.org/docs/
- **JWT Best Practices** : https://tools.ietf.org/html/rfc8725
- **Zod Validation** : https://zod.dev/
- **Express Security** : https://expressjs.com/en/advanced/best-practice-security.html

---

**Maintenu par** : ARC-1 (Agent Architecte)  
**Dernière mise à jour** : 2025-12-10  
**Version Backend** : Jalons 1-2 complétés, Jalon 3 en préparation
