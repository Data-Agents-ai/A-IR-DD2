# 📋 STACK TECHNIQUE COMPLÈTE - A-IR-DD2 V2

## 🎯 LANGAGES PRINCIPAUX

| Langage | Version | Usage |
|---------|---------|-------|
| **TypeScript** | 5.2.2 | Frontend + Backend - Type safety strict |
| **JavaScript** | ES2022 | Scripts, configuration, Node.js |
| **JSX/TSX** | React 18 | Composants UI |
| **Python** | 3.x | Outils exécutables backend via `pythonExecutor.ts` |
| **JSON** | - | Configuration, données, i18n |
| **CSS** | Tailwind CSS | Styling frontend |
| **SQL** | - | N/A (MongoDB = NoSQL) |

---

## 🔧 FRONTEND STACK

### Core Framework & Build
```
React 18.2.0 → UI component library
Vite 6.4.1 → Build tool (ultra-rapide, HMR instant)
TypeScript 5.2.2 → Type safety
```

### Dependencies (package.json)

**State Management & Context:**
- `react` 18.2.0
- `react-dom` 18.2.0
- `zustand` (agent state management per docs)

**UI Components & Styling:**
- `tailwindcss` (CSS framework) → Styles dans `index.css`
- `framer-motion` (animations)
- `react-flow-renderer` (canvas pour workflow - **CLEF pour V2 canvas editor**)

**Data & API:**
- `axios` (HTTP client) → Appelé depuis `contexts/AuthContext.tsx` mais actuellement **remplacé par `fetch` natif**
- `react-query` ou similar (caching API)

**Forms & Validation:**
- `zod` ou `yup` (schema validation)
- Validation custom dans modales (LoginModal, RegisterModal, AgentFormModal)

**Internationalization:**
- `i18n/*.ts` (custom pattern) → 5 langues (FR, EN, DE, ES, PT)
- `contexts/LocalizationContext.tsx` → Hook `useLocalization()`

**Authentication:**
- JWT tokens (Bearer tokens)
- `contexts/AuthContext.tsx` → Gère login/register/logout
- `localStorage` pour persistance des settings (Guest mode)

**Testing:**
- `vitest` (Test framework - compatible Vite)
- `@testing-library/react`

### Key Directories
```
src/
├── components/        # Composants React (Header, Sidebar, Modales)
├── contexts/          # AuthContext, LocalizationContext
├── services/          # llmService, mockLLMService
├── types.ts           # Types centralisés
├── i18n/              # Fichiers traduction (fr.ts, en.ts, de.ts, es.ts, pt.ts)
├── utils/             # SettingsStorage abstraction layer
├── stores/            # Zustand stores (design agent)
└── index.css          # Tailwind directives
```

---

## ⚙️ BACKEND STACK

### Core Framework & Runtime
```
Node.js 24.8.0 → Runtime JavaScript serveur
Express 4.18.2 → HTTP server framework
TypeScript 5.2.2 → Type safety backend
ts-node-dev 10.9.1 → Live reload development
```

### Database
```
MongoDB 6.0+ → NoSQL document database
Mongoose 7.5.0 → ODM (Object Document Mapper)
Connection: mongodb://localhost:27017/a-ir-dd2-dev
```

### Dependencies (backend/package.json)

**HTTP & Middleware:**
- `express` 4.18.2
- `cors` (CORS handling)
- `helmet` (security headers)
- `body-parser` (JSON parsing)

**Authentication & Security:**
- `jsonwebtoken` 9.1.0 → JWT signing/verification
- `bcryptjs` 2.4.3 → Password hashing (bcrypt)
- `dotenv` → Environment variables

**Database & ORM:**
- `mongoose` 7.5.0 → MongoDB ODM
- Models: `User.model.ts`, `UserSettings.model.ts`, `LLMConfig.model.ts`, etc.

**Encryption:**
- `crypto` (Node.js built-in) → AES-256-GCM pour API keys

**Validation:**
- `zod` → Schema validation pour routes Auth

**Python Integration:**
- `child_process` (Node.js built-in) → Exécute scripts Python
- Whitelist: `backend/src/config.ts` → WHITELISTED_PYTHON_TOOLS

**Testing:**
- `jest` → Test framework
- `@types/jest`

**Development Tools:**
- `ts-node` → Execute TypeScript directly
- `typescript` 5.2.2
- `nodemon` (optional - ts-node-dev le remplace)

### Key Directories
```
backend/
├── src/
│   ├── routes/              # API routes (auth, llm-configs, user-settings)
│   ├── models/              # Mongoose schemas (User, UserSettings, etc.)
│   ├── middleware/          # Auth middleware, error handlers
│   ├── services/            # Business logic
│   ├── pythonExecutor.ts    # Execute Python tools
│   ├── config.ts            # Whitelist Python tools, JWT secret
│   ├── server.ts            # Express app setup
│   └── encryption.ts        # AES-256-GCM utilities
├── docker/
│   ├── docker-compose.yml   # MongoDB + init scripts
│   ├── init-mongo.sh        # Shell script initialization
│   ├── init-collections.js  # Create collections & test user
│   └── README.md            # Docker setup guide
├── __tests__/
│   ├── integration/         # Integration tests
│   │   └── llm-configs.integration.test.ts
│   └── unit/                # Unit tests
├── jest.config.js           # Jest configuration
└── tsconfig.json            # TypeScript config
```

---

## 🗄️ DATABASE SCHEMA (MongoDB)

### Collections Principales

**1. `users`**
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed bcrypt),
  role: String ('admin' | 'user'),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date,
  __v: Number
}
```

**2. `user_settings`** (J4.3 - Nouvelle)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  
  llmConfigs: {
    [provider]: {
      enabled: Boolean,
      apiKeyEncrypted: String (AES-256-GCM),
      capabilities: { [capability]: Boolean },
      lastUpdated: Date
    }
  },
  
  preferences: {
    language: 'fr' | 'en' | 'de' | 'es' | 'pt',
    theme?: 'dark' | 'light'
  },
  
  createdAt: Date,
  updatedAt: Date,
  version: Number
}
```

**3. `agents` / `prototypes`** (Design domain)
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  creator_id: ObjectId (ref: users - Robot creator),
  prototype_type: 'Agent' | 'Connection' | 'Event' | 'File',
  config: Object (JSON),
  createdAt: Date,
  updatedAt: Date
}
```

**4. `llm_configs`** (Existant)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  provider: String,
  apiKey: String (encrypted),
  enabled: Boolean
}
```

---

## 🔐 SECURITY STACK

| Aspect | Implémentation |
|--------|-----------------|
| **Authentication** | JWT + Bearer tokens (expire après session) |
| **Password Hashing** | bcryptjs (bcrypt) - 10 salt rounds |
| **API Keys Encryption** | AES-256-GCM (node crypto) |
| **HTTPS** | Via Express + Helmet (headers security) |
| **CORS** | Configuré sur backend |
| **Session** | JWT stateless (pas de cookies) |
| **Rate Limiting** | À implémenter (Tim robot) |

---

## 📡 API & PROTOCOL STACK

| Protocol | Usage |
|----------|-------|
| **HTTP/REST** | Communication frontend ↔ backend |
| **WebSocket** | Streaming LLM responses (future) |
| **JSON** | Format d'échange données |

### Key Endpoints
```
POST /api/auth/login           # Bearer token
POST /api/auth/register        # New user
POST /api/auth/logout          # Session end

GET  /api/user-settings        # Récupère preferences + LLM configs
POST /api/user-settings        # Sauvegarde settings (DB si auth, localStorage si guest)

GET  /api/llm-configs          # Liste configs LLM utilisateur
POST /api/llm-configs          # Créer/update config
DELETE /api/llm-configs/:id    # Supprimer config

POST /api/execute-python-tool  # Exécute script Python whitelisted
```

---

## 🐳 DEPLOYMENT & INFRASTRUCTURE

| Component | Technologie |
|-----------|-------------|
| **Frontend Build** | Vite → `dist` folder (static assets) |
| **Backend Runtime** | Node.js 24.8.0 |
| **Database** | MongoDB 6.0+ (Docker container) |
| **Containerization** | Docker + docker-compose |
| **Environment** | `.env` files (development) |
| **Process Manager** | ts-node-dev (dev), Node.js direct (prod) |

### Docker Stack
```yaml
services:
  mongo:
    image: mongo:7.0
    ports: 27017:27017
    volumes:
      - mongo_data:/data/db
  
  # Frontend served via static server or Nginx (future)
  # Backend runs in separate container (future)
```

---

## 📊 VERSIONS CLÉS

```
Node.js:           24.8.0 (NVM4W sur Windows)
npm:               10.8.2+
React:             18.2.0
TypeScript:        5.2.2
Vite:              6.4.1
Express:           4.18.2
MongoDB:           6.0+
Mongoose:          7.5.0
```

---

## 🧪 TESTING STACK

| Tier | Framework | Config |
|------|-----------|--------|
| **Frontend Unit** | Vitest | `vite.config.ts` |
| **Frontend E2E** | Custom (React Testing Library) | `tests/fonctionnels` |
| **Backend Integration** | Jest | `backend/jest.config.js` |
| **Backend Unit** | Jest | `backend/jest.config.js` |
| **Coverage** | Istanbul (built-in Jest) | `npm run test:coverage` |

---

## 🛠️ DEVELOPMENT WORKFLOW

### Frontend
```bash
npm install              # Install dependencies
npm run dev             # Start Vite dev server (port 5173)
npm run build           # Build production
npm test                # Run tests
npm run test:watch      # Tests en mode watch
npm run test:coverage   # Coverage report
```

### Backend
```bash
cd backend
npm install
npm run dev             # Start Express (port 3001)
npm test                # Run Jest tests
npm run test:integration # Integration tests only
```

### Docker
```bash
cd backend/docker
docker-compose up -d    # Start MongoDB + init
docker-compose down     # Stop containers
```

---

## 📚 DOCUMENTATION STACK

| Type | Format | Location |
|------|--------|----------|
| **API Docs** | Markdown | `INSTALLATION_GUIDE.md` |
| **Architecture** | Markdown | `README.md` + `documentation` |
| **Component Docs** | JSDoc comments | Inline dans composants |
| **Type Docs** | TypeScript interfaces | `types.ts` |
| **i18n Keys** | TypeScript objects | `i18n/*.ts` |
| **Technical Stack** | Markdown | `DOCUMENTATION_TECHNICAL_STACK.md` |

---

## 📈 BUILD STATS (Production)

```
Vite Build Output:
├── dist/index.html              1.12 kB  │ gzip:  0.52 kB
├── dist/assets/index.css       10.63 kB  │ gzip:  2.50 kB
├── dist/assets/index.js      1,030.44 kB │ gzip: 267.29 kB
└── 338 modules transformed
```

**⚠️ Note:** Bundle size > 500kB - Optimization opportunities:
- Dynamic imports for route code-splitting
- Lazy load LLM service modules
- Tree-shake unused providers from `services/`

---

## 🎯 RÉSUMÉ EXÉCUTIF

**A-IR-DD2 V2 est une application TypeScript full-stack moderne avec:**

✅ **Frontend:** React 18 + Vite + Tailwind + i18n (5 langues)  
✅ **Backend:** Node.js + Express + MongoDB (Mongoose ODM)  
✅ **Security:** JWT + bcryptjs + AES-256-GCM encryption  
✅ **Authentication:** J4.1 (login/register) + J4.2 (LLM API keys) + J4.3 (Settings persistence)  
✅ **Testing:** Vitest (frontend) + Jest (backend)  
✅ **Deployment:** Docker + docker-compose (MongoDB included)  
✅ **Internationalization:** 5 langues (FR, EN, DE, ES, PT) - Traductions 100% complètes  
✅ **Python Integration:** Backend executes whitelisted Python tools via child_process  

**Architecture:** Domain-Driven Design avec séparation Design Domain ↔ Runtime Domain. Prêt pour V2 robot specialization (Archi, Bos, Com, Phil, Tim).

---

## 📋 COMPLIANCE MATRIX

| Jalons | Status | Component Stack |
|--------|--------|-----------------|
| **J4.1** ✅ | Login/Register | Express + JWT + bcryptjs + React Auth Context |
| **J4.2** ✅ | LLM API Keys | AES-256-GCM + Mongoose + Settings API |
| **J4.3** ✅ | Settings Persistence | MongoDB + Vitest + localStorage (guest mode) |
| **J5** 🔄 | Robot Specialization | Zustand + TypeScript types + Agent governance |
| **J6** 📝 | N8N Workflow Editor | React Flow + canvas architecture |
| **J7** 🔮 | Streaming & Real-time | WebSocket + Server-Sent Events |

---

**Document Created:** December 11, 2025  
**Last Updated:** December 11, 2025  
**Version:** 1.0 - Complete Technical Stack v2
