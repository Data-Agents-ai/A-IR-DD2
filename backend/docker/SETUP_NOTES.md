# Docker Setup Implementation Notes

## Overview
Professional Docker setup for MongoDB in A-IR-DD2 with automatic schema initialization, test account creation, and production-ready configuration.

## Components

### 1. docker-compose.yml
- **Service**: MongoDB 6.0
- **Container name**: a-ir-dd2-mongodb
- **Port**: 27017 (internal and external)
- **Authentication**: 
  - Username: `admin`
  - Password: `SecurePassword123!`
  - Database: `a-ir-dd2-dev`
- **Volumes**:
  - `mongodb_data`: Persistent data storage
  - `init-mongo.sh`: Initialization script
  - `init-collections.js`: Schema & collections creation
- **Network**: `a-ir-dd2-network` (bridge)
- **Health check**: Enabled (ping every 10s)

### 2. init-mongo.sh
Shell script that:
- Waits for MongoDB to be ready
- Runs the collections initialization script
- Logs completion

### 3. init-collections.js
MongoDB initialization script that automatically creates:

**Collections:**
1. `users` - User accounts with schema validation
   - Unique index on email
   - Pattern validation for email format
   
2. `llm_configs` - LLM provider configurations
   - Compound unique index: userId + provider
   - Index on userId for queries
   
3. `user_settings` - User preferences & encrypted keys (J4.3)
   - Unique index on userId
   - Stores encrypted API keys per provider
   
4. `workflows` - Workflow definitions
   - Index on creator_id (robot governance)
   
5. `agents` - Agent prototypes
   - Index on creator_id
   
6. `workflow_nodes`, `workflow_edges` - Visual workflow components
7. `agent_prototypes`, `agent_instances` - Agent lifecycle tracking

**Default Test User:**
```javascript
{
  email: 'test@example.com',
  password: '$2b$10$bHo5q5ndaVU0e5Blm0CdsOrZhTCUx2vzozpyIM.QqzixYuK8/Wgem',
  passwordHash: '$2b$10$bHo5q5ndaVU0e5Blm0CdsOrZhTCUx2vzozpyIM.QqzixYuK8/Wgem',
  role: 'user',
  isActive: true,
  createdAt: <timestamp>,
  updatedAt: <timestamp>
}
```

Password (plaintext): `TestPassword123`

### 4. .env.docker
Template for backend `.env` configuration:
- MongoDB connection string with Docker credentials
- Port settings
- LLM provider keys (optional)

### 5. README.md
Comprehensive documentation covering:
- Quick start instructions
- Container management
- Backup/restore procedures
- Security considerations
- Troubleshooting

## Key Features

✅ **Automatic Initialization**
- No manual collection creation needed
- Schema validation enabled
- Indexes pre-created for performance

✅ **Production-Ready**
- Authentication enabled
- Persistent data storage
- Health checks configured
- Restart policy: unless-stopped

✅ **Developer-Friendly**
- Test account included
- Default password provided
- Volume persistence (data survives container restart)

✅ **Professional Setup**
- Same configuration as production
- Best practices followed
- Consistent across all environments

## Usage

### Start MongoDB
```bash
cd backend/docker
docker-compose up -d
```

### Verify
```bash
# Check container
docker ps | grep a-ir-dd2-mongodb

# Check logs
docker-compose logs -f mongodb
```

### Connect
```bash
# Using default credentials
mongosh "mongodb://admin:SecurePassword123!@localhost:27017/a-ir-dd2-dev?authSource=admin"
```

### Stop MongoDB
```bash
docker-compose stop     # Keep data
docker-compose start    # Resume
docker-compose down -v  # Delete everything (⚠️ data loss)
```

## Connection Strings

### For Backend (.env)
```env
MONGODB_URI=mongodb://admin:SecurePassword123!@localhost:27017/a-ir-dd2-dev?authSource=admin
```

### For Manual Access
```bash
mongosh "mongodb://admin:SecurePassword123!@localhost:27017/a-ir-dd2-dev?authSource=admin"
```

## Security Notes

### Development (Current)
- ✅ Authentication enabled
- ✅ Strong credentials set
- ✅ Schema validation active
- ⚠️ Credentials in plaintext in docker-compose.yml (development only)

### Production Recommendations
1. **Change credentials**: Use strong, unique passwords
2. **Use secrets management**: Docker secrets or environment variables
3. **Enable encryption at rest**: MongoDB Enterprise or Atlas
4. **Firewall rules**: Never expose 27017 to internet
5. **Backup strategy**: Automated daily backups
6. **Use MongoDB Atlas**: Cloud-managed for production

## Testing with Test Account

1. Start Docker setup: `docker-compose up -d`
2. Start backend: `npm run dev`
3. Start frontend: `npm run dev`
4. Navigate to http://localhost:5173
5. Click "Connexion" (Login)
6. Enter:
   - Email: `test@example.com`
   - Password: `TestPassword123`
7. Successfully logged in → Settings persist to MongoDB

## Data Persistence

MongoDB data is stored in Docker named volume `mongodb_data`:

- **Linux**: `/var/lib/docker/volumes/backend_docker_mongodb_data/_data`
- **macOS**: Docker Desktop VM (managed by Docker)
- **Windows**: Docker Desktop (managed by Docker)

Volume persists across container restarts and deletions (unless `docker-compose down -v`).

## Maintenance

### Backup
```bash
docker exec a-ir-dd2-mongodb mongodump \
  --username admin \
  --password SecurePassword123! \
  --authenticationDatabase admin \
  --db a-ir-dd2-dev \
  --archive=backup.archive
```

### Restore
```bash
docker exec -i a-ir-dd2-mongodb mongorestore \
  --username admin \
  --password SecurePassword123! \
  --authenticationDatabase admin \
  --archive < backup.archive
```

### Connect Interactively
```bash
docker exec -it a-ir-dd2-mongodb mongosh \
  --username admin \
  --password SecurePassword123! \
  --authenticationDatabase admin
```

## Next Steps

1. ✅ Start MongoDB Docker setup
2. ✅ Verify collections and test user created
3. ✅ Configure backend/.env with connection string
4. ✅ Start backend service
5. ✅ Test authentication with test@example.com
6. ✅ Verify settings persistence to MongoDB

---

**Professional MongoDB Docker Setup for A-IR-DD2 J4.3**

Last Updated: December 11, 2025
