# A-IR-DD2 - AI Robot Design & Development System V2

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

> **Advanced Multi-LLM Workflow Orchestrator with Robot Specialization Architecture**

A-IR-DD2 is a next-generation AI orchestration platform that implements a specialized robot architecture for managing complex multi-LLM workflows. The system features 5 specialized AI robots (Archi, Bos, Com, Phil, Tim) with distinct mandates, N8N-style visual workflow editing, and enterprise-grade governance.

## 🚀 Key Features

### �️ Robot Specialization Architecture V2
- **Archi** (AR_001): Agent creation, workflow orchestration, system architecture
- **Bos** (BO_002): Monitoring, supervision, cost tracking, debugging
- **Com** (CO_003): API connections, authentication, external integrations  
- **Phil** (PH_004): Data transformation, file handling, validation
- **Tim** (TI_005): Event triggers, scheduling, rate limiting, async management

### 🔄 N8N-Style Workflow Editor
- Visual drag & drop workflow builder with React Flow
- Robot-specific node templates and configurations
- Real-time execution monitoring and validation
- Multi-robot workflow orchestration with governance

### 🤖 Multi-LLM Support
- **8+ LLM Providers**: Gemini, OpenAI, Anthropic, Mistral, Grok, Perplexity, Qwen, Kimi
- **Advanced Capabilities**: Function calling, image generation/editing, web search, OCR, embeddings
- **Smart Context Management**: Auto-summarization, token optimization, conversation history

### 🔐 Enterprise Security & Governance
- Creator ID validation and robot permission system
- Secure API key management with environment variables
- Audit trails and workflow validation
- Zero data persistence of sensitive information

## 📦 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with ES2020 support

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/A-IR-DD2.git
cd A-IR-DD2
```

2. **Install dependencies**
```bash
# Frontend dependencies
npm install

# Backend dependencies  
cd backend && npm install && cd ..
```

3. **Configure environment variables**
```bash
# Create environment file (NEVER commit this file!)
cp .env.example .env.local

# Edit .env.local with your API keys
# Minimum requirement: GEMINI_API_KEY
```

4. **Start development servers**
```bash
# Terminal 1: Frontend (http://localhost:5173)
npm run dev

# Terminal 2: Backend (http://localhost:3001)  
cd backend && npm run dev
```

### Environment Configuration

⚠️ **SECURITY WARNING**: Never commit actual API keys to version control!

Create a `.env.local` file in the project root:

```env
# Required - Get your key at: https://aistudio.google.com/api-keys
GEMINI_API_KEY=your_gemini_api_key_here

# Optional - Additional LLM providers
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key
# MISTRAL_API_KEY=your_mistral_key
# GROK_API_KEY=your_grok_key
# PERPLEXITY_API_KEY=your_perplexity_key
# QWEN_API_KEY=your_qwen_key
# KIMI_API_KEY=your_kimi_key
```

## 🏛️ Architecture Overview

### System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Python Tools  │
│   React + TS    │◄──►│   Node.js + TS   │◄──►│   Whitelisted   │
│   Robot UI      │    │   LLM Services   │    │   Scripts       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Robot Specialization Matrix
| Robot | Primary Domain | Capabilities | UI Color |
|-------|---------------|--------------|----------|
| **Archi** | Architecture & Agents | Workflow design, agent creation | Cyan |
| **Bos** | Monitoring | Supervision, cost tracking | Red |
| **Com** | Connections | APIs, auth, integrations | Blue |
| **Phil** | Data Processing | File handling, validation | Purple |
| **Tim** | Events & Timing | Triggers, scheduling | Orange |

### Workflow Editor Architecture
- **React Flow Canvas**: Visual node-based workflow builder
- **Robot-Specific Nodes**: Specialized components per robot domain
- **Zustand State Management**: Efficient workflow state with persistence
- **Real-time Validation**: Governance and structural validation
- **Execution Engine**: Multi-robot workflow orchestration

## 🛠️ Development

### Project Structure
```
A-IR-DD2/
├── components/           # React UI components
│   ├── workflow/        # Workflow editor components
│   ├── modals/          # Modal dialogs
│   └── panels/          # Sidebar panels
├── stores/              # Zustand state management
├── services/            # LLM provider services
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── i18n/                # Internationalization
├── backend/             # Node.js API server
│   └── src/             # Backend source code
└── documentation/       # Technical documentation
```

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, React Flow
- **Backend**: Node.js, Express, TypeScript  
- **Build System**: Vite with Hot Module Replacement
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🔒 Security & Privacy

### Data Protection
- **No Data Collection**: Zero telemetry or user tracking
- **Local Processing**: All data remains on your machine
- **API Key Security**: Environment-based configuration only
- **Audit Compliance**: Full audit trails for enterprise use

### Security Best Practices
- Regular dependency audits with `npm audit`
- Secure environment variable management
- Input validation and sanitization
- CORS and CSP headers implementation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support & Community

- **Issues**: [GitHub Issues](https://github.com/yourusername/A-IR-DD2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/A-IR-DD2/discussions)
- **Documentation**: [Project Wiki](https://github.com/yourusername/A-IR-DD2/wiki)

## 🙏 Acknowledgments

- React Flow team for the excellent workflow visualization library
- All LLM providers for their powerful APIs
- Open source community for inspiration and contributions

---

**Built with ❤️ by the A-IR-DD2 Team**

*Empowering the future of AI orchestration through specialized robot architecture.*

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.x
- npm or yarn

### 1. Install Dependencies
⚠️ **IMPORTANT**: Dependencies are NOT included in the ZIP. You must install them first.

```bash
# Frontend dependencies (from project root)
npm install

# Backend dependencies  
cd backend && npm install && cd ..
```

### 2. Configure API Keys
⚠️ **REQUIRED**: Edit `.env.local` with your actual API keys.

Create or edit `.env.local` in the project root:
```bash
# Required: Google Gemini API Key
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Optional: Additional LLM providers
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key
```

**Get your Gemini API key**: 
[https://aistudio.google.com/api-keys] or
[https://makersuite.google.com/app/apikey]

### 3. Start Services
```bash
# Terminal 1: Start backend (port 3001)
cd backend && npm run dev

# Terminal 2: Start frontend (port 5173) 
npm run dev
```

### 4. Access Application
Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🤖 Robot Agents

Each robot has specialized capabilities:

- **🏗️ Archi**: Agent prototype creation, workflow orchestration
- **👔 Bos**: Supervision, debugging, cost monitoring  
- **🔗 Com**: API connections, external integrations
- **📊 Phil**: Data transformation, file handling, validation
- **⏰ Tim**: Event triggers, scheduling, async management

## 🛠️ Development

### Project Structure
```
├── components/          # React components
├── services/           # LLM provider services  
├── stores/            # Zustand state management
├── types.ts           # TypeScript definitions
├── utils/             # Utility functions
├── backend/           # Node.js API server
└── data/              # Templates and configurations
```

### Key Technologies
- **React 18** with TypeScript
- **React Flow 11** for visual canvas
- **Zustand 5** for state management  
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Express.js** backend with TypeScript

## 📋 Available Scripts

### Frontend
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
```

### Backend
```bash
npm run dev         # Start development server (ts-node-dev)
npm run build       # Compile TypeScript
npm start           # Run compiled JavaScript
```

## 🔧 Configuration

### LLM Providers
Configure providers in the application settings. Each provider supports different capabilities:
- Chat completion
- Function calling  
- Image generation/editing
- Web search
- File upload

### Python Tools
Add custom Python tools in `utils/pythonTools/` and register them in `backend/src/config.ts`:
```typescript
export const WHITELISTED_PYTHON_TOOLS = [
    'search_web_py',
    // Add your tools here
];
```

## 🔒 Security

- API keys stored locally only
- Python tool execution whitelist
- No external data transmission (except to configured LLM APIs)
- Type-safe API contracts

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes  
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ using React, TypeScript, and modern web technologies**
