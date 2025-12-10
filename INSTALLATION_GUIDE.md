# Installation Guide - A-IR-DD2 V2

**Last Updated**: December 11, 2025  
**Version**: V2 + J4.3 (Authentication & Settings Persistence)

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [MongoDB Setup](#mongodb-setup)
3. [Node.js & npm](#nodejs--npm)
4. [Project Installation](#project-installation)
5. [Environment Configuration](#environment-configuration)
6. [Database Initialization](#database-initialization)
7. [Starting Services](#starting-services)
8. [Verification Checklist](#verification-checklist)
9. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Hardware
| Component | Minimum | Recommended | Note |
|-----------|---------|-------------|------|
| CPU Cores | 2 | 4+ | For concurrent backend & dev server |
| RAM | 4 GB | 8 GB+ | 2GB Node, 1GB MongoDB, 1GB browser |
| Storage | 2 GB | 5 GB+ | node_modules (~500MB), MongoDB data |
| Network | - | Localhost | All services run locally |

### Software

| Component | Version | Download | Purpose |
|-----------|---------|----------|---------|
| **Node.js** | 18+ (LTS 20) | [nodejs.org](https://nodejs.org) | Runtime & tooling |
| **npm** | 9+ | Bundled with Node | Package manager |
| **MongoDB** | 5.0+ (6.0+ recommended) | [mongodb.com](https://www.mongodb.com/try/download/community) | User data & settings |
| **Python** | 3.8+ (3.11 recommended) | [python.org](https://www.python.org/downloads) | Python tools execution |
| **Git** | 2.0+ | [git-scm.com](https://git-scm.com) | Repository cloning |

### OS Support
- ✅ **Windows 10/11** (64-bit)
- ✅ **macOS 11+** (Intel & Apple Silicon)
- ✅ **Linux** (Ubuntu 20.04+, Debian 11+, CentOS 8+)

---

## MongoDB Setup

### Why MongoDB?

MongoDB is required for:
- **User Authentication**: Store user credentials securely
- **Settings Persistence**: Save LLM configs and preferences per user
- **Multi-Device Sync**: Share settings across devices
- **Audit Trail**: Maintain history of changes

### Installation by OS

#### Windows

**Option A: Installer (Recommended)**
1. Download: [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run installer → Follow setup wizard
3. Choose "Install MongoD as a Service" (auto-starts on boot)
4. Choose "MongoDB Compass" installation (optional GUI)
5. Verify installation completed
6. MongoDB runs automatically on port 27017

**Option B: Chocolatey** (if installed)
```powershell
choco install mongodb-community
```

**Verify Installation**:
```powershell
mongosh
# Should output: "Connecting to: mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000"
# Then prompt: test>
```

#### macOS

**Option A: Homebrew (Recommended)**
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start service
brew services start mongodb-community

# View status
brew services list | grep mongodb

# Stop (if needed)
brew services stop mongodb-community
```

**Option B: Manual Download**
1. Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Extract and add to PATH
3. Create data directory: `mkdir -p ~/data/mongodb`
4. Run: `mongod --dbpath ~/data/mongodb`

**Verify Installation**:
```bash
mongosh
# test>
```

#### Linux (Ubuntu/Debian)

**Add MongoDB Repository**:
```bash
# Import GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add repository (Ubuntu 20.04)
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongosh
```

#### Docker (Cross-Platform)

**Simple (No Authentication)**:
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  mongo:6.0

# Connection: mongodb://localhost:27017
```

**With Authentication**:
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=securepassword \
  mongo:6.0

# Connection: mongodb://admin:securepassword@localhost:27017/?authSource=admin
```

**Verify Docker MongoDB**:
```bash
docker logs mongodb
# Should show: "Waiting for connections on port 27017"

# Connect:
docker exec -it mongodb mongosh
```

### MongoDB Data Directory

Where MongoDB stores data:
- **Windows**: `C:\Program Files\MongoDB\Server\6.0\data`
- **macOS**: `/usr/local/var/mongodb`
- **Linux**: `/var/lib/mongodb`
- **Docker**: Internal volume (auto-managed)

### Resetting MongoDB

**Backup current data** (if needed):
```bash
mongosh
> use a-ir-dd2-dev
> db.getCollectionNames()  # List collections
> db.users.find()          # View users
```

**Clear database**:
```bash
mongosh
> use a-ir-dd2-dev
> db.dropDatabase()
# Recreated automatically on next app start
```

---

## Node.js & npm

### Installation

**Windows**:
1. Go to [nodejs.org](https://nodejs.org)
2. Download LTS version (18+, preferably 20.x)
3. Run installer
4. Accept defaults (includes npm)
5. Verify:
```powershell
node --version    # v20.x.x
npm --version     # 10.x.x
```

**macOS**:
```bash
# Using Homebrew
brew install node

# Or manually from nodejs.org
# Then verify:
node --version
npm --version
```

**Linux**:
```bash
# Ubuntu/Debian
curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### npm Configuration

Check npm version and registry:
```bash
npm --version
npm config get registry  # Should be https://registry.npmjs.org/
```

---

## Project Installation

### 1. Clone Repository

```bash
git clone https://github.com/sylvainbonnecarrere/A-IR-DD2.git
cd A-IR-DD2
git checkout V2-Backend-Persistance  # Latest with auth
```

### 2. Install Frontend Dependencies

```bash
# From project root
npm install

# This will install:
# - React, TypeScript, Tailwind CSS
# - React Flow, Zustand, Axios
# - Testing libraries (Jest, React Testing Library)
# - Development tools (Vite, ESLint, Prettier)

# Verify installation
npm list react    # Should show version
ls node_modules   # Should contain all packages
```

### 3. Install Backend Dependencies

```bash
# From project root
cd backend
npm install

# This will install:
# - Express, TypeScript
# - Mongoose (MongoDB ODM)
# - Passport (JWT authentication)
# - Bcrypt (password hashing)
# - cors, helmet (security)

# Verify
npm list express
ls node_modules
cd ..
```

### 4. Verify Disk Space

```bash
# Check space used
du -sh node_modules
du -sh backend/node_modules

# Expected: ~800 MB total
```

---

## Environment Configuration

### Frontend Configuration

**File**: `.env.local` (project root)

Create the file:
```bash
# macOS/Linux
touch .env.local

# Windows PowerShell
New-Item -Path .env.local -ItemType File
```

**Content** (minimum):
```env
# REQUIRED: At least one LLM provider
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE

# OPTIONAL: Additional providers
# OPENAI_API_KEY=YOUR_OPENAI_KEY
# ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY

# OPTIONAL: Server URLs
REACT_APP_API_URL=http://localhost:3001
REACT_APP_LMSTUDIO_URL=http://localhost:1234
```

**Get API Keys**:
- **Gemini** (free tier): https://aistudio.google.com/app/apikey
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/keys
- **Mistral**: https://console.mistral.ai/api-keys/
- **Others**: See respective provider docs

### Backend Configuration

**File**: `backend/.env`

Create the file:
```bash
cd backend
# macOS/Linux
touch .env

# Windows PowerShell
New-Item -Path .env -ItemType File
```

**Content** (complete):
```env
# ========== SERVER ==========
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ========== DATABASE ==========
# Standard MongoDB connection
MONGODB_URI=mongodb://localhost:27017/a-ir-dd2-dev

# With Docker and authentication:
# MONGODB_URI=mongodb://admin:password@localhost:27017/a-ir-dd2-dev?authSource=admin

# ========== SECURITY ==========
# GENERATE NEW VALUES - Never commit these!

# JWT Secret (32+ hex characters)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_random_32_char_hex_string_here

# Encryption Key for API keys storage (64 hex characters)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_random_64_char_hex_string_here

JWT_EXPIRY=3600000

# ========== LLM PROVIDERS ==========
# Must match frontend keys
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
# OPENAI_API_KEY=YOUR_OPENAI_KEY

# ========== LOGGING ==========
LOG_LEVEL=debug
DEBUG=*
```

### Generate Secure Keys

**Node.js Method**:
```bash
# JWT Secret (32 random bytes as hex)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# JWT_SECRET=f47ac10b5d6049a9f64e3e1f0bb42e8c7d8f9f9d6c5b4a3f2e1d0c9b8a7f6e5

# Encryption Key (same format)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Copy outputs to `backend/.env`**

### Verify Configuration

```bash
# Check files exist
ls -la .env.local          # Frontend
ls -la backend/.env        # Backend

# Check content (careful: contains secrets!)
cat backend/.env | grep -E "JWT_SECRET|ENCRYPTION_KEY"
```

---

## Database Initialization

### Automatic Initialization

On first backend startup, the app automatically:
1. Connects to MongoDB
2. Creates database `a-ir-dd2-dev`
3. Creates collections:
   - `users` (user accounts)
   - `llm_configs` (provider settings per user)
   - `user_settings` (preferences + persisted configs)
   - `workflows` (workflow definitions)
   - `agent_prototypes`, `agent_instances` (workflow nodes)
4. Creates indexes for performance
5. Exits gracefully if MongoDB unavailable

### Manual Verification

Check database creation:
```bash
mongosh

# Connect to database
> use a-ir-dd2-dev
switched to db a-ir-dd2-dev

# List collections
> show collections
agent_instances
agent_prototypes
llm_configs
user_settings
users
workflows

# Check user collection (empty at first)
> db.users.countDocuments()
0
```

### Reset Database (Dev Only)

```bash
mongosh
> use a-ir-dd2-dev
> db.dropDatabase()  # Careful!
# Successfully dropped database

# Restart backend to recreate
```

---

## Starting Services

### Terminal Setup

You'll need **3 terminals**:

1. **Terminal A**: MongoDB (may auto-run)
2. **Terminal B**: Backend Node server
3. **Terminal C**: Frontend Vite dev server

### Start MongoDB (if not auto-running)

**Terminal A**:
```bash
# Windows
net start MongoDB
# Or: mongod

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Docker
docker start mongodb

# Verify
mongosh  # Should connect
```

### Start Backend

**Terminal B** (from project root):
```bash
cd backend
npm run dev

# Expected output (line by line):
# > ts-node-dev --respawn --transpile-only src/server.ts
# [INFO] Waiting for changes...
# ✓ Trying to connect to MongoDB (1/5)...
# ✓ Mongoose connected to server
# ✓ MongoDB connected successfully
# ✓ URI: mongodb://localhost:27017/a-ir-dd2-dev
# ✓ Backend listening on port 3001
```

### Start Frontend

**Terminal C** (from project root):
```bash
npm run dev

# Expected output:
# VITE v6.4.1 ready in 639 ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://192.168.x.x:5173/
```

### Access Application

Open browser: http://localhost:5173

---

## Verification Checklist

### ✅ Backend Health

```bash
# Test API health endpoint
curl http://localhost:3001/api/health

# Expected response:
# {"status":"OK","message":"Backend is running"}
```

### ✅ MongoDB Connection

```bash
mongosh
> db.adminCommand('ping')
# { ok: 1 }
```

### ✅ Frontend Loads

1. Browser shows app interface
2. No console errors (F12 → Console tab)
3. "Mode Invité" visible
4. Register/Login buttons present

### ✅ Authentication Works

1. Click "Inscription"
2. Enter email: `test@example.com`
3. Enter password: `TestPassword123!`
4. Click "S'inscrire"
5. Should redirect to main app (not error)
6. Check MongoDB:
```bash
mongosh
> use a-ir-dd2-dev
> db.users.findOne({ email: "test@example.com" })
# Should show user document
```

### ✅ Settings Persistence

1. Login with credentials above
2. Go to Settings → LLMs
3. Add an API key
4. Save
5. Check MongoDB:
```bash
mongosh
> use a-ir-dd2-dev
> db.llm_configs.findOne({})
# Should show encrypted apiKey
```

---

## Troubleshooting

### "MongoDB connection refused"

```bash
# Check if MongoDB running
mongosh

# If fails, start it:
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# Docker: docker start mongodb
```

### "Port 3001 already in use"

```bash
# Kill process on port 3001
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :3001
kill -9 <PID>

# Or change port in backend/.env:
PORT=3002
```

### "npm install hangs"

```bash
# Clear cache
npm cache clean --force

# Try again with verbose output
npm install --verbose

# If still stuck, try:
npm install --no-save --legacy-peer-deps
```

### "Cannot find module 'X'"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Backend too:
cd backend
rm -rf node_modules package-lock.json
npm install
cd ..
```

---

**Installation Complete!** 🎉

All services should now be running. See main README.md for features and usage.
