# 🤖 Multi-Agent LLM Workflow Orchestrator

A modern React/TypeScript application for creating, configuring, and orchestrating AI agents with visual workflow management. This project features a **hybrid CrewAI + N8N inspired architecture** with specialized robot agents.

## ✨ Features

- **🎨 Visual Workflow Canvas**: React Flow-based drag-and-drop interface
- **🤖 Specialized Robot Agents**: 5 distinct agents (Archi, Bos, Com, Phil, Tim) with specific mandates
- **🔀 Multi-LLM Support**: OpenAI, Anthropic, Google Gemini, Mistral, Grok, Perplexity, Qwen, Kimi
- **📱 Responsive Design**: Modern UI with Tailwind CSS and i18n support
- **🛠️ Python Tool Integration**: Execute Python scripts through secure backend API
- **💾 State Management**: Zustand stores with prototype vs instance architecture
- **🔒 Type Safety**: Full TypeScript coverage with strict type checking

## 🏗️ Architecture

### Frontend (React/TypeScript)
- **Canvas**: React Flow 11.11.4 for visual workflow editing
- **State**: Zustand stores (Design Domain + Runtime Domain) 
- **UI**: Tailwind CSS with custom components
- **LLM Services**: Modular provider architecture

### Backend (Node.js/Express)
- **Tool Execution**: Secure Python script execution
- **API Gateway**: RESTful endpoints for frontend communication
- **Security**: Whitelisted tool validation

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

**Get your Gemini API key**: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

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
