# Guide Architecture SOLID & LLM - A-IR-DD2

> **Objectif** : Référence complète de l'architecture logicielle, patterns SOLID/DDD, et gestion fine des spécificités LLM.

---

## 🏗️ Architecture Globale

### Séparation Domain-Driven Design (DDD)

L'application respecte une **séparation stricte** entre deux domaines :

```
┌─────────────────────────────────────────────────────┐
│                  DESIGN DOMAIN                      │
│  Responsabilité : Prototypes, définitions statiques │
│  Store : useDesignStore (Zustand)                   │
│  Fichiers : types.ts, agentTemplates.ts             │
│  Persistence : JSON-serializable                    │
└─────────────────────────────────────────────────────┘
                         ↕️
┌─────────────────────────────────────────────────────┐
│                 RUNTIME DOMAIN                      │
│  Responsabilité : Exécution, états volatiles        │
│  Store : useRuntimeStore (Zustand)                  │
│  Fichiers : services/*, V2AgentNode.tsx             │
│  Persistence : In-memory, WebSocket sync            │
└─────────────────────────────────────────────────────┘
```

**⚠️ Règle Critique** : Ne JAMAIS mélanger les responsabilités.  
❌ Mauvais : Stocker l'état d'exécution dans les prototypes  
✅ Bon : Prototype (Design) → Instance (Runtime)

---

## 📐 Principes SOLID Appliqués

### S - Single Responsibility Principle

**Chaque service a UNE responsabilité** :

```typescript
// ✅ BON : Service dédié par provider
// openAIService.ts
export const generateContentStream = async (apiKey, model, systemInstruction, history, tools, outputConfig)
export const generateImage = async (apiKey, prompt)

// geminiService.ts
export const generateContentStream = async (apiKey, model, systemInstruction, history, tools, outputConfig)
export const generateContentWithSearch = async (apiKey, model, prompt, systemInstruction)

// ❌ MAUVAIS : Service monolithique
// llmService.ts (si tout était dedans)
export const doEverything = async (provider, ...) { /* 1000 lignes */ }
```

### O - Open/Closed Principle

**Ouvert à l'extension, fermé à la modification** :

#### Exemple : Ajout d'un nouveau LLM

1. **Créer le service** : `services/newLLMService.ts`
2. **Implémenter le contrat** :
   ```typescript
   export const generateContentStream = async function* (...) { /* implémentation */ }
   export const generateContent = async (...) { /* implémentation */ }
   // Optionnel :
   export const generateImage = async (...) { /* si supporté */ }
   ```
3. **Enregistrer dans dispatcher** : `services/llmService.ts`
   ```typescript
   switch (provider) {
     case LLMProvider.NewLLM:
       return newLLMService.generateContentStream(...);
   }
   ```
4. **Déclarer capabilities** : `llmModels.ts`
   ```typescript
   [LLMProvider.NewLLM]: {
     [LLMCapability.Chat]: true,
     [LLMCapability.FunctionCalling]: true,
     // ...
   }
   ```

**Aucune modification des composants UI** → Capabilities-driven rendering.

### L - Liskov Substitution Principle

**Tous les services LLM respectent le même contrat** :

```typescript
// Contrat implicite (à formaliser en interface TS)
interface LLMService {
  generateContentStream(
    apiKey: string,
    model: string,
    systemInstruction: string,
    history: ChatMessage[],
    tools?: Tool[],
    outputConfig?: OutputConfig
  ): AsyncGenerator<StreamChunk>;

  generateContent(
    apiKey: string,
    model: string,
    systemInstruction: string,
    history: ChatMessage[],
    tools?: Tool[],
    outputConfig?: OutputConfig
  ): Promise<{ text: string; toolCalls?: ToolCall[] }>;

  // Optionnel
  generateImage?(apiKey: string, prompt: string): Promise<{ image?: string; error?: string }>;
  generateContentWithSearch?(apiKey: string, model: string, prompt: string, systemInstruction: string): Promise<{ text: string }>;
}
```

**Substitution** : `openAIService` peut être remplacé par `geminiService` sans casser le code appelant.

### I - Interface Segregation Principle

**Pas d'interface monolithique** :

```typescript
// ✅ BON : Capabilities granulaires
enum LLMCapability {
  Chat,
  ImageGeneration,
  ImageModification,
  WebSearch,
  // ...
}

// Chaque LLM déclare ce qu'il PEUT faire
const geminiCapabilities = {
  [LLMCapability.Chat]: true,
  [LLMCapability.ImageGeneration]: true,
  [LLMCapability.WebSearch]: true,
};

// ❌ MAUVAIS : Interface forcée
interface ForcedLLM {
  chat(): void;
  generateImage(): void; // Obligatoire même si non supporté
  search(): void;
}
```

### D - Dependency Inversion Principle

**Dépendre d'abstractions, pas de concrétions** :

```typescript
// ✅ BON : V2AgentNode dépend de LLMCapability (abstraction)
{agent.capabilities?.includes(LLMCapability.ImageGeneration) && (
  <Button onClick={handleOpenImagePanel}>
    <ImageIcon />
  </Button>
)}

// ❌ MAUVAIS : Dépendre de provider concret
{agent.llmProvider === LLMProvider.Gemini && (
  <Button>Generate Image</Button>
)}
```

---

## 🧩 Patterns de Conception (GoF)

### Factory Pattern (implicit)

**llmService.ts** agit comme Factory :

```typescript
export const generateContentStream = function* (provider, ...) {
  switch (provider) {
    case LLMProvider.OpenAI:
      return openAIService.generateContentStream(...);
    case LLMProvider.Gemini:
      return geminiService.generateContentStream(...);
    // ...
  }
};
```

### Strategy Pattern

**OutputConfig** permet de changer la stratégie de formatage :

```typescript
interface OutputConfig {
  format?: 'json' | 'markdown' | 'plain';
  schema?: JSONSchema;
  strictMode?: boolean;
}

// Le service LLM adapte son comportement selon la stratégie
if (outputConfig?.format === 'json') {
  systemInstruction += "\nRespond ONLY with valid JSON matching this schema...";
}
```

### Observer Pattern

**Zustand stores** implémentent le pattern Observer :

```typescript
// Composants "observent" le store
const messages = useRuntimeStore(state => state.nodeMessages[nodeId]);

// Changement d'état notifie automatiquement les observateurs
addNodeMessage(nodeId, message); // → V2AgentNode re-render
```

### Adapter Pattern

**pythonExecutor.ts** adapte l'interface subprocess au contrat Tool :

```typescript
// Contrat Tool : { name, parameters, description }
// Interface subprocess : stdin/stdout/stderr

export const executePythonTool = async (toolName: string, args: any): Promise<any> => {
  const result = await execFile('python3', [scriptPath, JSON.stringify(args)]);
  return JSON.parse(result.stdout); // Adaptation subprocess → JSON
};
```

---

## 🔀 Gestion Multi-LLM

### Architecture Dispatcher

**llmService.ts** centralise le routing :

```typescript
// Point d'entrée unique
export const generateContentStream = function* (provider: LLMProvider, ...) {
  // Validation provider
  if (!Object.values(LLMProvider).includes(provider)) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // Dispatch vers service spécialisé
  switch (provider) {
    case LLMProvider.OpenAI:
      yield* openAIService.generateContentStream(...);
      break;
    case LLMProvider.Gemini:
      yield* geminiService.generateContentStream(...);
      break;
    // ...
  }
};
```

### Normalisation des Messages

**Problème** : Chaque LLM a son format de message.

**Solution** : Type `ChatMessage` commun + adaptation dans chaque service.

```typescript
// Format interne (types.ts)
interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'tool' | 'tool_result';
  text: string;
  image?: string;
  toolCalls?: ToolCall[];
}

// Adaptation OpenAI
const openAIMessages = history.map(msg => ({
  role: msg.sender === 'user' ? 'user' : 'assistant',
  content: msg.text,
  tool_calls: msg.toolCalls?.map(adaptToolCall)
}));

// Adaptation Gemini
const geminiMessages = history.map(msg => ({
  role: msg.sender === 'user' ? 'user' : 'model',
  parts: [{ text: msg.text }]
}));
```

### Gestion des Capabilities

**Déclaration centralisée** : `llmModels.ts`

```typescript
export const LLM_MODELS: Record<LLMProvider, { [key in LLMCapability]?: boolean }> = {
  [LLMProvider.Gemini]: {
    [LLMCapability.Chat]: true,
    [LLMCapability.FileUpload]: true,
    [LLMCapability.ImageGeneration]: true,
    [LLMCapability.ImageModification]: true,
    [LLMCapability.WebSearch]: true,
    [LLMCapability.FunctionCalling]: true,
  },
  [LLMProvider.DeepSeek]: {
    [LLMCapability.Chat]: true,
    [LLMCapability.FunctionCalling]: true,
    [LLMCapability.Reasoning]: true, // Spécificité DeepSeek
    [LLMCapability.CacheOptimization]: true,
  },
  [LLMProvider.LMStudio]: {
    [LLMCapability.Chat]: true,
    [LLMCapability.LocalDeployment]: true, // Spécificité LMStudio
    [LLMCapability.CodeSpecialization]: true,
  },
};
```

**Consommation dans UI** :

```typescript
const agent = {
  llmProvider: LLMProvider.Gemini,
  capabilities: LLM_MODELS[LLMProvider.Gemini]
};

// Rendering conditionnel
{agent.capabilities[LLMCapability.ImageGeneration] && <ImageButton />}
```

---

## 🔧 Spécificités LLM par Provider

### OpenAI

**Streaming** : Server-Sent Events (SSE)
```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  body: JSON.stringify({ stream: true, ... })
});
const reader = response.body.getReader();
for await (const chunk of readChunks(reader)) {
  // Parsing "data: {...}\n\n"
  yield JSON.parse(chunk);
}
```

**Function Calling** : Format JSON strict
```typescript
tools: [{
  type: 'function',
  function: {
    name: 'textAnalysis',
    parameters: { /* JSON Schema */ }
  }
}]
```

**Image Generation** : DALL-E endpoint séparé
```typescript
POST /v1/images/generations
{ prompt: "...", size: "1024x1024" }
```

### Gemini (Google)

**Streaming** : `streamGenerateContent`
```typescript
const result = await model.generateContentStream({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  tools: [{ functionDeclarations: [...] }]
});
for await (const chunk of result.stream) {
  yield chunk.text();
}
```

**Web Search** : Capability native via `tools`
```typescript
tools: [{ googleSearchRetrieval: {} }]
```

**Image Modification** : `editImage` API
```typescript
const result = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [
      { inlineData: { mimeType: 'image/png', data: base64 } },
      { text: 'Make background blurred' }
    ]
  }]
});
```

### Anthropic (Claude)

**Messages API** : Format propriétaire
```typescript
{
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: '...' }],
  system: 'System prompt...' // Séparé de messages
}
```

**Tool Use** : Beta feature
```typescript
headers: { 'anthropic-version': '2023-06-01', 'anthropic-beta': 'tools-2024-04-04' }
tools: [{ name: '...', input_schema: { /* JSON Schema */ } }]
```

### DeepSeek

**Reasoning Mode** : Modèles spécialisés
```typescript
model: 'deepseek-reasoner' // vs 'deepseek-chat'
// Retourne "thinking" process avant réponse finale
```

**Cache Optimization** : Prompt caching
```typescript
// Réutilise les prompts système fréquents pour réduire coûts
cache_key: hash(systemInstruction)
```

### LMStudio (Local)

**Endpoint Custom** : API compatible OpenAI
```typescript
const baseURL = llmConfig.apiKey; // Ex: "http://localhost:3928"
// Utilise openAIService avec baseURL custom
```

**Model Discovery** : `/v1/models` endpoint
```typescript
const models = await fetch(`${baseURL}/v1/models`).then(r => r.json());
// Liste modèles disponibles localement
```

### Mistral

**Embedding** : Modèles dédiés
```typescript
model: 'mistral-embed'
// Retourne vecteurs pour RAG
```

**OCR** : Support images
```typescript
content: [
  { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
  { type: 'text', text: 'Extract text from this image' }
]
```

### Perplexity

**Web Search Natif** : Toutes requêtes font recherche
```typescript
model: 'pplx-70b-online' // vs 'pplx-70b-chat'
// Retourne sources avec réponse
response: { text: '...', citations: ['url1', 'url2'] }
```

### Qwen (Alibaba)

**Multimodal** : Support image/audio/video
```typescript
content: [
  { type: 'file', file_url: 'https://...' },
  { type: 'text', text: 'Analyze this video' }
]
```

### Kimi (Moonshot)

**Long Context** : 200k tokens
```typescript
model: 'moonshot-v1-128k' // ou 'moonshot-v1-32k'
// Optimisé pour documents longs
```

### Grok (xAI)

**Real-time Data** : Accès X/Twitter
```typescript
// Capability implicite : données temps réel
response: { text: '...', timestamp: '...' }
```

---

## 🗂️ Structure des Stores Zustand

### useDesignStore (Design Domain)

```typescript
interface DesignStore {
  // Prototypes (statiques)
  agentPrototypes: AgentPrototype[];
  connectionPrototypes: ConnectionPrototype[];
  eventPrototypes: EventPrototype[];
  
  // Instances (références)
  agentInstances: AgentInstance[]; // { id, prototypeId, position }
  
  // Actions CRUD
  addAgentPrototype: (prototype: AgentPrototype) => void;
  updateAgentPrototype: (id: string, updates: Partial<AgentPrototype>) => void;
  deleteAgentPrototype: (id: string) => void;
  
  // Validation intégrité
  validateWorkflowIntegrity: () => ValidationResult;
  cleanupOrphanedInstances: () => void;
}
```

### useRuntimeStore (Runtime Domain)

```typescript
interface RuntimeStore {
  // États volatiles
  nodeMessages: Record<string, ChatMessage[]>; // nodeId → messages
  executingNodes: Set<string>;
  
  // Configuration LLM (runtime)
  llmConfigs: LLMConfig[];
  
  // UI State
  isImagePanelOpen: boolean;
  currentImageNodeId: string | null;
  fullscreenImage: { src: string; mimeType: string } | null;
  
  // Actions
  addNodeMessage: (nodeId: string, message: ChatMessage) => void;
  setNodeMessages: (nodeId: string, messages: ChatMessage[]) => void;
  clearNodeMessages: (nodeId: string) => void;
  
  setNodeExecuting: (nodeId: string, isExecuting: boolean) => void;
}
```

**Synchronisation** : App.tsx maintient la cohérence entre les deux stores.

```typescript
// App.tsx
const handleImageGenerated = (nodeId: string, imageBase64: string) => {
  const imageMessage: ChatMessage = { /* ... */ };
  
  // Double mise à jour
  handleUpdateNodeMessages(nodeId, prev => [...prev, imageMessage]); // React state (legacy)
  addNodeMessage(nodeId, imageMessage); // Zustand store (V2)
};
```

---

## 🔀 Workflow de Tool Execution

### 1. Déclaration Tool (Agent Config)

```typescript
const agent: Agent = {
  tools: ['textAnalysis', 'imageProcessing'],
  // ...
};
```

### 2. Transmission au LLM

```typescript
// Dans service LLM
const tools = agent.tools.map(toolName => ({
  type: 'function',
  function: {
    name: toolName,
    description: TOOL_DESCRIPTIONS[toolName],
    parameters: TOOL_SCHEMAS[toolName]
  }
}));

const response = await llm.chat({ tools, ... });
```

### 3. LLM retourne Tool Call

```typescript
// Streaming chunk
{
  type: 'tool_call',
  toolCall: {
    id: 'call_abc123',
    name: 'textAnalysis',
    arguments: '{"text": "Analyze this"}'
  }
}
```

### 4. Exécution Backend

```typescript
// V2AgentNode.tsx détecte tool call
if (chunk.response?.toolCall) {
  const result = await fetch('/api/execute-python-tool', {
    method: 'POST',
    body: JSON.stringify({
      toolName: chunk.response.toolCall.name,
      args: JSON.parse(chunk.response.toolCall.arguments)
    })
  });
}
```

### 5. Backend exécute Python

```typescript
// backend/src/server.ts
app.post('/api/execute-python-tool', async (req, res) => {
  const { toolName, args } = req.body;
  
  // Validation whitelist
  if (!WHITELISTED_PYTHON_TOOLS.includes(toolName)) {
    return res.status(403).json({ error: 'Tool not whitelisted' });
  }
  
  // Exécution
  const result = await executePythonTool(toolName, args);
  res.json({ result });
});
```

### 6. Résultat retourné au LLM

```typescript
// Ajouter tool_result au chat
const toolResultMessage: ChatMessage = {
  sender: 'tool_result',
  text: JSON.stringify(result),
  toolCallId: chunk.response.toolCall.id
};

// Re-streaming avec résultat
const finalResponse = await llm.chat({
  messages: [...history, userMessage, toolCallMessage, toolResultMessage]
});
```

---

## 🛡️ Gouvernance & Sécurité

### Validation creator_id

```typescript
// governanceService.ts
export const validatePrototypeCreator = (prototype: Prototype): boolean => {
  const rules = {
    agent: ['archi'],
    connection: ['com'],
    event: ['tim'],
    dataTransform: ['phil']
  };
  
  return rules[prototype.type]?.includes(prototype.creator_id);
};
```

### Sanitization entrées utilisateur

```typescript
// Avant envoi au LLM
const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script>/gi, '') // XSS
    .replace(/`{3,}/g, '```')  // Injection Markdown
    .trim();
};
```

### Rate Limiting (prévu)

```typescript
// timService.ts (futur)
export const checkRateLimit = (agentId: string): boolean => {
  const config = rateLimitConfigs[agentId];
  const calls = callHistory[agentId] || [];
  
  const recentCalls = calls.filter(
    timestamp => Date.now() - timestamp < config.windowMs
  );
  
  return recentCalls.length < config.maxCalls;
};
```

---

## 📦 Organisation des Fichiers

```
Dev/
├── components/           # UI Components (Atomic Design)
│   ├── V2AgentNode.tsx  # Node workflow (Runtime)
│   ├── IconSidebar.tsx  # Navigation verticale (Design)
│   ├── modals/          # Dialogs
│   ├── panels/          # Slide-over panels
│   └── workflow/        # React Flow custom nodes
│
├── contexts/            # React Contexts
│   ├── LocalizationContext.tsx
│   ├── NotificationContext.tsx
│   └── WorkflowCanvasContext.tsx
│
├── services/            # Business Logic (Runtime Domain)
│   ├── llmService.ts    # Dispatcher
│   ├── openAIService.ts # Provider OpenAI
│   ├── geminiService.ts # Provider Gemini
│   └── governanceService.ts # Validation règles
│
├── stores/              # State Management (DDD)
│   ├── useDesignStore.ts   # Design Domain
│   └── useRuntimeStore.ts  # Runtime Domain
│
├── types.ts             # Contrats de données (DDD)
├── llmModels.ts         # Configuration capabilities
│
├── backend/
│   └── src/
│       ├── server.ts           # Express API
│       ├── pythonExecutor.ts   # Tool execution
│       └── config.ts           # Whitelist
│
├── Guides/              # Documentation architecture
│   ├── UX_FEATURES_GUIDE.md
│   └── ARCHITECTURE_GUIDE.md
│
└── documentation/       # Analyses & specs
    ├── PLAN_JALONS_SYNTHETIQUE.md
    └── LLM_COMPATIBILITY_REPORT.md
```

---

## 🧪 Testing Strategy (à implémenter)

### Tests Unitaires (Vitest)

```typescript
// services/__tests__/llmService.test.ts
describe('llmService.generateContentStream', () => {
  it('should dispatch to correct provider', async () => {
    const mockOpenAI = vi.spyOn(openAIService, 'generateContentStream');
    
    await llmService.generateContentStream(LLMProvider.OpenAI, ...);
    
    expect(mockOpenAI).toHaveBeenCalled();
  });
});
```

### Tests d'Intégration

```typescript
// __tests__/integration/imageWorkflow.test.tsx
describe('Image Generation Workflow', () => {
  it('should generate and add image to chat', async () => {
    render(<App />);
    
    // Clic icône image
    fireEvent.click(screen.getByLabelText('Generate Image'));
    
    // Remplir prompt
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'Cat' } });
    fireEvent.click(screen.getByText('Generate'));
    
    // Attendre génération (mock)
    await waitFor(() => {
      expect(screen.getByAltText('Generated Image')).toBeInTheDocument();
    });
    
    // Ajouter au chat
    fireEvent.click(screen.getByText('Add to Chat'));
    
    expect(screen.getByRole('img', { name: 'Image' })).toBeInTheDocument();
  });
});
```

### Tests E2E (Playwright)

```typescript
// e2e/workflow.spec.ts
test('complete agent workflow', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Créer agent
  await page.click('[aria-label="Archi"]');
  await page.click('text=Créer Prototype');
  await page.fill('input[name="name"]', 'Test Agent');
  await page.selectOption('select[name="llmProvider"]', 'Gemini');
  await page.click('button:has-text("Créer")');
  
  // Ajouter au workflow
  await page.click('text=Ajouter au Workflow');
  
  // Vérifier présence sur canvas
  await expect(page.locator('.react-flow__node')).toBeVisible();
});
```

---

## 🚀 Performance Optimizations

### React Flow Memoization

```typescript
// WorkflowCanvas.tsx
const NODE_TYPES = {
  v2Agent: V2AgentNode,
  customAgent: CustomAgentNode
};

// ❌ MAUVAIS : Recréation à chaque render
const nodeTypes = useMemo(() => ({ v2Agent: V2AgentNode }), []);

// ✅ BON : Constant globale
<ReactFlow nodeTypes={NODE_TYPES} />
```

### Streaming Optimization

```typescript
// Services LLM : Yield chunks dès réception
export async function* generateContentStream(...) {
  for await (const rawChunk of apiStream) {
    yield parseChunk(rawChunk); // Pas d'accumulation
  }
}
```

### Image Base64 Lazy Loading

```typescript
// V2AgentNode.tsx : Render preview seulement si visible
{isMinimized ? null : message.image && (
  <img src={`data:${message.mimeType};base64,${message.image}`} />
)}
```

---

## 📊 Monitoring & Observability (prévu V2)

### Telemetry LLM

```typescript
interface LLMTelemetry {
  provider: LLMProvider;
  model: string;
  tokens: { prompt: number; completion: number; total: number };
  latency: number; // ms
  cost: number; // USD
  success: boolean;
  error?: string;
}

export const trackLLMCall = (telemetry: LLMTelemetry) => {
  // Envoyer à backend analytics
  fetch('/api/telemetry', {
    method: 'POST',
    body: JSON.stringify(telemetry)
  });
};
```

### Error Tracking

```typescript
// Sentry integration
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});

// Usage dans services
try {
  await llm.generateContent(...);
} catch (error) {
  Sentry.captureException(error, {
    tags: { provider: LLMProvider.OpenAI },
    contexts: { llm: { model, prompt } }
  });
}
```

---

## 🔄 Migration Path V1 → V2

### Phase 1 : Dual State (Actuel)

```typescript
// App.tsx maintient les deux
const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]); // V1
const { addNodeMessage } = useRuntimeStore(); // V2

// Double mise à jour
handleUpdateNodeMessages(nodeId, ...); // V1
addNodeMessage(nodeId, message); // V2
```

### Phase 2 : Migration progressive

1. **Backend d'abord** : Migrer API vers stores
2. **UI ensuite** : Remplacer `workflowNodes` state par `useDesignStore`
3. **Cleanup** : Supprimer double écriture

### Phase 3 : WebSocket Sync

```typescript
// services/webSocketService.ts
export const syncWorkflowState = (workflowId: string) => {
  const ws = new WebSocket(`ws://backend/workflow/${workflowId}`);
  
  ws.onmessage = (event) => {
    const { type, payload } = JSON.parse(event.data);
    
    switch (type) {
      case 'node_message':
        addNodeMessage(payload.nodeId, payload.message);
        break;
      case 'prototype_updated':
        updateAgentPrototype(payload.id, payload.updates);
        break;
    }
  };
};
```

---

## 📚 Références & Ressources

### SOLID Principles
- Martin, Robert C. "Clean Architecture" (2017)
- Feathers, Michael. "Working Effectively with Legacy Code" (2004)

### Domain-Driven Design
- Evans, Eric. "Domain-Driven Design" (2003)
- Vernon, Vaughn. "Implementing Domain-Driven Design" (2013)

### LLM Best Practices
- OpenAI Cookbook: https://cookbook.openai.com
- Anthropic Claude Docs: https://docs.anthropic.com
- Google AI Studio: https://ai.google.dev

### React Patterns
- React Flow Docs: https://reactflow.dev
- Zustand Patterns: https://docs.pmnd.rs/zustand

---

**Dernière mise à jour** : 13 novembre 2025  
**Version** : V2.0 (Architecture 5 Robots + DDD)  
**Auteur** : ARC-1 (Agent IA Architecte)
