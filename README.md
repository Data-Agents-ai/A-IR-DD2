# A-IR-DD2 - AI Robot Design & Development System V2

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)

> **Advanced Multi-LLM Workflow Orchestrator with Robot Specialization Architecture & User Persistence (J4.3)**

A-IR-DD2 is a next-generation AI orchestration platform implementing a specialized robot architecture for managing complex multi-LLM workflows. Features 5 specialized robots (Archi, Bos, Com, Phil, Tim), N8N-style visual workflow editing, JWT authentication with MongoDB persistence, and enterprise-grade governance.

**🎯 Current Release: J4.3 COMPLETE** - User authentication, encrypted API keys, and settings persistence production-ready!

---

## ✨ Key Features

### 🤖 Robot Specialization Architecture
- **Archi** (AR_001): Agent creation, workflow orchestration, system architecture
- **Bos** (BO_002): Monitoring, supervision, cost tracking, debugging
- **Com** (CO_003): API connections, authentication, external integrations  
- **Phil** (PH_004): Data transformation, file handling, validation
- **Tim** (TI_005): Event triggers, scheduling, rate limiting, async management

### 🔄 Visual Workflow Editor (N8N-Style)
- Drag & drop canvas with React Flow
- Robot-specific node templates
- Real-time execution monitoring
- Multi-robot orchestration with governance

### 🤖 Multi-LLM Support
- **9 Providers**: Gemini, OpenAI, Anthropic, Mistral, Grok, Perplexity, Qwen, Kimi, DeepSeek
- **Local LMStudio**: Run models locally with backend CORS proxy
- **Advanced Capabilities**: Function calling, image generation/editing, web search, OCR, embeddings, reasoning
- **Smart Context**: Auto-summarization, token optimization, conversation history

### 🔐 Enterprise Security (J4.3)
- **JWT Authentication**: Secure login/register with refresh tokens
- **Encrypted API Keys**: AES-256-GCM encryption before MongoDB storage
- **User Settings**: Per-user LLM configs and preferences persisted
- **Session Management**: API keys only in memory, never in localStorage
- **Creator Validation**: Robot permission system for governance

---

## 📋 Prerequisites

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Node.js** | 18.0 | 20.x LTS |
| **MongoDB** | 5.0 | 6.0+ |
| **Python** | 3.8 | 3.11+ |

⚠️ **CRITICAL**: MongoDB is **MANDATORY** for J4.3. No MongoDB = no authentication or persistence.

---

## 🚀 Installation

### 1. Install Prerequisites

**Node.js:**
- Windows/Mac: [nodejs.org](https://nodejs.org) → Download LTS
- Linux: `curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`

**MongoDB (REQUIRED):**

**Windows:**
1. Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run installer, check "Install MongoDB as a Service"
3. Default: `mongodb://localhost:27017`
4. Verify: `mongosh`

**macOS (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
mongosh  # verify
```

**Linux (Ubuntu/Debian):**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod
mongosh  # verify
```

**Docker:**
```bash
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:6.0
# Connection: mongodb://admin:password@localhost:27017/a-ir-dd2-dev?authSource=admin
```

**Python:** [python.org](https://www.python.org/downloads) or `sudo apt-get install python3 python3-pip`

### 2. Clone & Install

```bash
git clone https://github.com/sylvainbonnecarrere/A-IR-DD2.git
cd A-IR-DD2

npm install
cd backend && npm install && cd ..
```

### 3. Environment Configuration

**Frontend (`.env.local`):**
```env
# At least one LLM API key required
GEMINI_API_KEY=your_gemini_key
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key
# (see documentation for other providers)

# Optional URLs
REACT_APP_API_URL=http://localhost:3001
REACT_APP_LMSTUDIO_URL=http://localhost:1234
```

**Backend (`backend/.env`):**
```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database (MANDATORY - J4.3)
# Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/a-ir-dd2-dev
# Docker with auth:
# MONGODB_URI=mongodb://admin:password@localhost:27017/a-ir-dd2-dev?authSource=admin

# Security (CRITICAL - Generate these!)
# JWT_SECRET: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_jwt_secret_32_chars_hex

# ENCRYPTION_KEY: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_encryption_key_64_hex_chars

JWT_EXPIRY=3600000

# LLM Providers
GEMINI_API_KEY=your_gemini_key
# (add others as needed)

# Logging
LOG_LEVEL=debug
```

**Generate Security Keys:**
```bash
# JWT Secret (32+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Database Initialization

Backend auto-creates MongoDB collections and indexes on startup. No manual migration needed.

**Verify Collections Created:**
```bash
mongosh
> use a-ir-dd2-dev
> show collections
# Should show: users, llm_configs, user_settings, workflows, agents, etc.
```

### 5. Start Development

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Should show: ✓ MongoDB connected ✓ Backend listening on port 3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Should show: ✓ Local: http://localhost:5173/
```

### 6. Verify Installation

```bash
# Frontend loads without errors
Open http://localhost:5173

# Backend health
curl http://localhost:3001/api/health

# MongoDB connected
mongosh
> use a-ir-dd2-dev
> show collections

# Test authentication
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'
# Should return: {"user":{...},"accessToken":"...","refreshToken":"..."}

# Test settings persistence
# 1. Login in browser
# 2. Enable LLM provider in Settings → Clés API
# 3. Close and reopen app
# 4. Settings should persist
```

---

## 🔒 Authentication & Persistence (J4.3)

### User Features
- **Registration**: Create account with email + password
- **Login**: Secure JWT-based authentication
- **Settings**: Per-user LLM configs stored in MongoDB
- **Encrypted Keys**: All API keys encrypted before storage
- **Multi-Device**: Settings sync across devices

### Guest Mode
- Works without authentication
- Settings in localStorage (browser-only, not synced)

### First-Time User Flow
1. Click "Inscription" → Create account
2. Auto-fetches LLM API keys from server
3. Settings persisted to MongoDB
4. Accessible across devices with same login

---

## 🛠️ Development

### Project Structure
```
A-IR-DD2/
├── components/              # React UI components
│   ├── workflow/           # Workflow editor
│   ├── modals/             # Auth, settings modals
│   └── panels/             # Sidebar components
├── contexts/               # React Context (Auth, Localization, etc.)
├── services/               # LLM provider services (9 providers)
├── stores/                 # Zustand state management
├── hooks/                  # Custom React hooks
├── i18n/                   # Internationalization (8+ languages)
├── types.ts                # TypeScript definitions
├── backend/
│   └── src/
│       ├── server.ts              # Express + routes
│       ├── models/                # MongoDB schemas
│       ├── routes/                # API endpoints
│       ├── services/              # Business logic
│       ├── middleware/            # Auth, validation
│       ├── pythonExecutor.ts      # Python tool execution
│       └── config.ts              # Whitelisted tools
└── documentation/          # Architecture, migration guides
```

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind, Zustand, React Flow
- **Backend**: Node.js, Express, TypeScript, Mongoose ODM
- **Database**: MongoDB 5.0+
- **Build**: Vite with HMR

### Available Scripts

**Frontend:**
```bash
npm run dev         # Start dev server (port 5173)
npm run build       # Production build
npm run preview     # Preview production
npm run lint        # Run linter
```

**Backend:**
```bash
cd backend
npm run dev         # Start with ts-node-dev (port 3001)
npm run build       # TypeScript build
npm run start       # Run compiled code
```

### Configuration

**LLM Providers Matrix:**
| Provider | Chat | Function Calling | Images | Web Search | Local |
|----------|------|------------------|--------|------------|-------|
| Gemini | ✅ | ✅ | ✅ | ✅ | - |
| OpenAI | ✅ | ✅ | ✅ | - | - |
| Anthropic | ✅ | ✅ | - | - | - |
| Mistral | ✅ | ✅ | - | - | - |
| DeepSeek | ✅ | ✅ | - | - | - |
| LMStudio | ✅ | ⚠️* | - | - | ✅ |

*⚠️ Function calling depends on model type. Base models (Mistral-7B) don't support it. Use Hermes or Functionary for full support.*

**LMStudio Setup:**
1. Download [lmstudio.ai](https://lmstudio.ai/)
2. Load a model (e.g., Mistral-7B-Instruct-v0.2)
3. Start local server (default: port 1234)
4. Backend proxy automatically routes requests
5. Eliminates CORS issues

### Python Tools
Add custom tools in `utils/pythonTools/` and register in `backend/src/config.ts`:
```typescript
export const WHITELISTED_PYTHON_TOOLS = [
    'search_web_py',
    'your_tool_here',
];
```

Contract: `python3 <script> '<json-args>'` → JSON to stdout

---

## 🚨 Troubleshooting

### MongoDB Connection
**Error**: `ECONNREFUSED` or `Cannot connect to MongoDB`

**Solutions:**
```bash
# 1. Check if MongoDB is running
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# Docker: docker start mongodb

# 2. Verify connection string in backend/.env
# Should be: mongodb://localhost:27017/a-ir-dd2-dev

# 3. Test connection manually
mongosh "mongodb://localhost:27017/a-ir-dd2-dev"

# 4. Check port conflict
# Windows: netstat -ano | findstr :27017
# macOS/Linux: lsof -i :27017
```

### Authentication Errors
**Error**: `JWT_SECRET not configured` or `ENCRYPTION_KEY not configured`

**Solution:**
```bash
# Generate keys
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Add to backend/.env
echo "JWT_SECRET=$JWT_SECRET" >> backend/.env
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> backend/.env

# Restart backend
npm run dev
```

**Error**: `Registration failed` or `Login rejected`

**Solutions:**
```bash
# 1. Verify users collection exists
mongosh
> use a-ir-dd2-dev
> db.users.countDocuments()  # Should work

# 2. Check password requirements
# - Minimum 8 characters
# - Valid email format

# 3. Check backend logs for specific error
```

**Error**: `useAuth must be used within AuthProvider`

**Solution:**
- Reload browser (F5) or restart dev server
- This indicates auth hook outside provider scope
- Should be fixed in latest version

### Backend/Frontend Issues
**Error**: `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find and kill process
# Windows: netstat -ano | findstr :3001 && taskkill /PID <PID> /F
# macOS/Linux: lsof -i :3001 && kill -9 <PID>

# Or use different port: edit backend/.env PORT=3002
```

**Error**: `Cannot find module` or blank page

**Solution:**
```bash
# 1. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Check Node version (must be 18+)
node --version

# 3. Restart dev server
npm run dev

# 4. Check browser console (F12) for errors
```

### Settings Not Persisting
**Error**: Settings disappear after refresh

**Diagnosis:**
```bash
# 1. Check if authenticated
# Browser Console (F12) → check for Authorization header

# 2. Verify user_settings in MongoDB
mongosh
> use a-ir-dd2-dev
> db.user_settings.findOne()

# 3. If guest mode: settings in localStorage only
# Clear: Ctrl+Shift+Delete in browser
```

**Error**: `Failed to save API keys`

**Solution:**
```bash
# 1. Verify ENCRYPTION_KEY is valid
# Should be 64 hex characters

# 2. Check MongoDB user_settings collection
mongosh
> db.user_settings.countDocuments()

# 3. Check backend logs for specific error
```

### Database Initialization
**Error**: `Missing collections`

**Solution:**
```bash
# Restart backend - auto-creates collections
npm run dev

# Verify
mongosh
> use a-ir-dd2-dev
> show collections
# Should list: users, llm_configs, user_settings, workflows, agents, etc.
```

---

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend      │         │   Backend Proxy  │         │   LMStudio      │
│   React + TS    │◄───────►│   Node.js + TS   │◄───────►│   Local Models  │
│   Robot UI      │         │   CORS Handler   │         │   (Mistral...)  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                    │
                                    │ JWT Auth
                                    ▼
                            ┌──────────────────┐
                            │     MongoDB      │
                            │  (users, settings)
                            └──────────────────┘
                                    │
                                    ▼
                            ┌──────────────────┐
                            │  Cloud LLMs      │
                            │  (Gemini, GPT-4) │
                            └──────────────────┘
```

### Robot Specialization Matrix
| Robot | Domain | Capabilities | Color |
|-------|--------|-------------|-------|
| **Archi** | Architecture | Workflow design, agent creation | Cyan |
| **Bos** | Monitoring | Supervision, cost tracking | Red |
| **Com** | Connections | APIs, auth, integrations | Blue |
| **Phil** | Data | File handling, validation | Purple |
| **Tim** | Events | Triggers, scheduling | Orange |

### Security Model (J4.3)
- **Frontend**: Session-only storage (localStorage for guest mode)
- **Backend**: Bearer token authentication (JWT)
- **Database**: Encrypted API keys (AES-256-GCM)
- **Transport**: HTTPS recommended for production
- **Governance**: Creator ID validation for prototypes

---

## ⚠️ Known Limitations

### LMStudio
- **Function Calling**: Most base models (Mistral-7B, Llama-2) don't support function calling
  - ✅ Cloud APIs (OpenAI, Gemini) work perfectly
  - ✅ Specialized local models (Hermes, Functionary) work
  - ❌ Base Mistral-7B-Instruct doesn't work
- **Embeddings**: Only embedding-specific models support this
- **Performance**: Slower than cloud APIs for complex reasoning

### Recommendations
- Use **cloud APIs** for production workloads with function calling
- Use **LMStudio** for privacy-sensitive tasks or experimentation
- Test capability detection before deploying workflows
- Monitor console warnings for compatibility issues

---

## 🔒 Security Best Practices

- **Dependency Audits**: `npm audit` regularly
- **Environment Variables**: Never commit `.env` files
- **Input Validation**: All inputs sanitized
- **CORS**: Backend proxy handles local LLM access
- **Python Execution**: Whitelist-based sandboxing
- **API Keys**: Encrypted at rest, session-only in memory
- **JWT**: Refresh tokens for token rotation

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open Pull Request

## 🙏 Support & Community

- **Issues**: [GitHub Issues](https://github.com/sylvainbonnecarrere/A-IR-DD2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sylvainbonnecarrere/A-IR-DD2/discussions)
- **Documentation**: [Project Wiki](https://github.com/sylvainbonnecarrere/A-IR-DD2/wiki)

---

**Built with ❤️ by the A-IR-DD2 Team**

*Empowering the future of AI orchestration through specialized robot architecture.*

Last Updated: J4.3 (January 2025)
