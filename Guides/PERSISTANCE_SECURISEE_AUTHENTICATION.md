# 📘 GUIDE D'IMPLÉMENTATION
## **PERSISTANCE SÉCURISÉE & AUTHENTIFICATION MULTI-UTILISATEURS**
### A-IR-DD2 - Migration Architecture Hybride (Guest + Authenticated)

**Version**: 1.1.0  
**Date**: 10 Décembre 2025 *(Mise à jour critique)*  
**Auteur**: ARC-1 (Agent IA Architecte)  
**Statut**: 🔄 EN DÉVELOPPEMENT

> ⚠️ **CORRECTIONS CRITIQUES - JALON 4 FRONTEND MODE HYBRIDE**  
> **RÉGRESSION IDENTIFIÉE**: Settings button not accessible in Guest mode  
> **DOCUMENT DE CORRECTION**: [PERSISTANCE_SECURISEE_AUTHENTICATION_v1.2_CORRECTIONS.md](./PERSISTANCE_SECURISEE_AUTHENTICATION_v1.2_CORRECTIONS.md) ← **EXÉCUTER EN PRIORITÉ**  
> 
> Ce document décrit l'architecture cible. Les **corrections précédentes** sont documentées dans :
> - **📄 [CORRECTIONS v1.1](./PERSISTANCE_SECURISEE_AUTHENTICATION_v1.1_CORRECTIONS.md)** (Jalon 3 architectural fixes)
> - **📄 [ADDENDUM_CRITIQUE_WORKFLOW_SCHEMA.md](../backend/documentation/guides/jalons/ADDENDUM_CRITIQUE_WORKFLOW_SCHEMA.md)** (analyse détaillée)
> - **📄 [JALON3_PHASE1_COMPLETION.md](../backend/documentation/guides/jalons/JALON3_PHASE1_COMPLETION.md)** (implémentation Phase 1)

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'Ensemble & Objectifs](#vue-densemble--objectifs)
2. [Contraintes Critiques de Non-Régression](#contraintes-critiques-de-non-régression)
3. [Architecture Cible](#architecture-cible)
4. [Stack Technique](#stack-technique)
5. [JALON 1 : Sécurité & Environnement](#jalon-1--sécurité--environnement)
6. [JALON 2 : Backend Authentification](#jalon-2--backend-authentification)
7. [JALON 3 : API Métier & Gouvernance](#jalon-3--api-métier--gouvernance)
8. [JALON 4 : Frontend - Mode Hybride](#jalon-4--frontend---mode-hybride)
9. [JALON 5 : Migration Données](#jalon-5--migration-données)
10. [JALON 6 : WebSocket Temps Réel](#jalon-6--websocket-temps-réel)
11. [JALON 7 : Tests & Validation](#jalon-7--tests--validation)
12. [JALON 8 : Documentation & Déploiement](#jalon-8--documentation--déploiement)

---

## 🎯 VUE D'ENSEMBLE & OBJECTIFS

### **Problématique Actuelle**

**🔴 SÉCURITÉ CRITIQUE**:
```typescript
// PROBLÈME: API Keys exposées côté client
localStorage.setItem('llmAgentWorkflow_configs', JSON.stringify([
  { provider: 'OpenAI', apiKey: 'sk-proj-...', enabled: true },
  { provider: 'Anthropic', apiKey: 'sk-ant-...', enabled: true }
]));
// ❌ Accessible via DevTools Console
// ❌ Visible dans inspecteur réseau
// ❌ Aucune authentification utilisateur
```

**🟠 PERTE DE DONNÉES**:
- Agents (prototypes) → React state (perdus au refresh)
- Instances workflow → Zustand (volatiles)
- Chat history → Runtime only (éphémère)
- Aucune synchronisation multi-device

**🟡 DETTE TECHNIQUE**:
- 4 stratégies de persistence différentes
- Gouvernance client-side (contournable)
- Impossible de collaborer ou versionner

### **Vision Cible : Architecture Hybride**

```
┌─────────────────────────────────────────────────────────────┐
│                    MODE GUEST (Déconnecté)                  │
│  ✅ Fonctionnement IDENTIQUE à l'actuel (NON-RÉGRESSION)   │
│  📦 localStorage (API keys en clair - risque assumé)        │
│  🚫 Pas de sync, pas de collaboration                       │
│  ⚡ Démarrage immédiat, aucun compte requis                 │
└─────────────────────────────────────────────────────────────┘
                            ↕️
                     [LOGIN / REGISTER]
                            ↕️
┌─────────────────────────────────────────────────────────────┐
│                MODE AUTHENTICATED (Connecté)                │
│  🔐 Backend MongoDB (API keys chiffrées AES-256-GCM)       │
│  ☁️  Persistence cloud (agents, workflows, configs)         │
│  🔄 Sync temps réel (WebSocket)                             │
│  👥 Préparation collaboration (future feature)              │
└─────────────────────────────────────────────────────────────┘
```

### **Objectifs Mesurables**

| Objectif | Métrique | Cible |
|----------|----------|-------|
| **Sécurité** | API keys chiffrées | 100% (mode auth) |
| **Non-régression** | Fonctionnalités Guest préservées | 100% |
| **Performance** | Latence API | <200ms (p95) |
| **Fiabilité** | Données persistées | 100% (mode auth) |
| **UX** | Transition Guest→Auth | <30s (wizard) |

---

## ⚠️ CONTRAINTES CRITIQUES DE NON-RÉGRESSION

### **RÈGLE D'OR : Mode Guest = Fonctionnement Actuel EXACT**

**IMPÉRATIF ABSOLU** : L'utilisateur déconnecté doit pouvoir utiliser l'application **EXACTEMENT** comme aujourd'hui, sans aucune dégradation de fonctionnalité.

#### **Checklist de Non-Régression**

```typescript
// ✅ MODE GUEST (Déconnecté) - DOIT FONCTIONNER À L'IDENTIQUE
const guestModeRequirements = {
  llmConfigs: {
    storage: 'localStorage',              // ✅ IDENTIQUE actuel
    key: 'llmAgentWorkflow_configs',      // ✅ Même clé
    encryption: false,                     // ⚠️ Risque assumé par utilisateur
    format: 'JSON.stringify(LLMConfig[])'  // ✅ Format préservé
  },
  agents: {
    storage: 'Zustand store (volatile)',  // ✅ Comme actuel
    persistence: false,                    // ⚠️ Perdus au refresh (comportement actuel)
    operations: ['create', 'update', 'delete'] // ✅ Toutes fonctionnent
  },
  workflows: {
    storage: 'Zustand store (volatile)',  // ✅ Comme actuel
    canvas: 'React Flow',                  // ✅ Rendu identique
    realtime: false                        // ✅ Pas de WebSocket (comme actuel)
  },
  chat: {
    execution: 'client-side',             // ✅ Services LLM directs
    apiKeys: 'from localStorage',         // ✅ Comme actuel
    streaming: true                       // ✅ Préservé
  },
  features: {
    createAgent: true,                    // ✅ Archi prototype
    editAgent: true,                      // ✅ Modification
    deleteAgent: true,                    // ✅ Suppression
    addToWorkflow: true,                  // ✅ Instance sur canvas
    chatWithAgent: true,                  // ✅ Exécution LLM
    imageGeneration: true,                // ✅ Si provider supporte
    pythonTools: true                     // ✅ Backend tools OK
  }
};
```

---

## 🏗️ ARCHITECTURE CIBLE

### **Diagramme Architecture Hybride Complète**

```
┌──────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                │
│                                                                  │
│  ┌─────────────────────┐         ┌──────────────────────┐      │
│  │   🔓 GUEST MODE     │         │  🔐 AUTHENTICATED    │      │
│  │   (isAuth=false)    │         │      MODE            │      │
│  └─────────────────────┘         │   (isAuth=true)      │      │
│           │                       └──────────────────────┘      │
│           │                                  │                   │
│           ↓                                  ↓                   │
│  ┌─────────────────────┐         ┌──────────────────────┐      │
│  │  localStorage       │         │  React Query         │      │
│  │  ┌───────────────┐  │         │  ┌────────────────┐  │      │
│  │  │ LLM Configs   │  │         │  │ useQuery       │  │      │
│  │  │ (plaintext)   │  │         │  │ useMutation    │  │      │
│  │  └───────────────┘  │         │  └────────────────┘  │      │
│  │  ┌───────────────┐  │         │  + JWT in Cookie    │      │
│  │  │ Templates     │  │         │  + Auth Context     │      │
│  │  └───────────────┘  │         └──────────────────────┘      │
│  └─────────────────────┘                  │                     │
│                                            │ HTTPS               │
└────────────────────────────────────────────┼─────────────────────┘
                                             │
                        ┌────────────────────┴──────────────────┐
                        │       EXPRESS BACKEND (Node.js)       │
                        │                                       │
                        │  ┌─────────────────────────────────┐ │
                        │  │   🛡️  SECURITY LAYER           │ │
                        │  │   - Helmet (headers)            │ │
                        │  │   - CORS (whitelist)            │ │
                        │  │   - Rate Limiting               │ │
                        │  │   - Input Sanitization          │ │
                        │  └─────────────────────────────────┘ │
                        │                 ↓                     │
                        │  ┌─────────────────────────────────┐ │
                        │  │   🔐 AUTH MIDDLEWARE            │ │
                        │  │   - Passport.js (JWT Strategy)  │ │
                        │  │   - Token Verification          │ │
                        │  │   - User Injection (req.user)   │ │
                        │  └─────────────────────────────────┘ │
                        │                 ↓                     │
                        │  ┌─────────────────────────────────┐ │
                        │  │   📋 API ROUTES                 │ │
                        │  │   /api/auth (register, login)   │ │
                        │  │   /api/agents (CRUD)            │ │
                        │  │   /api/agent-instances (CRUD)   │ │
                        │  │   /api/llm-configs (secure)     │ │
                        │  │   /api/workflows (persist)      │ │
                        │  │   /api/llm/stream (proxy)       │ │
                        │  └─────────────────────────────────┘ │
                        │                 ↓                     │
                        │  ┌─────────────────────────────────┐ │
                        │  │   🔒 ENCRYPTION SERVICE         │ │
                        │  │   - AES-256-GCM                 │ │
                        │  │   - PBKDF2 Key Derivation       │ │
                        │  │   - Unique IV per encryption    │ │
                        │  └─────────────────────────────────┘ │
                        └───────────────┬───────────────────────┘
                                        │
                        ┌───────────────┴────────────────────┐
                        │        MONGODB DATABASE             │
                        │                                     │
                        │  ┌──────────────────────────────┐  │
                        │  │  Collection: users           │  │
                        │  │  - email (unique, indexed)   │  │
                        │  │  - password_hash (bcrypt)    │  │
                        │  │  - role, isActive, timestamps│  │
                        │  └──────────────────────────────┘  │
                        │  ┌──────────────────────────────┐  │
                        │  │  Collection: agents          │  │
                        │  │  - ownerId (FK → users)      │  │
                        │  │  - creatorId (RobotId)       │  │
                        │  │  - name, role, model, etc.   │  │
                        │  └──────────────────────────────┘  │
                        │  ┌──────────────────────────────┐  │
                        │  │  Collection: llm_configs     │  │
                        │  │  - userId (FK → users)       │  │
                        │  │  - provider (enum)           │  │
                        │  │  - apiKeyEncrypted 🔐        │  │
                        │  │  - capabilities (JSON)       │  │
                        │  └──────────────────────────────┘  │
                        │  ┌──────────────────────────────┐  │
                        │  │  Collection: agent_instances │  │
                        │  │  - prototypeId (FK → agents) │  │
                        │  │  - configuration_json (deep) │  │
                        │  │  - position, isMinimized     │  │
                        │  └──────────────────────────────┘  │
                        │  ┌──────────────────────────────┐  │
                        │  │  Collection: workflows       │  │
                        │  │  - ownerId (FK → users)      │  │
                        │  │  - nodes (array), edges      │  │
                        │  │  - name, description         │  │
                        │  └──────────────────────────────┘  │
                        └─────────────────────────────────────┘
```

### **Flux de Données : Comparaison Guest vs Authenticated**

#### **Scénario A : Chargement LLM Configurations**

**Mode Guest (Déconnecté)**:
```typescript
// 1. App.tsx - Au chargement
useEffect(() => {
  const stored = localStorage.getItem('llmAgentWorkflow_configs');
  if (stored) {
    const configs = JSON.parse(stored); // ⚠️ API keys en clair
    setLlmConfigs(configs);
  }
}, []);
```

**Mode Authenticated (Connecté)**:
```typescript
// 1. App.tsx - Au chargement
const { data: configs, isLoading } = useQuery({
  queryKey: ['llm-configs'],
  queryFn: async () => {
    const res = await fetch('/api/llm-configs', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return res.json(); // 🔐 API keys jamais retournées
  },
  enabled: isAuthenticated
});

useEffect(() => {
  if (configs) {
    setLlmConfigs(configs); // Safe: pas de clés sensibles
  }
}, [configs]);
```

#### **Scénario B : Exécution Chat LLM**

**Mode Guest**:
```typescript
// V2AgentNode.tsx - Envoyer message
const sendMessage = async () => {
  const apiKey = llmConfigs.find(c => c.provider === agent.llmProvider)?.apiKey;
  
  // Appel DIRECT au service LLM (client-side)
  for await (const chunk of llmService.generateContentStream(
    apiKey, // ⚠️ Clé depuis localStorage
    agent.model,
    agent.systemPrompt,
    messages,
    agent.tools
  )) {
    // Traiter chunk
  }
};
```

**Mode Authenticated**:
```typescript
// V2AgentNode.tsx - Envoyer message
const sendMessage = async () => {
  // Appel PROXY backend (sécurisé)
  const response = await fetch('/api/llm/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      provider: agent.llmProvider,
      model: agent.model,
      messages,
      tools: agent.tools
    })
  });
  
  // Backend déchiffre API key et proxy vers LLM
  const reader = response.body.getReader();
  // Lire stream SSE
};
```

### **Matrice de Décision : localStorage vs API**

| Action | Guest (Déconnecté) | Authenticated (Connecté) |
|--------|--------------------|--------------------------|
| **Load LLM Configs** | `localStorage.getItem('llmAgentWorkflow_configs')` | `GET /api/llm-configs` |
| **Save LLM Config** | `localStorage.setItem(...)` | `POST /api/llm-configs` |
| **Create Agent** | `useDesignStore.addAgent()` (volatile) | `POST /api/agents` → Zustand sync |
| **Update Agent** | `useDesignStore.updateAgent()` (volatile) | `PATCH /api/agents/:id` → Zustand sync |
| **Delete Agent** | `useDesignStore.deleteAgent()` (volatile) | `DELETE /api/agents/:id?cascade=true` |
| **Chat Execution** | Client-side (API key localStorage) | Backend proxy (API key décryptée) |
| **Workflow Save** | Zustand only (volatile) | `POST /api/workflows` |
| **Workflow Load** | N/A (pas de persistence) | `GET /api/workflows` |

---

## 🛠️ STACK TECHNIQUE

### **Backend Technologies**

| Composant | Technologie | Version | Justification |
|-----------|-------------|---------|---------------|
| **Runtime** | Node.js | 20+ LTS | TypeScript natif, performance, async/await |
| **Framework** | Express | 4.19+ | Déjà utilisé, mature, middleware ecosystem |
| **Database** | MongoDB | 6.0+ | Flexible schema (JSONB), horizontal scaling |
| **ORM** | Mongoose | 8.0+ | Type-safe schemas, validation, middleware hooks |
| **Auth** | Passport.js | 0.7+ | Multi-strategy (local, JWT, OAuth future) |
| **JWT** | jsonwebtoken | 9.0+ | Standard JWT signing/verification |
| **Password Hash** | bcrypt | 5.1+ | Industry standard, salt + hash |
| **Encryption** | crypto (Node) | Native | AES-256-GCM for API keys, PBKDF2 derivation |
| **Validation** | Zod | 3.22+ | Runtime validation + TypeScript type inference |
| **Security** | helmet | 7.1+ | HTTP headers hardening |
| **Sanitization** | express-mongo-sanitize | 2.2+ | Prevent NoSQL injection |
| **Rate Limiting** | express-rate-limit | 8.2.1 | Déjà installé, DDoS protection |
| **WebSocket** | Socket.IO | 4.7.5 | Déjà installé, real-time bi-directional |
| **Environment** | dotenv | 16.3+ | Env vars management |

### **Frontend Technologies**

| Composant | Technologie | Version | Justification |
|-----------|-------------|---------|---------------|
| **API Client** | TanStack Query | 5.17+ | Smart caching, auto-refetch, optimistic updates |
| **HTTP** | Fetch API | Native | Sufficient for needs, no Axios overhead |
| **State** | Zustand | 5.0.8 | Déjà utilisé, keep as local cache layer |
| **Auth Context** | React Context | Native | Simple auth state management |
| **WebSocket** | socket.io-client | 4.7.5 | Déjà installé, pairs with backend |

### **Installation Commands**

#### **Backend**

```bash
cd backend

# Core dependencies
npm install mongoose@^8.0.0 \
            bcrypt@^5.1.1 \
            jsonwebtoken@^9.0.2 \
            passport@^0.7.0 \
            passport-jwt@^4.0.1 \
            passport-local@^1.0.0 \
            zod@^3.22.4 \
            helmet@^7.1.0 \
            express-mongo-sanitize@^2.2.0 \
            dotenv@^16.3.1

# Dev dependencies (TypeScript types)
npm install --save-dev @types/bcrypt@^5.0.2 \
                       @types/jsonwebtoken@^9.0.5 \
                       @types/passport@^1.0.16 \
                       @types/passport-jwt@^4.0.0 \
                       @types/passport-local@^1.0.38
```

#### **Frontend**

```bash
cd .. # Retour à la racine

npm install @tanstack/react-query@^5.17.0 \
            @tanstack/react-query-devtools@^5.17.0
```

### **Database Setup (MongoDB)**

**Option 1: Local MongoDB (Development)**
```bash
# Windows (avec Chocolatey)
choco install mongodb

# Start service
mongod --dbpath C:\data\db

# Verify connection
mongosh
> use a-ir-dd2-dev
> db.stats()
```

**Option 2: MongoDB Atlas (Cloud - Recommended)**
```bash
# 1. Créer compte sur mongodb.com/cloud/atlas
# 2. Créer cluster gratuit (M0)
# 3. Whitelist IP address
# 4. Créer database user
# 5. Copier connection string

# Example connection string:
mongodb+srv://username:password@cluster0.mongodb.net/a-ir-dd2?retryWrites=true&w=majority
```

---

## 🔐 JALON 1: SÉCURITÉ & ENVIRONNEMENT (Semaine 1)
**Durée**: 5-7 jours | **Criticité**: 🔴 BLOQUANTE | **Impact Guest Mode**: ✅ AUCUN

### **Objectifs**
- Configurer environnement backend sécurisé
- Créer schémas MongoDB avec validation
- Installer dépendances cryptographiques
- **GARANTIR** : Mode Guest continue de fonctionner pendant tout le jalon

### **JALON 1.1: Configuration Backend `.env`**

**Fichier**: `backend/.env` (à créer, **NEVER commit**)

```bash
# ===============================
# A-IR-DD2 Backend Configuration
# ===============================

# Database
MONGODB_URI=mongodb://localhost:27017/a-ir-dd2-dev
MONGODB_TEST_URI=mongodb://localhost:27017/a-ir-dd2-test

# Authentication JWT
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<GENERATE_64_BYTES_HEX>
JWT_EXPIRATION=24h
REFRESH_TOKEN_SECRET=<GENERATE_64_BYTES_SEPARATELY>
REFRESH_TOKEN_EXPIRATION=7d

# Encryption for API Keys
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<GENERATE_32_BYTES_HEX>

# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=10
```

**Script de génération des secrets**:

```bash
# backend/scripts/generate-secrets.js
const crypto = require('crypto');

console.log('=== A-IR-DD2 Security Keys Generator ===\n');
console.log('Copy these values to backend/.env:\n');
console.log(`JWT_SECRET=${crypto.randomBytes(64).toString('hex')}`);
console.log(`REFRESH_TOKEN_SECRET=${crypto.randomBytes(64).toString('hex')}`);
console.log(`ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`);
console.log('\n⚠️  NEVER commit these secrets to git!');
```

**Exécution**:
```bash
cd backend
node scripts/generate-secrets.js
# Copier output vers .env
```

### **JALON 1.2: Hardening `.gitignore`**

**Fichier**: `backend/.gitignore` (ajouter)

```gitignore
# Secrets (CRITICAL)
.env
.env.local
.env.*.local
*.key
*.pem

# Database
mongodb-data/
*.db
*.sqlite

# Logs (peuvent contenir tokens)
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db
```

### **JALON 1.3: Installation Dépendances**

**Fichier**: `backend/package.json` (modifications)

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "express-rate-limit": "^8.2.1",
    "socket.io": "^4.7.5",
    "mongoose": "^8.0.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "zod": "^3.22.4",
    "helmet": "^7.1.0",
    "express-mongo-sanitize": "^2.2.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.12",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/passport": "^1.0.16",
    "@types/passport-jwt": "^4.0.0",
    "@types/passport-local": "^1.0.38",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.5"
  }
}
```

**Commande d'installation**:
```bash
cd backend
npm install
```

### **JALON 1.4: Schémas Mongoose**

**Fichier**: `backend/src/models/User.model.ts`

```typescript
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  email: string;
  password: string; // Hash uniquement
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: [true, 'Mot de passe requis'],
    minlength: [8, 'Minimum 8 caractères']
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'viewer'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Middleware: Hash password avant sauvegarde
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS || '10'));
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode: Vérifier mot de passe
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
```

**Fichier**: `backend/src/models/Workflow.model.ts` *(NOUVEAU - Jalon 3)*

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflow extends Document {
  userId: mongoose.Types.ObjectId; // FK → User
  name: string;
  description?: string;
  isActive: boolean; // Un seul actif par user
  isDirty: boolean; // Détection modifications non sauvegardées
  lastSavedAt?: Date;
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
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isDirty: {
    type: Boolean,
    default: false
  },
  lastSavedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index composés pour queries optimisées
WorkflowSchema.index({ userId: 1, isActive: 1 }); // Trouver workflow actif
WorkflowSchema.index({ userId: 1, updatedAt: -1 }); // Listing chronologique

export const Workflow = mongoose.model<IWorkflow>('Workflow', WorkflowSchema);
```

---

**Fichier**: `backend/src/models/WorkflowEdge.model.ts` *(NOUVEAU - Jalon 3)*

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflowEdge extends Document {
  workflowId: mongoose.Types.ObjectId; // FK → Workflow
  userId: mongoose.Types.ObjectId; // FK → User
  sourceInstanceId: mongoose.Types.ObjectId; // FK → AgentInstance
  targetInstanceId: mongoose.Types.ObjectId; // FK → AgentInstance
  sourceHandle?: string;
  targetHandle?: string;
  edgeType?: string; // 'default' | 'step' | 'smoothstep' | 'straight'
  animated?: boolean;
  label?: string;
  createdAt: Date;
  updatedAt: Date;
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
    required: true,
    index: true
  },
  targetInstanceId: {
    type: Schema.Types.ObjectId,
    ref: 'AgentInstance',
    required: true,
    index: true
  },
  sourceHandle: String,
  targetHandle: String,
  edgeType: {
    type: String,
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

// Index pour queries par workflow
WorkflowEdgeSchema.index({ workflowId: 1 });
WorkflowEdgeSchema.index({ sourceInstanceId: 1 });
WorkflowEdgeSchema.index({ targetInstanceId: 1 });

export const WorkflowEdge = mongoose.model<IWorkflowEdge>('WorkflowEdge', WorkflowEdgeSchema);
```

---

**Fichier**: `backend/src/models/AgentPrototype.model.ts` *(RENOMMÉ depuis Agent.model.ts - Jalon 3)*

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IAgentPrototype extends Document {
  userId: mongoose.Types.ObjectId; // FK → User (ownership)
  robotId: string; // RobotId (metadata seulement, pas de restriction)
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
  robotId: {
    type: String,
    required: true,
    enum: ['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001'],
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  role: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  systemPrompt: {
    type: String,
    required: true,
    minlength: 1
  },
  llmProvider: {
    type: String,
    required: true
  },
  llmModel: {
    type: String,
    required: true
  },
  capabilities: [{
    type: String
  }],
  historyConfig: Schema.Types.Mixed,
  tools: [Schema.Types.Mixed],
  outputConfig: Schema.Types.Mixed,
  isPrototype: {
    type: Boolean,
    default: true,
    immutable: true
  }
}, {
  timestamps: true
});

// Index composés pour queries optimisées
AgentPrototypeSchema.index({ userId: 1, createdAt: -1 });
AgentPrototypeSchema.index({ userId: 1, robotId: 1 });

export const AgentPrototype = mongoose.model<IAgentPrototype>('AgentPrototype', AgentPrototypeSchema);
```

**Fichier**: `backend/src/models/LLMConfig.model.ts`

```typescript
import mongoose, { Document, Schema } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface ILLMConfig extends Document {
  userId: mongoose.Types.ObjectId;
  provider: string;
  enabled: boolean;
  apiKeyEncrypted: string;
  capabilities: Record<string, boolean>;
  updatedAt: Date;
  getDecryptedApiKey(): string;
  setApiKey(plainKey: string): void;
}

const LLMConfigSchema = new Schema<ILLMConfig>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  apiKeyEncrypted: {
    type: String,
    required: true
  },
  capabilities: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Unique constraint: 1 config par provider par user
LLMConfigSchema.index({ userId: 1, provider: 1 }, { unique: true });

// Méthode: Déchiffrer API key
LLMConfigSchema.methods.getDecryptedApiKey = function(): string {
  return decrypt(this.apiKeyEncrypted, this.userId.toString());
};

// Méthode: Chiffrer et stocker API key
LLMConfigSchema.methods.setApiKey = function(plainKey: string): void {
  this.apiKeyEncrypted = encrypt(plainKey, this.userId.toString());
};

export const LLMConfig = mongoose.model<ILLMConfig>('LLMConfig', LLMConfigSchema);
```

**Fichier**: `backend/src/models/AgentInstance.model.ts` *(MODIFIÉ - Jalon 3)*

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IAgentInstance extends Document {
  workflowId: mongoose.Types.ObjectId; // FK → Workflow (LOCAL scope)
  userId: mongoose.Types.ObjectId; // FK → User (ownership)
  prototypeId?: mongoose.Types.ObjectId; // FK → AgentPrototype (optional)
  
  // SNAPSHOT CONFIG (copie indépendante du prototype)
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
  
  createdAt: Date;
  updatedAt: Date;
}

const AgentInstanceSchema = new Schema<IAgentInstance>({
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
  prototypeId: {
    type: Schema.Types.ObjectId,
    ref: 'AgentPrototype',
    index: true
  },
  
  // SNAPSHOT CONFIG
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  systemPrompt: {
    type: String,
    required: true
  },
  llmProvider: {
    type: String,
    required: true
  },
  llmModel: {
    type: String,
    required: true
  },
  capabilities: [String],
  historyConfig: Schema.Types.Mixed,
  tools: [Schema.Types.Mixed],
  outputConfig: Schema.Types.Mixed,
  robotId: {
    type: String,
    required: true,
    enum: ['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001']
  },
  
  // Canvas properties
  position: {
    type: {
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    },
    required: true
  },
  isMinimized: {
    type: Boolean,
    default: false
  },
  isMaximized: {
    type: Boolean,
    default: false
  },
  configurationJson: {
    type: Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

// Cascade delete: supprimer instances si prototype supprimé
AgentInstanceSchema.index({ prototypeId: 1 });

export const AgentInstance = mongoose.model<IAgentInstance>('AgentInstance', AgentInstanceSchema);
```

### **Livrables Jalon 1**
- ✅ `.env` configuré avec secrets générés
- ✅ `.gitignore` sécurisé
- ✅ Dépendances installées (Mongoose, bcrypt, JWT, Zod, etc.)
- ✅ 4 schémas Mongoose créés (User, Agent, LLMConfig, AgentInstance)
- ✅ Script de génération de secrets

### **Checklist Sécurité Jalon 1**
- [ ] `.env` exclu du git (vérifier `.gitignore`)
- [ ] Secrets générés avec crypto.randomBytes (pas de valeurs par défaut)
- [ ] Schémas Mongoose avec validation stricte
- [ ] Index DB créés pour performance
- [ ] **TEST NON-RÉGRESSION** : Frontend Guest mode fonctionne toujours

---

## 🔑 JALON 2: BACKEND AUTHENTIFICATION (Semaine 2)
**Durée**: 6-8 jours | **Criticité**: 🔴 BLOQUANTE | **Impact Guest Mode**: ✅ AUCUN

### **Objectifs**
- Implémenter système JWT complet
- Créer routes `/api/auth/*`
- Middleware Passport.js
- Utilitaires cryptographiques
- **GARANTIR** : Backend démarre sans impacter frontend actuel

### **JALON 2.1: Utilitaires Cryptographiques**

**Fichier**: `backend/src/utils/encryption.ts`

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

if (!MASTER_KEY || MASTER_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
}

/**
 * Chiffre une donnée sensible (API key)
 * Format retourné: iv:salt:authTag:encryptedData
 */
export const encrypt = (text: string, userId: string): string => {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(64);
  
  // Dérivation clé avec PBKDF2
  const key = crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, 32, 'sha512');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${salt.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Déchiffre une donnée chiffrée
 */
export const decrypt = (encrypted: string, userId: string): string => {
  const [ivHex, saltHex, authTagHex, encryptedText] = encrypted.split(':');
  
  if (!ivHex || !saltHex || !authTagHex || !encryptedText) {
    throw new Error('Invalid encrypted format');
  }
  
  const iv = Buffer.from(ivHex, 'hex');
  const salt = Buffer.from(saltHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const key = crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, 32, 'sha512');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
```

**Fichier**: `backend/src/utils/jwt.ts`

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const REFRESH_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '7d';

if (!JWT_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT secrets not configured in .env');
}

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: string;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRATION });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, REFRESH_SECRET) as JWTPayload;
};
```

### **JALON 2.2: Middleware Authentification**

**Fichier**: `backend/src/middleware/auth.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { User } from '../models/User.model';

// Configuration Passport JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.sub);
        if (!user || !user.isActive) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Middleware: Requiert authentification
export const requireAuth = passport.authenticate('jwt', { session: false });

// Middleware: Vérification rôle
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const user = req.user as any;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }
    
    next();
  };
};

// Middleware: Vérification propriétaire ressource
export const requireOwnership = (getUserIdFromRequest: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const user = req.user as any;
    const resourceUserId = getUserIdFromRequest(req);
    
    if (user.id !== resourceUserId && user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    next();
  };
};
```

**Fichier**: `backend/src/middleware/validation.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation échouée',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      res.status(500).json({ error: 'Erreur validation' });
    }
  };
};
```

### **JALON 2.3: Routes Authentification**

**Fichier**: `backend/src/routes/auth.routes.ts`

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

// Schémas Zod
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, '1 majuscule requise')
    .regex(/[a-z]/, '1 minuscule requise')
    .regex(/[0-9]/, '1 chiffre requis')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// POST /api/auth/register
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Vérifier email unique
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }
    
    // Créer utilisateur (password haché par pre-save hook)
    const user = new User({ email, password, role: 'user' });
    await user.save();
    
    // Générer tokens
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ error: 'Erreur inscription' });
  }
});

// POST /api/auth/login
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Email ou mot de passe invalide' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe invalide' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Erreur connexion' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requis' });
    }
    
    const payload = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken({
      sub: payload.sub,
      email: payload.email,
      role: payload.role
    });
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Refresh token invalide' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Déconnexion réussie' });
});

export default router;
```

### **JALON 2.4: Intégration dans `server.ts`**

**Fichier**: `backend/src/server.ts` (modifications)

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import passport from 'passport';
import authRoutes from './routes/auth.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(mongoSanitize());

// Body parsing
app.use(express.json());

// Passport initialization
app.use(passport.initialize());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
```

### **Livrables Jalon 2**
- ✅ Utilitaires cryptographiques (AES-256-GCM + PBKDF2)
- ✅ Middleware JWT (Passport.js)
- ✅ Routes `/api/auth/*` (register, login, refresh, logout)
- ✅ Validation Zod
- ✅ Integration dans `server.ts`

### **Checklist Sécurité Jalon 2**
- [ ] Mots de passe hachés avec bcrypt (10 rounds)
- [ ] JWT_SECRET complexe (64+ caractères)
- [ ] Tokens JWT expiration courte (24h)
- [ ] Refresh tokens sécurisés
- [ ] **TEST** : `POST /api/auth/register` fonctionne
- [ ] **TEST** : `POST /api/auth/login` retourne JWT valide
- [ ] **TEST NON-RÉGRESSION** : Frontend Guest mode intact

---

## 📦 JALON 3: API MÉTIER & GOUVERNANCE (Semaine 2-3)
**Durée**: 12-14 jours (+5 jours corrections) | **Criticité**: 🟠 HAUTE | **Impact Guest Mode**: ✅ AUCUN

> ⚠️ **CORRECTIONS MAJEURES IMPLÉMENTÉES (Phase 1)**  
> - ❌ Gouvernance Robot stricte ABANDONNÉE → ✅ Gouvernance ownership-based  
> - ✅ Hiérarchie Workflow implémentée (User → Workflow → AgentInstance)  
> - ✅ AgentPrototype (GLOBAL) + AgentInstance (LOCAL) avec snapshot  
> - ✅ 20 endpoints créés (workflows, agent-prototypes, agent-instances)  
> - 📄 Détails : [`PERSISTANCE_SECURISEE_AUTHENTICATION_v1.1_CORRECTIONS.md`](./PERSISTANCE_SECURISEE_AUTHENTICATION_v1.1_CORRECTIONS.md)

### **Objectifs**
- ✅ **Phase 1 (COMPLÉTÉ)** : Routes Workflows, AgentPrototypes, AgentInstances avec gouvernance ownership
- ⏳ **Phase 2 (EN COURS)** : Routes LLM Configs + Proxy LLM sécurisé (SSE streaming)
- ⏳ **Phase 3** : Tests automatisés (unitaires, fonctionnels, non-régression)

### **JALON 3.1: Routes Workflows** ✅ **(IMPLÉMENTÉ - Phase 1)**

**Fichier**: `backend/src/routes/workflows.routes.ts` (246 lignes)

> 🎯 **Portée** : Gestion des canvas workflow utilisateur (1:N par user)  
> 🔐 **Gouvernance** : `requireAuth` + `requireOwnershipAsync`  
> 📊 **État** : ✅ 8 endpoints opérationnels

**Routes disponibles** :

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/workflows` | Liste workflows user + agent counts | requireAuth |
| GET | `/api/workflows/:id` | Workflow + agents + edges (composite) | requireAuth + ownership |
| POST | `/api/workflows` | Créer workflow (premier auto-active) | requireAuth |
| PUT | `/api/workflows/:id` | Mettre à jour (gère isActive toggle) | requireAuth + ownership |
| DELETE | `/api/workflows/:id` | Supprimer (cascade instances + edges) | requireAuth + ownership |
| POST | `/api/workflows/:id/save` | Marquer sauvegardé (reset isDirty) | requireAuth + ownership |
| POST | `/api/workflows/:id/mark-dirty` | Marquer modifié | requireAuth + ownership |

**Exemple requête composite** :
```typescript
// GET /api/workflows/[id]
// Response enrichie avec agents + edges
{
  "workflow": {
    "_id": "...",
    "userId": "...",
    "name": "Mon Workflow Principal",
    "isActive": true,
    "isDirty": false,
    "lastSavedAt": "2025-12-10T14:30:00Z"
  },
  "agents": [
    {
      "_id": "...",
      "workflowId": "...",
      "name": "Agent Analyste",
      "position": { "x": 100, "y": 200 },
      "robotId": "AR_001",
      // ... snapshot complet config
    }
  ],
  "edges": [
    {
      "_id": "...",
      "workflowId": "...",
      "sourceInstanceId": "...",
      "targetInstanceId": "...",
      "edgeType": "default"
    }
  ]
}
```

**Fonctionnalités clés** :
- ✅ Cascade delete : Suppression workflow → delete instances + edges
- ✅ Gestion `isDirty` : Auto-update sur modifications instances
- ✅ `isActive` : Un seul workflow actif par user (toggle automatique)
- ✅ Enrichissement : Agent count dans liste workflows

---

### **JALON 3.2: Routes Agent Prototypes** ✅ **(IMPLÉMENTÉ - Phase 1)**

**Fichier**: `backend/src/routes/agent-prototypes.routes.ts` (124 lignes)

> 🎯 **Portée** : GLOBAL (templates réutilisables, accessibles de tous workflows)  
> 🔐 **Gouvernance** : Ownership-based (PAS de restriction robotId)  
> 📊 **État** : ✅ 5 endpoints opérationnels

**Routes disponibles** :

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/agent-prototypes` | Liste prototypes user (filter robotId optionnel) | requireAuth |
| GET | `/api/agent-prototypes/:id` | Prototype spécifique | requireAuth + ownership |
| POST | `/api/agent-prototypes` | Créer prototype (AUCUNE restriction robotId) | requireAuth |
| PUT | `/api/agent-prototypes/:id` | Modifier prototype | requireAuth + ownership |
| DELETE | `/api/agent-prototypes/:id` | Supprimer (instances gardent snapshot) | requireAuth + ownership |

**⚠️ CHANGEMENT CRITIQUE vs Plan Initial** :
```typescript
// ❌ ANCIEN (SUPPRIMÉ)
// GOUVERNANCE: Vérifier que le creatorId est valide
const validCreators = ['AR_001']; // Seul Archi pouvait créer
if (!validCreators.includes(creatorId)) {
  return res.status(403).json({ error: 'Non autorisé' });
}

// ✅ NOUVEAU (IMPLÉMENTÉ)
// User authentifié peut créer avec N'IMPORTE QUEL robotId
const prototype = new AgentPrototype({
  userId: user.id,
  robotId: req.body.robotId, // Metadata, pas de restriction
  // ...
});
```

**Exemple requête** :
```typescript
// POST /api/agent-prototypes
{
  "robotId": "COM_001",  // ✅ Accepté (metadata uniquement)
  "name": "Agent API Connector",
  "role": "Connexion APIs externes",
  "systemPrompt": "Tu gères les connexions...",
  "llmProvider": "Anthropic",
  "llmModel": "claude-3-5-sonnet-20241022",
  "capabilities": ["api-calls", "oauth"],
  "tools": [...]
}

// Response
{
  "_id": "...",
  "userId": "...",
  "robotId": "COM_001",
  "name": "Agent API Connector",
  "isPrototype": true,
  "createdAt": "..."
}
```

---

### **JALON 3.3: Routes Agent Instances** ✅ **(IMPLÉMENTÉ - Phase 1)**

**Fichier**: `backend/src/routes/agent-instances.routes.ts` (216 lignes)

> 🎯 **Portée** : LOCAL (liées à UN workflow spécifique)  
> 🔐 **Gouvernance** : Ownership workflow + agent  
> 📊 **État** : ✅ 6 endpoints opérationnels

**Routes disponibles** :

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/agent-instances?workflowId=X` | Liste instances workflow (workflowId requis) | requireAuth |
| GET | `/api/agent-instances/:id` | Instance spécifique | requireAuth + ownership |
| POST | `/api/agent-instances` | Créer instance sur workflow | requireAuth |
| PUT | `/api/agent-instances/:id` | Modifier instance (auto isDirty workflow) | requireAuth + ownership |
| DELETE | `/api/agent-instances/:id` | Supprimer instance (auto isDirty workflow) | requireAuth + ownership |
| POST | `/api/agent-instances/from-prototype` | Créer depuis prototype (snapshot) | requireAuth |

**Fonctionnalités critiques** :

1. **Snapshot indépendant** :
```typescript
// POST /api/agent-instances/from-prototype
{
  "workflowId": "...",
  "prototypeId": "...",
  "position": { "x": 100, "y": 200 }
}

// Response - Instance avec SNAPSHOT COMPLET
{
  "_id": "...",
  "workflowId": "...",
  "userId": "...",
  "prototypeId": "...", // Lien optionnel
  // SNAPSHOT CONFIG (copie indépendante)
  "name": "Agent API Connector",
  "role": "Connexion APIs externes",
  "systemPrompt": "Tu gères les connexions...",
  "llmProvider": "Anthropic",
  "llmModel": "claude-3-5-sonnet-20241022",
  "capabilities": ["api-calls", "oauth"],
  "tools": [...],
  "robotId": "COM_001",
  // Canvas properties
  "position": { "x": 100, "y": 200 },
  "zIndex": 0,
  "isMinimized": false
}
```

2. **Auto isDirty workflow** :
```typescript
// PUT /api/agent-instances/:id
{
  "systemPrompt": "Nouvelle instruction..."
}

// Side-effect automatique:
// → Workflow.isDirty = true
// → Bouton "Sauvegarde" UI activé
```

3. **Validation ownership cascade** :
```typescript
// Vérifie que:
// - User authentifié = owner de l'instance
// - User authentifié = owner du workflow parent
// - (optionnel) User authentifié = owner du prototype source
```

---

### **JALON 3.4: Routes LLM Configs** ⏳ **(PHASE 2 - À VENIR)**

// DELETE /api/agents/:id - Suppression avec cascade optionnel
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { cascade } = req.query;
    
    const agent = await Agent.findOne({ _id: req.params.id, ownerId: user.id });
    if (!agent) {
      return res.status(404).json({ error: 'Agent introuvable' });
    }
    
    if (cascade === 'true') {
      // Supprimer instances liées
      const deletedCount = await AgentInstance.deleteMany({ prototypeId: agent.id });
      await agent.deleteOne();
      
      res.json({
        message: 'Agent et instances supprimés',
        deletedInstances: deletedCount.deletedCount
      });
    } else {
      // Vérifier qu'aucune instance n'existe
      const instanceCount = await AgentInstance.countDocuments({ prototypeId: agent.id });
      
      if (instanceCount > 0) {
        return res.status(409).json({
          error: 'Impossible de supprimer: instances actives existent',
          instanceCount,
          suggestion: 'Utilisez cascade=true pour forcer la suppression'
        });
      }
      
      await agent.deleteOne();
      res.json({ message: 'Agent supprimé' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur suppression agent' });
  }
});

export default router;
```

### **JALON 3.4: Routes LLM Configs** ⏳ **(PHASE 2 - À VENIR)**

**Fichier**: `backend/src/routes/llm-configs.routes.ts` *(à créer)*

> 🎯 **Portée** : GLOBAL (configs LLM accessibles de tous workflows)  
> 🔐 **Sécurité** : Chiffrement AES-256-GCM server-side (utils/encryption.ts)  
> 📊 **État** : ⏳ À implémenter (Phase 2)

**Routes à implémenter** :

| Méthode | Endpoint | Description | Sécurité |
|---------|----------|-------------|----------|
| GET | `/api/llm-configs` | Liste configs user (API keys JAMAIS retournées) | requireAuth |
| POST | `/api/llm-configs` | Créer/Mettre à jour config (upsert) | requireAuth + encrypt |
| DELETE | `/api/llm-configs/:provider` | Supprimer config | requireAuth + ownership |

**Modèle LLMConfig** (conservé du plan initial) :
```typescript
import mongoose, { Document, Schema } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface ILLMConfig extends Document {
  userId: mongoose.Types.ObjectId;
  provider: string;
  enabled: boolean;
  apiKeyEncrypted: string;
  capabilities: Record<string, boolean>;
  updatedAt: Date;
  getDecryptedApiKey(): string;
  setApiKey(plainKey: string): void;
}

const LLMConfigSchema = new Schema<ILLMConfig>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  apiKeyEncrypted: {
    type: String,
    required: true
  },
  capabilities: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Unique constraint: 1 config par provider par user
LLMConfigSchema.index({ userId: 1, provider: 1 }, { unique: true });

// Méthode: Déchiffrer API key
LLMConfigSchema.methods.getDecryptedApiKey = function(): string {
  return decrypt(this.apiKeyEncrypted, this.userId.toString());
};

// Méthode: Chiffrer et stocker API key
LLMConfigSchema.methods.setApiKey = function(plainKey: string): void {
  this.apiKeyEncrypted = encrypt(plainKey, this.userId.toString());
};

export const LLMConfig = mongoose.model<ILLMConfig>('LLMConfig', LLMConfigSchema);
```

**Routes à implémenter** :

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { LLMConfig } from '../models/LLMConfig.model';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

const upsertConfigSchema = z.object({
  provider: z.string(),
  enabled: z.boolean(),
  apiKey: z.string().min(1), // En clair, sera chiffré
  capabilities: z.record(z.boolean())
});

// GET /api/llm-configs - Configs utilisateur (API keys JAMAIS retournées)
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const configs = await LLMConfig.find({ userId: user.id });
    
    // SÉCURITÉ: Ne jamais retourner les API keys
    const safeConfigs = configs.map(c => ({
      id: c.id,
      provider: c.provider,
      enabled: c.enabled,
      capabilities: c.capabilities,
      hasApiKey: !!c.apiKeyEncrypted,
      updatedAt: c.updatedAt
    }));
    
    res.json(safeConfigs);
  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération configs' });
  }
});

// POST /api/llm-configs - Créer/Mettre à jour config
router.post('/', requireAuth, validateRequest(upsertConfigSchema), async (req, res) => {
  try {
    const user = req.user as any;
    const { provider, apiKey, ...configData } = req.body;
    
    // Upsert (create or update)
    let config = await LLMConfig.findOne({ userId: user.id, provider });
    
    if (config) {
      // Update existant
      Object.assign(config, configData);
      config.setApiKey(apiKey); // Chiffrement automatique
      await config.save();
    } else {
      // Nouveau
      config = new LLMConfig({
        userId: user.id,
        provider,
        ...configData
      });
      config.setApiKey(apiKey);
      await config.save();
    }
    
    res.json({
      id: config.id,
      provider: config.provider,
      enabled: config.enabled,
      capabilities: config.capabilities,
      hasApiKey: true
    });
  } catch (error) {
    console.error('[LLMConfig] POST error:', error);
    res.status(500).json({ error: 'Erreur sauvegarde config' });
  }
});

// DELETE /api/llm-configs/:provider
router.delete('/:provider', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const provider = req.params.provider;
    
    const result = await LLMConfig.deleteOne({ userId: user.id, provider });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Config introuvable' });
    }
    
    res.json({ message: 'Config supprimée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur suppression config' });
  }
});

export default router;
```

### **JALON 3.5: Proxy LLM Sécurisé** ⏳ **(PHASE 2 - À VENIR)**

**Fichier**: `backend/src/routes/llm-proxy.routes.ts` *(à créer)*

> 🎯 **Objectif** : Router LLM requests via backend (API keys jamais exposées client)  
> 🔐 **Sécurité** : Déchiffrement API keys server-side uniquement  
> 📊 **État** : ⏳ À implémenter (Phase 2)

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { LLMConfig } from '../models/LLMConfig.model';

const router = Router();

// POST /api/llm/stream - Chat avec streaming (proxy sécurisé)
router.post('/stream', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { provider, model, messages, systemPrompt, tools, nativeToolsConfig } = req.body;
    
    // Récupérer config LLM de l'utilisateur
    const config = await LLMConfig.findOne({ userId: user.id, provider });
    if (!config || !config.enabled) {
      return res.status(403).json({ error: 'Provider non configuré' });
    }
    
    // Déchiffrer API key côté serveur
    const apiKey = config.getDecryptedApiKey();
    
    // Headers pour streaming SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx compatibility
    
    // Router vers le bon service LLM
    // Import dynamique pour éviter circular dependencies
    let streamGenerator;
    
    switch (provider) {
      case 'Gemini': {
        const { generateContentStream } = await import('../services/geminiProxy.service');
        streamGenerator = generateContentStream(apiKey, model, systemPrompt, messages, tools);
        break;
      }
      case 'OpenAI': {
        const { generateContentStream } = await import('../services/openaiProxy.service');
        streamGenerator = generateContentStream(apiKey, model, systemPrompt, messages, tools);
        break;
      }
      case 'Anthropic': {
        const { generateContentStream } = await import('../services/anthropicProxy.service');
        streamGenerator = generateContentStream(apiKey, model, systemPrompt, messages, tools, nativeToolsConfig);
        break;
      }
      // Ajouter autres providers...
      default:
        return res.status(400).json({ error: 'Provider non supporté' });
    }
    
    // Streamer les chunks au client
    for await (const chunk of streamGenerator) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
    
  } catch (error) {
    console.error('[LLM Proxy] Stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur streaming LLM' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
});

export default router;
```

### **JALON 3.4: Integration Routes dans `server.ts`**

```typescript
// backend/src/server.ts (ajout routes)
import authRoutes from './routes/auth.routes';
import agentsRoutes from './routes/agents.routes';
import llmConfigsRoutes from './routes/llm-configs.routes';
import llmProxyRoutes from './routes/llm-proxy.routes';

// ... existing code ...

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/llm-configs', llmConfigsRoutes);
app.use('/api/llm', llmProxyRoutes);
```

### **Livrables Jalon 3**

#### **✅ Phase 1 - COMPLÉTÉ** (10 Décembre 2025)
- ✅ Modèle `Workflow` (51 lignes, indexes optimisés)
- ✅ Modèle `WorkflowEdge` (65 lignes)
- ✅ Modèle `AgentPrototype` (84 lignes, renommé depuis Agent)
- ✅ Modèle `AgentInstance` modifié (workflowId + snapshot complet)
- ✅ Middleware `requireOwnershipAsync` (async MongoDB queries)
- ✅ Routes `/api/workflows` (246 lignes, 8 endpoints)
- ✅ Routes `/api/agent-prototypes` (124 lignes, 5 endpoints)
- ✅ Routes `/api/agent-instances` (216 lignes, 6 endpoints)
- ✅ Suppression gouvernance Robot stricte (2 fichiers)
- ✅ Intégration server.ts (montage routes)
- ✅ Build TypeScript 0 erreurs
- ✅ Commit Git : `f416e3f` (11 fichiers, 889 insertions, 105 suppressions)

#### **⏳ Phase 2 - EN COURS**
- ⏳ Modèle `LLMConfig` (chiffrement AES-256-GCM)
- ⏳ Routes `/api/llm-configs` (GET, POST, DELETE avec encryption)
- ⏳ Routes `/api/llm/stream` (proxy SSE streaming)
- ⏳ Routes `/api/llm/generate` (proxy non-streaming)
- ⏳ Utilisation `utils/encryption.ts` existant

#### **⏳ Phase 3 - TESTS**
- ⏳ Tests unitaires modèles (Workflow, AgentInstance, middlewares)
- ⏳ Tests fonctionnels routes (workflows CRUD, instances CRUD)
- ⏳ Tests non-régression (Guest mode préservé)

### **Checklist Sécurité Jalon 3**

#### **✅ Phase 1 - Validé**
- ✅ Tous endpoints protégés par `requireAuth`
- ✅ Ownership checks avec `requireOwnershipAsync`
- ✅ Filter par `userId` sur toutes queries
- ✅ Cascade delete workflows (instances + edges)
- ✅ Snapshot indépendant AgentInstance
- ✅ **TEST MANUEL** : `GET /api/workflows` fonctionne
- ✅ **TEST MANUEL** : `POST /api/agent-prototypes` accepte tous robotId
- ✅ **BUILD** : TypeScript 0 erreurs

#### **⏳ Phase 2 - À Valider**
- [ ] API keys chiffrées AES-256-GCM
- [ ] API keys JAMAIS retournées déchiffrées
- [ ] SSE streaming opérationnel
- [ ] **TEST** : `POST /api/llm-configs` chiffre API key
- [ ] **TEST** : `POST /api/llm/stream` stream sans exposer API key
- [ ] **TEST NON-RÉGRESSION** : Frontend Guest mode intact

---

## 🎨 JALON 4: FRONTEND - MODE HYBRIDE (Semaine 3-4)
**Durée**: 8-10 jours | **Criticité**: 🔴 CRITIQUE | **Impact Guest Mode**: ⚠️ MODIFICATIONS MAJEURES

### **⚠️ ATTENTION : Zone à Risque de Régression**

Ce jalon modifie le frontend. **TEST DE NON-RÉGRESSION OBLIGATOIRE** après chaque composant modifié.

### **Objectifs**
- Installer React Query
- Créer Auth Context (isAuthenticated state)
- Modifier composants pour routage conditionnel (localStorage vs API)
- Header avec menu Guest/Authenticated
- **GARANTIR** : Mode Guest fonctionne identiquement

### **JALON 4.1: Installation & Setup React Query**

```bash
cd .. # Retour racine
npm install @tanstack/react-query@^5.17.0 @tanstack/react-query-devtools@^5.17.0
```

**Fichier**: `src/providers/QueryProvider.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

export const QueryProvider = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
```

### **JALON 4.2: Auth Context**

**Fichier**: `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'auth_data';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger auth depuis localStorage au démarrage
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const { user, accessToken, refreshToken } = JSON.parse(stored);
        setUser(user);
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
      } catch (error) {
        console.error('Error loading auth data:', error);
      }
    }
    setIsLoading(false);
  }, []);

  // Sauvegarder auth dans localStorage
  const saveAuthData = (user: User, accessToken: string, refreshToken: string) => {
    setUser(user);
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, accessToken, refreshToken }));
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur connexion');
    }

    const { user, accessToken, refreshToken } = await response.json();
    saveAuthData(user, accessToken, refreshToken);
  };

  const register = async (email: string, password: string) => {
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur inscription');
    }

    const { user, accessToken, refreshToken } = await response.json();
    saveAuthData(user, accessToken, refreshToken);
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### **JALON 4.3: Integration Providers dans `App.tsx`**

```typescript
// App.tsx (modifications)
import { AuthProvider } from './contexts/AuthContext';
import { QueryProvider } from './providers/QueryProvider';

function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <LocalizationProvider>
          <NotificationProvider>
            {/* ... existing app structure ... */}
          </NotificationProvider>
        </LocalizationProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
```

### **JALON 4.4: Header avec Menu Auth**

**Fichier**: `components/Header.tsx` (modifications)

```typescript
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { LoginModal } from './modals/LoginModal';
import { RegisterModal } from './modals/RegisterModal';

export const Header = ({ /* existing props */ }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo / Titre */}
        <h1 className="text-xl font-bold text-white">A-IR-DD2</h1>

        {/* Menu Auth */}
        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            // MODE GUEST
            <>
              <span className="text-gray-400 text-sm">Mode Invité</span>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition"
              >
                Connexion
              </button>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
              >
                Inscription
              </button>
            </>
          ) : (
            // MODE AUTHENTICATED
            <>
              <span className="text-gray-300 text-sm">{user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition"
              >
                Déconnexion
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
      {showRegisterModal && (
        <RegisterModal onClose={() => setShowRegisterModal(false)} />
      )}
    </header>
  );
};
```

---

### **JALON 4.5: Modals Login & Register**

**Fichier**: `src/components/modals/LoginModal.tsx`

```typescript
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Modal, Button } from '../UI';
import { CloseIcon } from '../Icons';

interface LoginModalProps {
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Connexion</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              required
              autoComplete="current-password"
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </Modal>
  );
};
```

**Fichier**: `src/components/modals/RegisterModal.tsx`

```typescript
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Modal, Button } from '../UI';
import { CloseIcon } from '../Icons';

interface RegisterModalProps {
  onClose: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ onClose }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Minimum 8 caractères';
    if (!/[A-Z]/.test(pwd)) return '1 majuscule requise';
    if (!/[a-z]/.test(pwd)) return '1 minuscule requise';
    if (!/[0-9]/.test(pwd)) return '1 chiffre requis';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation côté client
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Inscription</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-400 mt-1">
              Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirmer mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              required
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Inscription...' : 'S\'inscrire'}
          </Button>
        </form>
      </div>
    </Modal>
  );
};
```

### **JALON 4.6: Hook API Agents (React Query)**

**Fichier**: `src/hooks/useAgentsAPI.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Agent } from '../types';

const API_URL = 'http://localhost:3001/api';

export const useAgentsAPI = () => {
  const { accessToken, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // GET /api/agents
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/agents`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!response.ok) throw new Error('Erreur chargement agents');
      return response.json();
    },
    enabled: isAuthenticated
  });

  // POST /api/agents
  const createAgent = useMutation({
    mutationFn: async (agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await fetch(`${API_URL}/agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur création agent');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    }
  });

  // PATCH /api/agents/:id
  const updateAgent = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Agent> }) => {
      const response = await fetch(`${API_URL}/agents/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Erreur modification agent');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    }
  });

  // DELETE /api/agents/:id
  const deleteAgent = useMutation({
    mutationFn: async ({ id, cascade }: { id: string; cascade?: boolean }) => {
      const url = cascade ? `${API_URL}/agents/${id}?cascade=true` : `${API_URL}/agents/${id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur suppression agent');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    }
  });

  return {
    agents,
    isLoading,
    createAgent,
    updateAgent,
    deleteAgent
  };
};
```

### **JALON 4.7: Routage Conditionnel (Mode Hybride)**

**Fichier**: `src/stores/useDesignStore.ts` (modifications pour mode hybride)

```typescript
import { create } from 'zustand';
import { Agent, V2WorkflowNode, V2WorkflowEdge, RobotId, AgentInstance } from '../types';
import { GovernanceService } from '../services/governanceService';

interface DesignStore {
  // ... existing interface ...
  
  // NOUVEAU: Mode de fonctionnement
  isUsingAPI: boolean;
  setIsUsingAPI: (value: boolean) => void;
}

export const useDesignStore = create<DesignStore>((set, get) => ({
  // ... existing state ...
  isUsingAPI: false,
  
  setIsUsingAPI: (value) => set({ isUsingAPI: value }),
  
  // Agent actions - MODE HYBRIDE
  addAgent: (agentData) => {
    const state = get();
    
    // Si mode API, ne pas ajouter localement (sera géré par React Query)
    if (state.isUsingAPI) {
      console.log('[DesignStore] API mode: agent will be created via API');
      return { success: true, agentId: 'pending' };
    }
    
    // MODE GUEST: Logique actuelle (gouvernance client-side)
    const validation = GovernanceService.enforceGovernance(
      agentData as any,
      'agent',
      'create',
      state.currentRobotId
    );
    
    if (!validation.success) {
      return validation;
    }
    
    const agent: Agent = {
      ...agentData,
      id: `agent-${Date.now()}`,
      creator_id: state.currentRobotId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Agent;
    
    set((state) => ({
      agents: [...state.agents, agent],
      selectedAgentId: agent.id
    }));
    
    return { success: true, agentId: agent.id };
  },
  
  // ... other actions with similar hybrid logic ...
}));
```

**Fichier**: `src/components/ArchiPrototypingPage.tsx` (modifications)

```typescript
import { useAuth } from '../contexts/AuthContext';
import { useAgentsAPI } from '../hooks/useAgentsAPI';
import { useDesignStore } from '../stores/useDesignStore';

export const ArchiPrototypingPage: React.FC<ArchiPrototypingPageProps> = ({
  llmConfigs,
  onNavigateToWorkflow,
  onAddToWorkflow,
  onDeleteNodes
}) => {
  const { isAuthenticated } = useAuth();
  const { t } = useLocalization();
  const { addNotification } = useNotifications();
  
  // MODE HYBRIDE: Choisir source de données
  const {
    agents: agentsFromStore,
    addAgent: addAgentToStore,
    updateAgent: updateAgentInStore,
    deleteAgent: deleteAgentFromStore,
    setIsUsingAPI
  } = useDesignStore();
  
  const {
    agents: agentsFromAPI,
    isLoading: apiLoading,
    createAgent: createAgentAPI,
    updateAgent: updateAgentAPI,
    deleteAgent: deleteAgentAPI
  } = useAgentsAPI();
  
  // Définir mode de fonctionnement
  useEffect(() => {
    setIsUsingAPI(isAuthenticated);
  }, [isAuthenticated, setIsUsingAPI]);
  
  // Sélectionner source de données
  const agents = isAuthenticated ? agentsFromAPI : agentsFromStore;
  const isLoading = isAuthenticated ? apiLoading : false;
  
  // Handler hybride: Création agent
  const handleSaveAgent = async (agentData: Omit<Agent, 'id'>, agentId?: string) => {
    try {
      if (isAuthenticated) {
        // MODE AUTHENTICATED: API call
        if (agentId) {
          // Update
          await updateAgentAPI.mutateAsync({ id: agentId, updates: agentData });
          addNotification('Agent modifié avec succès', 'success');
        } else {
          // Create
          await createAgentAPI.mutateAsync(agentData as any);
          addNotification('Agent créé et sauvegardé dans le cloud', 'success');
        }
      } else {
        // MODE GUEST: Zustand store (logique actuelle)
        if (agentId) {
          updateAgentInStore(agentId, agentData);
          addNotification('Agent modifié (local uniquement)', 'info');
        } else {
          const result = addAgentToStore(agentData as any);
          if (result.success) {
            addNotification('Agent créé (local uniquement - non persisté)', 'warning');
          } else {
            addNotification(result.error || 'Erreur création', 'error');
          }
        }
      }
    } catch (error: any) {
      addNotification(error.message || 'Erreur sauvegarde agent', 'error');
    }
  };
  
  // Handler hybride: Suppression agent
  const handleDeleteAgent = async (agentId: string, cascade: boolean = false) => {
    try {
      if (isAuthenticated) {
        // MODE AUTHENTICATED: API call
        await deleteAgentAPI.mutateAsync({ id: agentId, cascade });
        addNotification('Agent supprimé', 'success');
      } else {
        // MODE GUEST: Zustand store
        const result = deleteAgentFromStore(agentId, { deleteInstances: cascade });
        if (result.success) {
          addNotification('Agent supprimé (local)', 'info');
        } else {
          addNotification(result.error || 'Erreur suppression', 'error');
        }
      }
    } catch (error: any) {
      addNotification(error.message || 'Erreur suppression', 'error');
    }
  };
  
  // ... rest of component with hybrid handlers ...
};
```

### **Livrables Jalon 4**
- ✅ React Query installé et configuré
- ✅ Auth Context avec login/register/logout
- ✅ Modals Login & Register
- ✅ Header avec menu Guest/Authenticated
- ✅ Hook `useAgentsAPI` avec React Query
- ✅ Routage conditionnel dans stores et composants

### **Checklist Non-Régression Jalon 4**
- [ ] **Mode Guest fonctionne identiquement** (localStorage + Zustand)
- [ ] Création agent Guest → Zustand store (volatile)
- [ ] LLM configs Guest → localStorage
- [ ] Chat Guest → Client-side avec API keys localStorage
- [ ] Mode Authenticated → API calls avec JWT
- [ ] Transition Guest→Auth fluide (sans perte données si migration)

---

## 🔄 JALON 5: MIGRATION DONNÉES (Semaine 4)
**Durée**: 5-7 jours | **Criticité**: 🟡 MOYENNE | **Impact Guest Mode**: ✅ AUCUN

### **Objectifs**
- Wizard de migration localStorage → MongoDB
- Export/Import automatique
- Rollback en cas d'échec
- **Optionnel** : Ne bloque pas Guest mode

### **JALON 5.1: Endpoint Backend Migration**

**Fichier**: `backend/src/routes/migration.routes.ts`

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { Agent } from '../models/Agent.model';
import { LLMConfig } from '../models/LLMConfig.model';

const router = Router();

// POST /api/migration/import - Import localStorage data
router.post('/import', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    const { llmConfigs, agents, templates } = req.body;
    
    const results = {
      llmConfigs: { imported: 0, errors: [] as string[] },
      agents: { imported: 0, errors: [] as string[] },
      templates: { imported: 0, errors: [] as string[] }
    };
    
    // Import LLM Configs
    if (llmConfigs && Array.isArray(llmConfigs)) {
      for (const config of llmConfigs) {
        try {
          const existing = await LLMConfig.findOne({ 
            userId: user.id, 
            provider: config.provider 
          });
          
          if (existing) {
            // Update existing
            Object.assign(existing, {
              enabled: config.enabled,
              capabilities: config.capabilities
            });
            if (config.apiKey) {
              existing.setApiKey(config.apiKey);
            }
            await existing.save();
          } else {
            // Create new
            const newConfig = new LLMConfig({
              userId: user.id,
              provider: config.provider,
              enabled: config.enabled,
              capabilities: config.capabilities || {}
            });
            if (config.apiKey) {
              newConfig.setApiKey(config.apiKey);
            }
            await newConfig.save();
          }
          
          results.llmConfigs.imported++;
        } catch (error: any) {
          results.llmConfigs.errors.push(`${config.provider}: ${error.message}`);
        }
      }
    }
    
    // Import Agents
    if (agents && Array.isArray(agents)) {
      for (const agent of agents) {
        try {
          const newAgent = new Agent({
            name: agent.name,
            role: agent.role,
            systemPrompt: agent.systemPrompt,
            llmProvider: agent.llmProvider,
            model: agent.model,
            capabilities: agent.capabilities || [],
            historyConfig: agent.historyConfig,
            tools: agent.tools,
            outputConfig: agent.outputConfig,
            creatorId: agent.creator_id || 'AR_001',
            ownerId: user.id
          });
          
          await newAgent.save();
          results.agents.imported++;
        } catch (error: any) {
          results.agents.errors.push(`${agent.name}: ${error.message}`);
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Migration terminée',
      results
    });
    
  } catch (error) {
    console.error('[Migration] Import error:', error);
    res.status(500).json({ error: 'Erreur migration' });
  }
});

// GET /api/migration/export - Export current user data
router.get('/export', requireAuth, async (req, res) => {
  try {
    const user = req.user as any;
    
    const agents = await Agent.find({ ownerId: user.id });
    const llmConfigs = await LLMConfig.find({ userId: user.id });
    
    // Ne pas exposer les API keys
    const safeConfigs = llmConfigs.map(c => ({
      provider: c.provider,
      enabled: c.enabled,
      capabilities: c.capabilities,
      hasApiKey: !!c.apiKeyEncrypted
    }));
    
    res.json({
      agents,
      llmConfigs: safeConfigs,
      exportDate: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Migration] Export error:', error);
    res.status(500).json({ error: 'Erreur export' });
  }
});

export default router;
```

### **JALON 5.2: Wizard Frontend Migration**

**Fichier**: `src/components/modals/MigrationWizard.tsx`

```typescript
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Modal, Button } from '../UI';

interface MigrationWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export const MigrationWizard: React.FC<MigrationWizardProps> = ({ onClose, onComplete }) => {
  const { accessToken } = useAuth();
  const [step, setStep] = useState<'intro' | 'analyzing' | 'confirm' | 'migrating' | 'success' | 'error'>('intro');
  const [localData, setLocalData] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const analyzeLocalStorage = () => {
    setStep('analyzing');
    
    try {
      const llmConfigsRaw = localStorage.getItem('llmAgentWorkflow_configs');
      const templatesRaw = localStorage.getItem('custom_agent_templates');
      const workflowsRaw = localStorage.getItem('workflow-editor-data');
      
      const data = {
        llmConfigs: llmConfigsRaw ? JSON.parse(llmConfigsRaw) : [],
        templates: templatesRaw ? JSON.parse(templatesRaw) : [],
        workflows: workflowsRaw ? JSON.parse(workflowsRaw) : null
      };
      
      setLocalData(data);
      setStep('confirm');
    } catch (err) {
      setError('Erreur analyse données locales');
      setStep('error');
    }
  };

  const executeMigration = async () => {
    setStep('migrating');
    
    try {
      const response = await fetch('http://localhost:3001/api/migration/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(localData)
      });
      
      if (!response.ok) {
        throw new Error('Erreur migration');
      }
      
      const results = await response.json();
      setResults(results);
      setStep('success');
      
      // Optionnel: Nettoyer localStorage après succès
      // localStorage.removeItem('llmAgentWorkflow_configs');
      // localStorage.removeItem('custom_agent_templates');
      
    } catch (err: any) {
      setError(err.message || 'Erreur migration');
      setStep('error');
    }
  };

  return (
    <Modal isOpen onClose={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
        {step === 'intro' && (
          <>
            <h2 className="text-xl font-bold text-white mb-4">
              🔄 Migration de vos données
            </h2>
            <p className="text-gray-300 mb-4">
              Importez vos configurations et agents depuis le stockage local vers votre compte cloud.
            </p>
            <ul className="text-sm text-gray-400 mb-6 space-y-2">
              <li>✅ Vos API keys seront chiffrées</li>
              <li>✅ Accès multi-device</li>
              <li>✅ Sauvegarde automatique</li>
              <li>⚠️ Vos données locales seront préservées</li>
            </ul>
            <div className="flex gap-3">
              <Button onClick={analyzeLocalStorage}>
                Commencer la migration
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Plus tard
              </Button>
            </div>
          </>
        )}
        
        {step === 'analyzing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Analyse des données locales...</p>
          </div>
        )}
        
        {step === 'confirm' && localData && (
          <>
            <h2 className="text-xl font-bold text-white mb-4">
              📊 Données détectées
            </h2>
            <div className="space-y-3 mb-6">
              <div className="p-3 bg-gray-700 rounded">
                <span className="text-white font-medium">Configurations LLM:</span>
                <span className="text-gray-300 ml-2">{localData.llmConfigs.length}</span>
              </div>
              <div className="p-3 bg-gray-700 rounded">
                <span className="text-white font-medium">Templates:</span>
                <span className="text-gray-300 ml-2">{localData.templates.length}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={executeMigration}>
                Migrer maintenant
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Annuler
              </Button>
            </div>
          </>
        )}
        
        {step === 'migrating' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Migration en cours...</p>
          </div>
        )}
        
        {step === 'success' && results && (
          <>
            <h2 className="text-xl font-bold text-green-400 mb-4">
              ✅ Migration réussie !
            </h2>
            <div className="space-y-2 mb-6">
              <p className="text-gray-300">
                LLM Configs importées: {results.results.llmConfigs.imported}
              </p>
              <p className="text-gray-300">
                Agents importés: {results.results.agents.imported}
              </p>
            </div>
            <Button onClick={() => { onComplete(); onClose(); }}>
              Fermer
            </Button>
          </>
        )}
        
        {step === 'error' && (
          <>
            <h2 className="text-xl font-bold text-red-400 mb-4">
              ❌ Erreur de migration
            </h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="flex gap-3">
              <Button onClick={() => setStep('intro')}>
                Réessayer
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
```

### **JALON 5.3: Trigger Migration après Login**

```typescript
// App.tsx ou AuthContext - Proposition migration
useEffect(() => {
  if (isAuthenticated && !hasSeenMigrationWizard) {
    const hasLocalData = localStorage.getItem('llmAgentWorkflow_configs');
    if (hasLocalData) {
      setShowMigrationWizard(true);
    }
  }
}, [isAuthenticated]);
```

### **Livrables Jalon 5**
- ✅ Endpoint `/api/migration/import`
- ✅ Endpoint `/api/migration/export`
- ✅ Wizard migration frontend
- ✅ Détection automatique données locales
- ✅ Préservation localStorage (rollback possible)

---

## 🔌 JALON 6: WEBSOCKET TEMPS RÉEL (Semaine 5)
**Durée**: 4-6 jours | **Criticité**: 🟢 BASSE | **Impact Guest Mode**: ✅ AUCUN

### **Objectifs**
- Sync temps réel entre utilisateurs (futur collaboration)
- Events: agent créé/modifié/supprimé
- **Optionnel** : Amélioration UX mode Authenticated

### **JALON 6.1: Backend WebSocket Events**

**Fichier**: `backend/src/services/websocket.service.ts`

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyAccessToken } from '../utils/jwt';

export class WebSocketService {
  private io: SocketIOServer;
  
  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
      }
    });
    
    this.setupAuthentication();
    this.setupEventHandlers();
  }
  
  private setupAuthentication() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      try {
        const payload = verifyAccessToken(token);
        (socket as any).userId = payload.sub;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }
  
  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = (socket as any).userId;
      console.log(`User ${userId} connected via WebSocket`);
      
      // Joindre room personnel
      socket.join(`user:${userId}`);
      
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
      });
    });
  }
  
  // Broadcast events
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
  
  public emitAgentCreated(userId: string, agent: any) {
    this.emitToUser(userId, 'agent:created', agent);
  }
  
  public emitAgentUpdated(userId: string, agent: any) {
    this.emitToUser(userId, 'agent:updated', agent);
  }
  
  public emitAgentDeleted(userId: string, agentId: string) {
    this.emitToUser(userId, 'agent:deleted', { agentId });
  }
}
```

### **JALON 6.2: Integration Backend**

```typescript
// backend/src/server.ts
import { createServer } from 'http';
import { WebSocketService } from './services/websocket.service';

const httpServer = createServer(app);
const wsService = new WebSocketService(httpServer);

// Rendre accessible dans routes
app.set('wsService', wsService);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server with WebSocket on http://localhost:${PORT}`);
});
```

```typescript
// backend/src/routes/agents.routes.ts - Emit events
router.post('/', requireAuth, validateRequest(createAgentSchema), async (req, res) => {
  // ... creation logic ...
  await agent.save();
  
  // Emit WebSocket event
  const wsService = req.app.get('wsService');
  wsService.emitAgentCreated(user.id, agent);
  
  res.status(201).json(agent);
});
```

### **JALON 6.3: Frontend WebSocket Hook**

**Fichier**: `src/hooks/useWebSocketSync.ts`

```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const useWebSocketSync = () => {
  const { accessToken, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    
    // Connexion WebSocket
    socket = io('http://localhost:3001', {
      auth: { token: accessToken }
    });
    
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    // Écouter events agents
    socket.on('agent:created', (agent) => {
      console.log('Agent created remotely:', agent);
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    });
    
    socket.on('agent:updated', (agent) => {
      console.log('Agent updated remotely:', agent);
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    });
    
    socket.on('agent:deleted', ({ agentId }) => {
      console.log('Agent deleted remotely:', agentId);
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    });
    
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
    
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [isAuthenticated, accessToken, queryClient]);
};
```

```typescript
// App.tsx - Use WebSocket hook
import { useWebSocketSync } from './hooks/useWebSocketSync';

function App() {
  useWebSocketSync(); // Active sync temps réel si authentifié
  // ... rest of app
}
```

### **Livrables Jalon 6**
- ✅ WebSocket service backend (Socket.IO)
- ✅ Events: agent created/updated/deleted
- ✅ Hook frontend `useWebSocketSync`
- ✅ Auto-refresh React Query cache sur events
- ✅ Authentification WebSocket (JWT)

---

## 🧪 JALON 7: TESTS & VALIDATION (Semaine 5-6)
**Durée**: 6-8 jours | **Criticité**: 🔴 CRITIQUE | **Impact Guest Mode**: ✅ TESTS OBLIGATOIRES

### **Objectifs**
- Suite de tests automatisés (backend + frontend)
- Tests de non-régression Guest mode
- Tests d'intégration API
- Tests de sécurité

### **JALON 7.1: Tests Backend (Jest + Supertest)**

**Installation**:
```bash
cd backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest mongodb-memory-server
```

**Configuration**: `backend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
```

**Fichier**: `backend/src/__tests__/setup.ts`

```typescript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

**Fichier**: `backend/src/__tests__/auth.test.ts`

```typescript
import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.routes';
import { User } from '../models/User.model';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    test('Should create new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test1234'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');
    });
    
    test('Should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation échouée');
    });
    
    test('Should reject duplicate email', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'Test1234'
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test1234'
        });
      
      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email déjà utilisé');
    });
  });
  
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: 'Test1234'
      });
    });
    
    test('Should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test1234'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
    });
    
    test('Should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });
      
      expect(response.status).toBe(401);
    });
  });
});
```

**Fichier**: `backend/src/__tests__/agents.test.ts`

```typescript
import request from 'supertest';
import express from 'express';
import passport from 'passport';
import agentsRoutes from '../routes/agents.routes';
import { User } from '../models/User.model';
import { Agent } from '../models/Agent.model';
import { generateAccessToken } from '../utils/jwt';
import '../middleware/auth.middleware'; // Configure Passport

const app = express();
app.use(express.json());
app.use(passport.initialize());
app.use('/api/agents', agentsRoutes);

describe('Agents Endpoints', () => {
  let user: any;
  let accessToken: string;
  
  beforeEach(async () => {
    user = await User.create({
      email: 'test@example.com',
      password: 'Test1234',
      role: 'user'
    });
    
    accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });
  });
  
  describe('POST /api/agents', () => {
    test('Should create agent with valid data', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Agent',
          role: 'assistant',
          systemPrompt: 'You are a helpful assistant',
          llmProvider: 'Gemini',
          model: 'gemini-2.0-flash',
          capabilities: ['Chat'],
          creatorId: 'AR_001'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Agent');
      expect(response.body.ownerId).toBe(user.id);
    });
    
    test('Should reject agent with invalid creatorId', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Agent',
          role: 'assistant',
          systemPrompt: 'You are a helpful assistant',
          llmProvider: 'Gemini',
          model: 'gemini-2.0-flash',
          capabilities: ['Chat'],
          creatorId: 'CO_003' // Com ne peut pas créer agents
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Archi');
    });
    
    test('Should reject unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/agents')
        .send({
          name: 'Test Agent',
          role: 'assistant',
          systemPrompt: 'You are a helpful assistant',
          llmProvider: 'Gemini',
          model: 'gemini-2.0-flash',
          capabilities: ['Chat'],
          creatorId: 'AR_001'
        });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/agents', () => {
    test('Should return only user\'s agents', async () => {
      // Créer agent pour user1
      await Agent.create({
        name: 'Agent User1',
        role: 'assistant',
        systemPrompt: 'Test',
        llmProvider: 'Gemini',
        model: 'gemini-2.0-flash',
        capabilities: ['Chat'],
        creatorId: 'AR_001',
        ownerId: user.id
      });
      
      // Créer autre user et son agent
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'Test1234'
      });
      
      await Agent.create({
        name: 'Agent User2',
        role: 'assistant',
        systemPrompt: 'Test',
        llmProvider: 'Gemini',
        model: 'gemini-2.0-flash',
        capabilities: ['Chat'],
        creatorId: 'AR_001',
        ownerId: user2.id
      });
      
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Agent User1');
    });
  });
});
```

### **JALON 7.2: Tests Frontend (React Testing Library)**

**Installation**:
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest
```

**Configuration**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts']
  }
});
```

**Fichier**: `src/__tests__/guest-mode.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import { App } from '../App';

describe('🔴 TESTS NON-RÉGRESSION - MODE GUEST', () => {
  
  beforeEach(() => {
    localStorage.clear();
    localStorage.removeItem('auth_data');
  });
  
  test('TNR-1: App démarre en mode Guest', () => {
    render(<App />);
    expect(screen.getByText(/mode invité/i)).toBeInTheDocument();
    expect(screen.getByText(/connexion/i)).toBeInTheDocument();
  });
  
  test('TNR-2: LLM configs chargés depuis localStorage', async () => {
    localStorage.setItem('llmAgentWorkflow_configs', JSON.stringify([
      { provider: 'Gemini', apiKey: 'test-key', enabled: true, capabilities: {} }
    ]));
    
    render(<App />);
    
    // Ouvrir Settings
    const settingsBtn = screen.getByLabelText(/paramètres/i);
    fireEvent.click(settingsBtn);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('test-key')).toBeInTheDocument();
    });
  });
  
  test('TNR-3: Création agent fonctionne en mode Guest', async () => {
    render(<App />);
    
    // Navigation Archi
    const archiBtn = screen.getByLabelText(/archi/i);
    fireEvent.click(archiBtn);
    
    // Créer agent
    const createBtn = screen.getByText(/créer agent/i);
    fireEvent.click(createBtn);
    
    // Remplir formulaire
    const nameInput = screen.getByLabelText(/nom/i);
    fireEvent.change(nameInput, { target: { value: 'Test Agent Guest' } });
    
    const roleInput = screen.getByLabelText(/rôle/i);
    fireEvent.change(roleInput, { target: { value: 'assistant' } });
    
    const saveBtn = screen.getByText(/enregistrer/i);
    fireEvent.click(saveBtn);
    
    // Vérifier agent apparaît
    await waitFor(() => {
      expect(screen.getByText('Test Agent Guest')).toBeInTheDocument();
    });
  });
  
  test('TNR-4: Agents perdus au refresh (comportement actuel)', () => {
    const { rerender } = render(<App />);
    
    // Simuler création agent (en mémoire uniquement)
    // ... création agent ...
    
    // Simuler refresh
    rerender(<App />);
    
    // Vérifier agent n'existe plus
    // C'est le comportement attendu en mode Guest
  });
});
```

### **JALON 7.3: Tests de Sécurité**

**Fichier**: `backend/src/__tests__/security.test.ts`

```typescript
import request from 'supertest';
import { User } from '../models/User.model';
import { LLMConfig } from '../models/LLMConfig.model';
import { Agent } from '../models/Agent.model';

describe('Security Tests', () => {
  
  test('SEC-1: API keys never returned decrypted', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Test1234'
    });
    
    const config = new LLMConfig({
      userId: user.id,
      provider: 'OpenAI',
      enabled: true,
      capabilities: {}
    });
    config.setApiKey('sk-test-key-123');
    await config.save();
    
    const token = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    
    const response = await request(app)
      .get('/api/llm-configs')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.body[0]).not.toHaveProperty('apiKey');
    expect(response.body[0]).not.toHaveProperty('apiKeyEncrypted');
    expect(response.body[0].hasApiKey).toBe(true);
  });
  
  test('SEC-2: User cannot access other user\'s agents', async () => {
    const user1 = await User.create({ email: 'user1@example.com', password: 'Test1234' });
    const user2 = await User.create({ email: 'user2@example.com', password: 'Test1234' });
    
    const agent = await Agent.create({
      name: 'Agent User2',
      role: 'assistant',
      systemPrompt: 'Test',
      llmProvider: 'Gemini',
      model: 'gemini-2.0-flash',
      capabilities: ['Chat'],
      creatorId: 'AR_001',
      ownerId: user2.id
    });
    
    const token1 = generateAccessToken({
      sub: user1.id,
      email: user1.email,
      role: user1.role
    });
    
    const response = await request(app)
      .get(`/api/agents/${agent.id}`)
      .set('Authorization', `Bearer ${token1}`);
    
    expect(response.status).toBe(404);
  });
  
  test('SEC-3: Password hashed in database', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Test1234'
    });
    
    expect(user.password).not.toBe('Test1234');
    expect(user.password).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt hash pattern
  });
  
  test('SEC-4: JWT expiration enforced', async () => {
    // Test avec token expiré
    const expiredToken = jwt.sign(
      { sub: 'user-id', email: 'test@example.com', role: 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' } // Expire immédiatement
    );
    
    const response = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${expiredToken}`);
    
    expect(response.status).toBe(401);
  });
});
```

### **JALON 7.4: Scripts de Test**

**Fichier**: `backend/package.json` (ajout scripts)

```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:security": "jest security.test.ts"
  }
}
```

**Fichier**: `package.json` (frontend)

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:guest": "vitest guest-mode.test.tsx"
  }
}
```

### **Livrables Jalon 7**
- ✅ Suite tests backend (Jest + Supertest)
- ✅ Suite tests frontend (Vitest + RTL)
- ✅ Tests de non-régression Guest mode
- ✅ Tests de sécurité (auth, encryption, ownership)
- ✅ Coverage report (>80% recommandé)

### **Checklist Validation Jalon 7**
- [ ] Tous tests backend passent (npm test)
- [ ] Tous tests frontend passent (npm test)
- [ ] Tests TNR Guest mode passent à 100%
- [ ] Tests sécurité passent à 100%
- [ ] Coverage >80% sur code critique

---

## 🚀 JALON 8: DOCUMENTATION & DÉPLOIEMENT (Semaine 6)
**Durée**: 4-6 jours | **Criticité**: 🟡 MOYENNE

### **Objectifs**
- Documentation API (Swagger/OpenAPI)
- Guide utilisateur (Migration, Usage)
- Déploiement (Docker, CI/CD)
- Monitoring & Observabilité

### **JALON 8.1: Documentation API (Swagger)**

**Installation**:
```bash
cd backend
npm install swagger-ui-express swagger-jsdoc @types/swagger-ui-express
```

**Fichier**: `backend/src/swagger.ts`

```typescript
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'A-IR-DD2 API',
    version: '1.0.0',
    description: 'API Backend pour A-IR-DD2 Multi-LLM Workflow Orchestrator',
    contact: {
      name: 'A-IR-DD2 Team'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJSDoc(options);
```

```typescript
// backend/src/server.ts - Add Swagger UI
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**Fichier**: `backend/src/routes/agents.routes.ts` (annotations)

```typescript
/**
 * @swagger
 * /api/agents:
 *   get:
 *     summary: Liste des agents de l'utilisateur
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des agents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Agent'
 *       401:
 *         description: Non authentifié
 */
router.get('/', requireAuth, async (req, res) => {
  // ... implementation ...
});

/**
 * @swagger
 * /api/agents:
 *   post:
 *     summary: Créer un nouvel agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAgentRequest'
 *     responses:
 *       201:
 *         description: Agent créé avec succès
 *       403:
 *         description: Permissions insuffisantes (gouvernance)
 */
router.post('/', requireAuth, validateRequest(createAgentSchema), async (req, res) => {
  // ... implementation ...
});
```

### **JALON 8.2: Guide Utilisateur**

**Fichier**: `Guides/GUIDE_UTILISATEUR_AUTH.md`

```markdown
# 📘 Guide Utilisateur - Authentification & Persistance

## 🌟 Deux Modes de Fonctionnement

### Mode Invité (Guest)
**Aucun compte requis** - Démarrage immédiat

✅ **Avantages**:
- Démarrage instantané
- Aucune inscription nécessaire
- Toutes fonctionnalités disponibles

⚠️ **Limitations**:
- Données stockées localement (navigateur uniquement)
- Perte des données au nettoyage navigateur
- Pas de synchronisation multi-device
- API keys non chiffrées (risque sécurité)

### Mode Connecté (Authenticated)
**Compte requis** - Sécurité maximale

✅ **Avantages**:
- API keys chiffrées (AES-256-GCM)
- Sauvegarde cloud automatique
- Accès multi-device
- Synchronisation temps réel
- Préparation collaboration

⚠️ **Prérequis**:
- Adresse email valide
- Mot de passe fort (8+ caractères, 1 majuscule, 1 chiffre)

## 🚀 Créer un Compte

1. Cliquer **"Inscription"** dans le header
2. Saisir email et mot de passe
3. Validation automatique
4. **Migration proposée** si données locales détectées

## 🔄 Migrer vos Données

Lors de votre première connexion, un wizard de migration s'affiche automatiquement si des données locales existent.

**Données migrées**:
- Configurations LLM (API keys chiffrées)
- Agents (prototypes)
- Templates personnalisés

**Durée**: ~30 secondes  
**Sécurité**: Vos données locales sont préservées (rollback possible)

## 🔐 Sécurité

### Mode Invité
- API keys en localStorage (plaintext)
- Accessible via DevTools navigateur
- ⚠️ Risque: Partage accidentel écran

### Mode Connecté
- API keys chiffrées avec AES-256-GCM
- Clé unique par utilisateur (PBKDF2)
- Jamais exposées au frontend
- Backend proxy toutes requêtes LLM

## 💡 Bonnes Pratiques

1. **Utilisez le mode Connecté** pour production
2. **Rotation API keys** régulière (tous les 3 mois)
3. **Mot de passe fort** (gestionnaire mots de passe recommandé)
4. **Déconnexion** sur ordinateurs partagés

## 🆘 Dépannage

**Je ne reçois pas de réponse du backend**:
- Vérifier backend démarré (`npm run dev` dans `backend/`)
- Vérifier MongoDB connecté

**Mes agents ne sont pas sauvegardés**:
- Mode Guest: Comportement normal (volatile)
- Mode Connecté: Vérifier connexion réseau

**Erreur "Refresh token invalide"**:
- Reconnectez-vous (token expiré après 7 jours)
```

### **JALON 8.3: Déploiement Docker**

**Fichier**: `backend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

**Fichier**: `docker-compose.yml` (racine)

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: a-ir-dd2-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    networks:
      - a-ir-dd2-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: a-ir-dd2-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/a-ir-dd2?authSource=admin
      - JWT_SECRET=${JWT_SECRET}
      - REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - FRONTEND_URL=http://localhost:5173
    depends_on:
      - mongodb
    networks:
      - a-ir-dd2-network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: a-ir-dd2-frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3001
    depends_on:
      - backend
    networks:
      - a-ir-dd2-network

volumes:
  mongodb_data:

networks:
  a-ir-dd2-network:
    driver: bridge
```

**Fichier**: `Dockerfile` (frontend - racine)

```dockerfile
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
```

**Fichier**: `nginx.conf`

```nginx
server {
    listen 5173;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Commandes Déploiement**:
```bash
# Créer .env à la racine
cp .env.example .env
# Éditer .env avec secrets production

# Build et démarrer
docker-compose up -d

# Vérifier logs
docker-compose logs -f backend

# Arrêter
docker-compose down

# Arrêter et supprimer volumes
docker-compose down -v
```

### **JALON 8.4: CI/CD (GitHub Actions)**

**Fichier**: `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install backend dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run backend tests
        working-directory: ./backend
        run: npm test
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          JWT_SECRET: test-secret
          REFRESH_TOKEN_SECRET: test-refresh-secret
          ENCRYPTION_KEY: ${{ secrets.TEST_ENCRYPTION_KEY }}
  
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install frontend dependencies
        run: npm ci
      
      - name: Run frontend tests
        run: npm test
      
      - name: Build frontend
        run: npm run build
  
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run npm audit (backend)
        working-directory: ./backend
        run: npm audit --audit-level=moderate
      
      - name: Run npm audit (frontend)
        run: npm audit --audit-level=moderate
```

### **Livrables Jalon 8**
- ✅ Documentation API Swagger (http://localhost:3001/api-docs)
- ✅ Guide utilisateur complet
- ✅ Docker Compose production-ready
- ✅ CI/CD GitHub Actions
- ✅ Scripts de déploiement

---

## ✅ CHECKLIST FINALE DE VALIDATION

### **Sécurité**
- [ ] `.env` exclu du git
- [ ] Secrets générés avec crypto.randomBytes
- [ ] Mots de passe hachés bcrypt (10 rounds)
- [ ] JWT expiration <24h
- [ ] API keys chiffrées AES-256-GCM
- [ ] Tous endpoints protégés par `requireAuth`
- [ ] Ownership checks sur toutes requêtes
- [ ] Rate limiting actif
- [ ] CORS configuré (whitelist)
- [ ] Helmet activé (headers sécurité)

### **Non-Régression Guest Mode**
- [ ] App démarre sans erreur en mode Guest
- [ ] LLM configs chargés depuis localStorage
- [ ] Création agent fonctionne
- [ ] Modification agent fonctionne
- [ ] Suppression agent fonctionne
- [ ] Ajout workflow fonctionne
- [ ] Chat LLM fonctionne (client-side)
- [ ] Agents volatiles (comportement attendu)

### **Fonctionnalités Authenticated**
- [ ] Inscription fonctionne
- [ ] Login fonctionne
- [ ] Refresh token fonctionne
- [ ] Logout fonctionne
- [ ] Agents persistés en BDD
- [ ] LLM configs chiffrées
- [ ] API keys jamais exposées
- [ ] Proxy LLM fonctionne
- [ ] WebSocket sync fonctionne
- [ ] Migration wizard fonctionne

### **Tests**
- [ ] Tests backend passent (100%)
- [ ] Tests frontend passent (100%)
- [ ] Tests sécurité passent (100%)
- [ ] Tests non-régression passent (100%)
- [ ] Coverage >80%

### **Documentation**
- [ ] API Swagger accessible
- [ ] Guide utilisateur rédigé
- [ ] README mis à jour
- [ ] Diagrammes architecture à jour

### **Déploiement**
- [ ] Docker Compose fonctionne
- [ ] CI/CD configuré
- [ ] Variables environnement documentées
- [ ] Rollback plan documenté

---

## 🎯 MÉTRIQUES DE SUCCÈS

| Métrique | Cible | Mesure |
|----------|-------|--------|
| **Sécurité** | API keys chiffrées | 100% (mode auth) |
| **Non-régression** | Fonctions Guest préservées | 100% |
| **Performance API** | Latence p95 | <200ms |
| **Fiabilité** | Données persistées | 100% (mode auth) |
| **UX Migration** | Durée wizard | <30s |
| **Tests** | Coverage | >80% |
| **Uptime** | Disponibilité | >99.9% |

---

## 📚 RESSOURCES ANNEXES

### **Technologies**
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Mongoose Guide](https://mongoosejs.com/docs/guide.html)
- [Passport.js](http://www.passportjs.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [React Query Docs](https://tanstack.com/query/latest)
- [Socket.IO Docs](https://socket.io/docs/v4/)

### **Sécurité**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

### **Architecture**
- [12-Factor App](https://12factor.net/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

---

## 🎉 CONCLUSION

Ce guide fournit une feuille de route complète pour migrer A-IR-DD2 d'une architecture client-side vers une architecture backend-centric sécurisée avec authentification JWT et persistance MongoDB.

**Principes clés respectés**:
- ✅ **Non-régression absolue** : Mode Guest fonctionne identiquement
- ✅ **Sécurité par design** : Chiffrement, validation, isolation
- ✅ **Progressivité** : Jalons incrémentaux testables
- ✅ **Réversibilité** : Migration optionnelle, rollback possible

**Durée totale estimée** : 5-6 semaines  
**Équipe recommandée** : 2 développeurs (1 backend, 1 frontend)  
**Risque global** : 🟡 MOYEN (avec tests rigoureux)

**Prochaines étapes** :
1. Validation du plan par Chef de Projet
2. Setup environnement (MongoDB, secrets)
3. Démarrage JALON 1 (Backend sécurité)
4. Itérations jalons avec TNR systématiques

---

**Plan créé par** : ARC-1 (Agent IA Architecte)  
**Date** : 2 Décembre 2025  
**Version** : 1.0.0 - COMPLET
