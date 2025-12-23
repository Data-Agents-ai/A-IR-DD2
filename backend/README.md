# A-IR-DD2 Backend & MongoDB Setup

This guide covers the setup for the Node.js backend and the MongoDB Docker container.

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Node.js 18+ installed

### 1. Configure Environment

```bash
# From backend directory
cd backend

# Copy the Docker .env template to .env
# (The docker setup now uses this central .env file)
cp docker/.env.docker .env

# Edit .env and generate security keys
# 1. Generate JWT_SECRET:
#    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#
# 2. Generate ENCRYPTION_KEY:
#    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#
# Paste outputs into .env
```

### 2. Start MongoDB Container

```bash
# Go to docker directory
cd docker

# Start MongoDB container
# (It will load variables from ../.env automatically)
docker-compose up -d

# Verify container is running
docker ps | grep a-ir-dd2-mongodb

# Return to backend root
cd ..
```

### 3. Start Backend

```bash
# From backend directory
npm run dev

# Should show:
# ✓ Trying to connect to MongoDB (1/5)...
# ✓ Mongoose connected to server
# ✓ MongoDB connected successfully
# ✓ Backend listening on port 3001
```

### Verify Installation

```bash
# Test MongoDB connection
docker exec -it a-ir-dd2-mongodb mongosh \
  --username ${MONGO_USER} \
  --password ${MONGO_PASSWORD} \
  --authenticationDatabase admin \
  a-ir-dd2-dev \
  --eval "show collections"

# Expected output:
# agent_instances
# agent_prototypes
# agents
# llm_configs
# user_settings
# users
# workflow_edges
# workflow_nodes
# workflows

# Verify test user was created
docker exec -it a-ir-dd2-mongodb mongosh \
  --username ${MONGO_USER} \
  --password ${MONGO_PASSWORD} \
  --authenticationDatabase admin \
  a-ir-dd2-dev \
  --eval "db.users.find()"

# Should show: test@example.com account
```

## Default Test User

A test user account is automatically created during initialization:

| Field | Value |
|-------|-------|
| **Email** | `test@example.com` |
| **Password** | `TestPassword123` |
| **Status** | Active |
| **Purpose** | Testing authentication flow without creating new accounts |

### Using Test Account

1. Start MongoDB: `cd docker && docker-compose up -d`
2. Start backend: `npm run dev`
3. Start frontend: `npm run dev`
4. Open http://localhost:5173
5. Click "Connexion" (Login)
6. Enter:
   - Email: `test@example.com`
   - Password: `TestPassword123`
7. Click "Se connecter" → Should log in successfully
8. Go to Settings → Clés API to test encrypted storage

## What Gets Created

### Collections (Automatically Created)
- **users**: User accounts with schema validation
- **llm_configs**: Per-user LLM provider configurations
- **user_settings** (J4.3): Encrypted API keys & preferences
- **workflows**: Workflow definitions
- **agents**: Agent prototypes
- **workflow_nodes**: Workflow visual nodes
- **workflow_edges**: Workflow connections
- **agent_prototypes**: Agent templates
- **agent_instances**: Runtime agent tracking

### Indexes (Automatically Created)
- `users.email` (unique)
- `llm_configs.userId + provider` (unique)
- `user_settings.userId` (unique)
- `workflows.creator_id`
- `agents.creator_id`
- And more for optimal query performance

### Schema Validation
All collections have JSON Schema validation enabled to ensure data integrity.

## Managing the Container

### View Logs
```bash
# Real-time logs (from docker directory)
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail 100 mongodb
```

### Stop Container
```bash
# Stop but keep data
docker-compose stop

# Resume
docker-compose start
```

### Delete Everything (⚠️ Data Loss)
```bash
# Stop and remove container AND data
docker-compose down -v
```

### Connect to MongoDB Directly
```bash
# Interactive shell (assurez-vous que vos variables d'environnement MONGO_USER/MONGO_PASSWORD sont définies)
docker exec -it a-ir-dd2-mongodb mongosh \
  --username ${MONGO_USER} \
  --password ${MONGO_PASSWORD} \
  --authenticationDatabase admin

# In mongosh:
> use a-ir-dd2-dev
> db.users.find()
> exit()
```

## Security Considerations

### Current Setup (Development)
- ✅ Authentication enabled (admin/SecurePassword123!)
- ✅ Unique indexes prevent duplicates
- ✅ Schema validation enabled
- ⚠️ Default password - change for production!

### Production Recommendations
1. **Change default credentials** in `docker-compose.yml`:
   ```yaml
   MONGO_INITDB_ROOT_USERNAME: prod_admin
   MONGO_INITDB_ROOT_PASSWORD: <strong-random-password>
   ```

2. **Enable Encryption at Rest** (MongoDB Enterprise):
   ```yaml
   command: --enableEncryption --encryptionKeyFile /path/to/key
   ```

3. **Use MongoDB Atlas** (Cloud):
   - Managed backups
   - Global replication
   - Automatic updates
   - HTTPS/TLS by default

4. **Network Security**:
   - Never expose MongoDB port 27017 to internet
   - Use firewall rules
   - Restrict to backend container only

5. **Backup Strategy**:
   - Automated daily backups
   - Test restore procedures
   - Off-site backup storage

## Files Reference

- **docker/docker-compose.yml**: Container orchestration configuration
- **docker/init-mongo.sh**: Initialization shell script
- **docker/init-collections.js**: MongoDB schema and index creation
- **docker/.env.docker**: Template for backend/.env configuration

## Environment Variables

Key variables from `docker/.env.docker`:

```env
# Must match docker-compose.yml environment variables
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=SecurePassword123!
MONGO_INITDB_DATABASE=a-ir-dd2-dev

# Connection string
MONGODB_URI=mongodb://admin:SecurePassword123!@localhost:27017/a-ir-dd2-dev?authSource=admin

# Security (Generate these!)
JWT_SECRET=<your-32-char-hex>
ENCRYPTION_KEY=<your-64-char-hex>
```

## Next Steps

1. ✅ Configure backend/.env: Copy `docker/.env.docker` and generate keys
2. ✅ Start MongoDB: `cd docker && docker-compose up -d`
3. ✅ Start backend: `npm run dev`
4. ✅ Start frontend: `npm run dev` (from root)
5. ✅ Verify: Test authentication at http://localhost:5173

---

**Professional Backend & MongoDB setup for A-IR-DD2 J4.3**

Built with Docker best practices for development and production readiness.