# 📚 Documentation Map - A-IR-DD2 J4.3

Quick reference guide to help you find what you need.

---

## 🚀 Getting Started (Choose Your Path)

### ⚡ **"I want to start NOW" (5 minutes)**
→ Go to [README.md](README.md#-quick-start-5-minutes-with-docker)
- Docker setup with automatic initialization
- Test account ready to use
- Minimal configuration

### 📖 **"I need complete instructions" (15 minutes)**
→ See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)
- Step-by-step for all environments
- Docker recommended, manual setup alternative
- Database initialization explained
- Security configuration details

### 🐳 **"Tell me about Docker"**
→ [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#docker-setup-recommended)
- Why use Docker
- What gets created automatically
- Verification steps
- Troubleshooting Docker issues

### 🔧 **"I want to configure manually"**
→ [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#manual-mongodb-setup)
- Manual MongoDB installation by OS
- Environment file configuration
- Security key generation
- Database collection setup

---

## 🔍 Finding Specific Information

### MongoDB & Database
| Need | Location |
|------|----------|
| MongoDB installation | [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#manual-mongodb-setup) |
| Docker MongoDB setup | [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#docker-setup-recommended) |
| Database collections | [backend/docker/init-collections.js](backend/docker/init-collections.js) |
| Docker configuration | [backend/docker/docker-compose.yml](backend/docker/docker-compose.yml) |
| Container management | [backend/docker/README.md](backend/docker/README.md) |

### Authentication & User Settings (J4.3)
| Need | Location |
|------|----------|
| How authentication works | [README.md](README.md#-authentication--persistence-j43) |
| Default test account | [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#quick-start-5-minutes-with-docker) |
| User settings persistence | [README.md](README.md#-authentication--persistence-j43) |
| Encrypted API keys | [README.md](README.md#-authentication--persistence-j43) |

### Configuration & Environment
| Need | Location |
|------|----------|
| Frontend .env setup | [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#environment-configuration) |
| Backend .env setup | [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#environment-configuration) |
| JWT secret generation | [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#quick-start-5-minutes-with-docker) |
| LLM provider keys | [README.md](README.md#--configuration) |

### Troubleshooting
| Issue | Location |
|-------|----------|
| MongoDB won't start | [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#troubleshooting-docker-setup) |
| Docker container issues | [backend/docker/README.md](backend/docker/README.md#troubleshooting) |
| Backend/Frontend won't run | [README.md](README.md#-troubleshooting) |
| Authentication errors | [README.md](README.md#-troubleshooting) |
| Settings not persisting | [README.md](README.md#-troubleshooting) |

### Development & Architecture
| Need | Location |
|-------|----------|
| Project structure | [README.md](README.md#-development) |
| Tech stack | [README.md](README.md#-development) |
| Robot specialization | [README.md](README.md#-development) |
| LLM providers support | [README.md](README.md#--configuration) |

---

## 📄 File Reference

### Main Documentation

**[README.md](README.md)** - Primary reference
- 🎯 Features overview
- ⚡ Quick start with Docker
- 🔧 Installation steps
- 🔒 Authentication & persistence
- 🛠️ Development guide
- 🚨 Troubleshooting

**[INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)** - Detailed setup
- 📋 System requirements
- 🐳 Docker setup (recommended)
- 🔧 Manual MongoDB installation
- 📝 Environment configuration
- ✅ Verification checklist
- 🐛 Advanced troubleshooting

**[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - What changed in J4.3
- 📋 New files created
- 📝 Updated files
- 🎯 Features implemented
- 🔧 Technical details
- 🧪 Validation & testing

### Docker Configuration

**[backend/docker/README.md](backend/docker/README.md)**
- Quick start
- Container management
- Backup & restore
- Security recommendations
- Production deployment

**[backend/docker/SETUP_NOTES.md](backend/docker/SETUP_NOTES.md)**
- Technical implementation
- Component descriptions
- Data persistence
- Maintenance procedures

**[backend/docker/docker-compose.yml](backend/docker/docker-compose.yml)**
- Container configuration
- Volume setup
- Network configuration
- Health checks

**[backend/docker/init-collections.js](backend/docker/init-collections.js)**
- MongoDB schema definitions
- Collection validation
- Index creation
- Test user insertion

### Scripts

**[verify-docker-setup.ps1](verify-docker-setup.ps1)**
- Automated verification
- Docker checks
- MongoDB validation
- User account verification

---

## 🎯 Common Tasks

### I want to...

**...start the application quickly**
1. See: [README.md Quick Start](README.md#-quick-start-5-minutes-with-docker)
2. Use Docker: `cd backend/docker && docker-compose up -d`
3. Configure: `cp backend/docker/.env.docker backend/.env`
4. Start: Terminal 1: `cd backend && npm run dev`, Terminal 2: `npm run dev`

**...set up MongoDB manually**
1. See: [INSTALLATION_GUIDE.md Manual Setup](INSTALLATION_GUIDE.md#manual-mongodb-setup)
2. Choose your OS (Windows/macOS/Linux)
3. Follow platform-specific instructions

**...use Docker MongoDB**
1. See: [INSTALLATION_GUIDE.md Docker Setup](INSTALLATION_GUIDE.md#docker-setup-recommended)
2. Run: `cd backend/docker && docker-compose up -d`
3. Verify: Check MongoDB initialization logs

**...test authentication**
1. Start all services
2. Go to http://localhost:5173
3. Click "Connexion"
4. Login with: test@example.com / TestPassword123

**...enable LLM providers**
1. See: [README.md Configuration](README.md#--configuration)
2. Add API key to `backend/.env`
3. Add to `frontend/.env.local`
4. Restart services

**...verify everything is working**
1. Run: `./verify-docker-setup.ps1` (if using Docker)
2. Or: See [INSTALLATION_GUIDE.md Verification](INSTALLATION_GUIDE.md#verification-checklist)

**...troubleshoot an issue**
1. Identify the issue category (MongoDB, Auth, Frontend, etc.)
2. Find in [README.md Troubleshooting](README.md#-troubleshooting)
3. If Docker: See [backend/docker/README.md Troubleshooting](backend/docker/README.md#troubleshooting)
4. For setup: See [INSTALLATION_GUIDE.md Troubleshooting](INSTALLATION_GUIDE.md#troubleshooting-docker-setup)

---

## 🔗 Quick Links

| Task | Link |
|------|------|
| Start MongoDB (Docker) | `cd backend/docker && docker-compose up -d` |
| Check Docker status | `docker ps \| grep a-ir-dd2-mongodb` |
| View logs | `docker-compose -f backend/docker/docker-compose.yml logs -f` |
| Connect to MongoDB | `docker exec -it a-ir-dd2-mongodb mongosh --username admin --password SecurePassword123! --authenticationDatabase admin` |
| Generate JWT_SECRET | `node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"` |
| Generate ENCRYPTION_KEY | `node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"` |
| Verify setup | `./verify-docker-setup.ps1` |
| View Docker README | [backend/docker/README.md](backend/docker/README.md) |

---

## 📞 Support

**For Docker issues**: See [backend/docker/README.md](backend/docker/README.md#troubleshooting)

**For setup issues**: See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#troubleshooting-docker-setup)

**For general issues**: See [README.md](README.md#-troubleshooting)

**For technical details**: See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## 📊 Documentation Structure

```
A-IR-DD2/
├── README.md                          # Main reference (start here!)
├── INSTALLATION_GUIDE.md              # Complete setup guide
├── IMPLEMENTATION_SUMMARY.md          # What's new in J4.3
├── DOCUMENTATION_MAP.md               # This file
├── verify-docker-setup.ps1            # Automated verification
│
└── backend/docker/
    ├── README.md                      # Docker usage guide
    ├── SETUP_NOTES.md                 # Technical implementation
    ├── docker-compose.yml             # Container configuration
    ├── init-collections.js            # MongoDB schema
    ├── init-mongo.sh                  # Initialization script
    └── .env.docker                    # Environment template
```

---

**Last Updated**: December 11, 2025  
**Version**: J4.3 Complete

Navigation made easy. Start with [README.md](README.md) for quick start, or [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) for detailed instructions.
