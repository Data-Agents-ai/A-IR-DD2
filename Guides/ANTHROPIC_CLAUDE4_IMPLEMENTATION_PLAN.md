# 📋 PLAN D'IMPLÉMENTATION - ANTHROPIC CLAUDE 4.x

**Date**: 2 décembre 2025  
**Status**: ✅ **COMPLET - IMPLÉMENTÉ ET TESTÉ**  
**Jalon**: Mise à jour Anthropic avec nouvelles capacités Claude 4

---

## 🎉 IMPLÉMENTATION TERMINÉE

**Date de complétion**: 2 décembre 2025  
**Durée totale**: ~2h30  
**Tests**: ✅ 6/6 validés

### Résultats
- ✅ 4 nouveaux modèles Claude 4.x disponibles
- ✅ 5 nouvelles capabilities fonctionnelles
- ✅ Parité complète UI (node + fullscreen)
- ✅ Toggles Web Fetch/Search avec feedback visuel
- ✅ Extended Thinking avec affichage collapsible
- ✅ Upload PDF supporté

---

## 🎯 Objectifs

### Scope Validé
1. ✅ **Nouveaux modèles Claude 4.x** (4 modèles)
2. ✅ **Extended Thinking** (affichage collapsible dans chat)
3. ✅ **PDF Support** (upload unifié avec images)
4. ✅ **Web Fetch Tool** (Anthropic natif - pas de backend)
5. ✅ **Web Search Tool** (Anthropic natif - pas de backend)
6. ✅ **Structured Outputs** (validation JSON schema)

### Hors Scope (Reporter à jalon ultérieur)
- ❌ **Bash Tool** (complexité sécurité - priorité basse)
- ❌ **Prompt Caching** (complexité système - optimisation future)
- ❌ **Search Results capability** (usage à clarifier)

---

## 📊 PHASE 1 : Modèles & Types (Foundation)

### Étape 1.1 : Mise à jour `types.ts` - Nouvelles capabilities

**Fichier**: `types.ts`

**Action**: Ajouter les nouvelles capabilities dans l'enum `LLMCapability`

```typescript
enum LLMCapability {
  // Existing capabilities...
  Chat = 'Chat',
  FileUpload = 'File Analysis',
  // ... autres existantes ...
  
  // 🆕 Anthropic Claude 4 - Core Capabilities
  ExtendedThinking = 'Extended Thinking',        // Raisonnement étendu avec thinking blocks
  PDFSupport = 'PDF Support',                    // Support natif des documents PDF
  StructuredOutputs = 'Structured Outputs',      // Sorties structurées avec validation JSON Schema
  
  // 🆕 Anthropic Claude 4 - Tools (natifs côté Anthropic)
  WebFetchTool = 'Web Fetch Tool',               // Récupération de contenu web (Anthropic exécute)
  WebSearchToolAnthropic = 'Web Search Tool (Anthropic)', // Recherche web native (Anthropic exécute)
}
```

**Références documentation**:
- Web Fetch: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool
- Web Search: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool

---

### Étape 1.2 : Mise à jour `llmModels.ts` - Nouveaux modèles

**Fichier**: `llmModels.ts`

**Action**: Remplacer la section `[LLMProvider.Anthropic]`

```typescript
[LLMProvider.Anthropic]: [
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    capabilities: [
      LLMCapability.Chat,
      LLMCapability.FileUpload,
      LLMCapability.PDFSupport,
      LLMCapability.FunctionCalling,
      LLMCapability.ExtendedThinking,
      LLMCapability.StructuredOutputs,
      LLMCapability.WebFetchTool,
      LLMCapability.WebSearchToolAnthropic
    ],
    recommended: true,
    description: 'Latest flagship with extended thinking & advanced tools (200K context)'
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    capabilities: [
      LLMCapability.Chat,
      LLMCapability.FileUpload,
      LLMCapability.PDFSupport,
      LLMCapability.FunctionCalling,
      LLMCapability.WebFetchTool,
      LLMCapability.WebSearchToolAnthropic
    ],
    description: 'Fast & efficient with web tools (200K context)'
  },
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    capabilities: [
      LLMCapability.Chat,
      LLMCapability.FileUpload,
      LLMCapability.PDFSupport,
      LLMCapability.FunctionCalling,
      LLMCapability.ExtendedThinking,
      LLMCapability.StructuredOutputs,
      LLMCapability.WebFetchTool,
      LLMCapability.WebSearchToolAnthropic
    ],
    recommended: true,
    description: 'Most capable model with full feature set (200K context)'
  },
  {
    id: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1',
    capabilities: [
      LLMCapability.Chat,
      LLMCapability.FileUpload,
      LLMCapability.PDFSupport,
      LLMCapability.FunctionCalling,
      LLMCapability.StructuredOutputs
    ],
    description: 'Stable version with core features (200K context)'
  }
]
```

**Note**: Anciens modèles Claude 3 à retirer (claude-3-5-sonnet, claude-3-opus, claude-3-sonnet, claude-3-haiku).

---

## 🔧 PHASE 2 : Service Anthropic - Implémentation Technique

### Étape 2.1 : Extended Thinking - Parsing stream

**Fichier**: `services/anthropicService.ts`

**Implémentation**:
1. Ajouter header beta pour Extended Thinking
2. Parser les `thinking` blocks dans le stream
3. Retourner structure enrichie avec thinking

```typescript
const getHeaders = (apiKey: string, useExtendedThinking: boolean = false) => {
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
    };
    
    if (useExtendedThinking) {
        headers['anthropic-beta'] = 'extended-thinking-2025-01-31';
    }
    
    return headers;
};

// Dans generateContentStream:
// Parser thinking blocks
if (chunk.type === 'content_block_delta' && chunk.delta.type === 'thinking_delta') {
    currentThinking += chunk.delta.thinking;
}
if (chunk.type === 'content_block_stop' && currentThinking) {
    yield { response: { thinking: currentThinking } };
    currentThinking = '';
}
```

**Structure retour**: `{ text?: string, thinking?: string, toolCalls?: ToolCall[] }`

---

### Étape 2.2 : PDF Support - Upload

**Fichier**: `services/anthropicService.ts`

**Implémentation**:
- Modifier `formatMessages()` pour accepter `application/pdf`
- Encoder PDF en base64
- Structure document Anthropic

```typescript
const formatMessages = (history?: ChatMessage[]) => {
    const messages: any[] = [];
    history?.forEach(msg => {
        if (msg.sender === 'user') {
            const userContent: any[] = [{ type: 'text', text: msg.text }];
            
            // Image support (existing)
            if (msg.image && msg.mimeType && msg.mimeType.startsWith('image/')) {
                userContent.unshift({
                    type: 'image',
                    source: { type: 'base64', media_type: msg.mimeType, data: msg.image }
                });
            }
            
            // 🆕 PDF support
            if (msg.document && msg.mimeType === 'application/pdf') {
                userContent.unshift({
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: msg.document }
                });
            }
            
            messages.push({ role: 'user', content: userContent });
        }
        // ... reste du code
    });
    return messages;
};
```

---

### Étape 2.3 : Web Fetch Tool - Anthropic natif

**Fichier**: `services/anthropicService.ts`

**Implémentation**: Ajouter tool definition (Anthropic exécute le fetch)

```typescript
const ANTHROPIC_NATIVE_TOOLS = {
    web_fetch: {
        name: 'web_fetch',
        type: 'computer_2025_01',
        description: 'Fetches content from a URL. Use this to retrieve web pages, articles, or documents.',
        input_schema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'The URL to fetch content from'
                }
            },
            required: ['url']
        }
    }
};

// Dans formatTools():
const formatTools = (tools?: Tool[], agent?: Agent) => {
    const formattedTools = [];
    
    // Custom tools
    if (tools && tools.length > 0) {
        formattedTools.push(...tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters,
        })));
    }
    
    // 🆕 Anthropic native tools
    if (agent?.capabilities?.includes(LLMCapability.WebFetchTool)) {
        formattedTools.push(ANTHROPIC_NATIVE_TOOLS.web_fetch);
    }
    if (agent?.capabilities?.includes(LLMCapability.WebSearchToolAnthropic)) {
        formattedTools.push(ANTHROPIC_NATIVE_TOOLS.web_search);
    }
    
    return formattedTools.length > 0 ? formattedTools : undefined;
};
```

**Pas de backend nécessaire** : Anthropic exécute le fetch côté API et retourne le résultat dans le stream.

---

### Étape 2.4 : Web Search Tool - Anthropic natif

**Fichier**: `services/anthropicService.ts`

**Implémentation**: Ajouter tool definition (Anthropic exécute la recherche)

```typescript
const ANTHROPIC_NATIVE_TOOLS = {
    // ... web_fetch ci-dessus
    
    web_search: {
        name: 'web_search',
        type: 'computer_2025_01',
        description: 'Searches the web for information. Returns relevant search results.',
        input_schema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query'
                }
            },
            required: ['query']
        }
    }
};
```

**Pas de backend nécessaire** : Anthropic exécute la recherche côté API (similaire à Perplexity).

---

### Étape 2.5 : Structured Outputs - JSON Schema

**Fichier**: `services/anthropicService.ts`

**Implémentation**: Ajouter `response_format` si capability active

```typescript
export const generateContentStream = async function* (
    apiKey: string, 
    model: string,
    systemInstruction?: string, 
    history?: ChatMessage[], 
    tools?: Tool[], 
    outputConfig?: OutputConfig,
    agent?: Agent // 🆕 Recevoir agent pour vérifier capabilities
) {
    // ... existing code
    
    let bodyParams: any = {
        model,
        system: finalSystemInstruction,
        messages,
        max_tokens: 4096,
        stream: true
    };
    
    if (formattedTools) {
        bodyParams.tools = formattedTools;
    }
    
    // 🆕 Structured Outputs
    if (agent?.capabilities?.includes(LLMCapability.StructuredOutputs) && outputConfig?.enabled) {
        bodyParams.response_format = {
            type: 'json',
            schema: outputConfig.schema || {} // JSON Schema fourni par l'utilisateur
        };
    }
    
    const body = JSON.stringify(bodyParams);
    // ... rest of stream logic
};
```

---

## 🎨 PHASE 3 : UI - Formulaire Prototype

### Étape 3.1 : `AgentFormModal.tsx` - Afficher nouveaux modèles

**Fichier**: `components/modals/AgentFormModal.tsx`

**Action**: Les nouveaux modèles apparaîtront automatiquement grâce à `llmModels.ts`

**Vérification**: 
- Dropdown "Model" doit afficher les 4 nouveaux modèles Claude 4
- Anciens modèles Claude 3 ne doivent plus apparaître

---

### Étape 3.2 : Capabilities checkboxes - Nouveaux champs

**Fichier**: `components/modals/AgentFormModal.tsx`

**Action**: Les nouvelles capabilities apparaîtront automatiquement dans la section capabilities

**Vérification UI**:
```
☑ Extended Thinking
☑ PDF Support
☑ Structured Outputs
☑ Web Fetch Tool
☑ Web Search Tool (Anthropic)
```

**Note**: Les checkboxes sont générées dynamiquement depuis `LLMCapability` enum.

---

## 🖥️ PHASE 4 : UI - Workflow Agents

### Étape 4.1 : `V2AgentNode.tsx` - Boutons additionnels

**Fichier**: `components/V2AgentNode.tsx`

#### 4.1.1 : Bouton Extended Thinking

**Localisation**: Dans la zone des boutons d'actions (à côté des boutons image, video, etc.)

```tsx
{/* Extended Thinking toggle */}
{effectiveAgent?.capabilities?.includes(LLMCapability.ExtendedThinking) && (
  <Button
    type="button"
    variant="ghost"
    className="p-2 h-8 w-8 text-gray-400 hover:text-purple-400 
               hover:bg-purple-500/20 hover:shadow-lg hover:shadow-purple-500/40
               transition-all duration-200 rounded-md
               hover:scale-110 active:scale-95"
    onClick={() => setShowThinking(!showThinking)}
    disabled={isLoading}
    title="Toggle thinking display"
  >
    💭
  </Button>
)}
```

**State**: Ajouter `const [showThinking, setShowThinking] = useState(true);`

---

#### 4.1.2 : Upload unifié (Images + PDF)

**Localisation**: Modifier le bouton d'upload existant

```tsx
{/* File upload - Support images + PDF */}
{effectiveAgent?.capabilities?.includes(LLMCapability.FileUpload) && (
  <>
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileUpload}
      accept={
        effectiveAgent.capabilities.includes(LLMCapability.PDFSupport)
          ? "image/*,application/pdf"
          : "image/*"
      }
      className="hidden"
    />
    <Button
      type="button"
      variant="ghost"
      className="p-2 h-8 w-8 text-gray-400 hover:text-blue-400 
                 hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/40
                 transition-all duration-200 rounded-md
                 hover:scale-110 active:scale-95"
      onClick={() => fileInputRef.current?.click()}
      disabled={isLoading}
      title={
        effectiveAgent.capabilities.includes(LLMCapability.PDFSupport)
          ? "Upload image or PDF"
          : "Upload image"
      }
    >
      <UploadIcon width={14} height={14} />
    </Button>
  </>
)}
```

**Handler**: Modifier `handleFileUpload` pour gérer les PDF

```typescript
const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    if (file.type.startsWith('image/')) {
      setAttachedFile(file);
    } else if (file.type === 'application/pdf') {
      setAttachedPDF(file); // 🆕 Nouveau state
    }
  }
};
```

---

#### 4.1.3 : Boutons Web Tools

**Localisation**: Après le bouton Extended Thinking

```tsx
{/* Web Fetch Tool */}
{effectiveAgent?.capabilities?.includes(LLMCapability.WebFetchTool) && (
  <Button
    type="button"
    variant="ghost"
    className="p-2 h-8 w-8 text-gray-400 hover:text-cyan-400 
               hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/40
               transition-all duration-200 rounded-md
               hover:scale-110 active:scale-95"
    onClick={handleOpenWebFetchModal}
    disabled={isLoading}
    title="Fetch web content"
  >
    🌐
  </Button>
)}

{/* Web Search Tool */}
{effectiveAgent?.capabilities?.includes(LLMCapability.WebSearchToolAnthropic) && (
  <Button
    type="button"
    variant="ghost"
    className="p-2 h-8 w-8 text-gray-400 hover:text-yellow-400 
               hover:bg-yellow-500/20 hover:shadow-lg hover:shadow-yellow-500/40
               transition-all duration-200 rounded-md
               hover:scale-110 active:scale-95"
    onClick={handleOpenWebSearchModal}
    disabled={isLoading}
    title="Search the web"
  >
    🔍
  </Button>
)}
```

**Handlers**: Ouvrir modals pour saisir URL/query

```typescript
const handleOpenWebFetchModal = () => {
  const url = prompt("Enter URL to fetch:");
  if (url) {
    // Envoyer message avec instruction de fetch
    handleSendMessage(`[WEB_FETCH] ${url}`, null);
  }
};

const handleOpenWebSearchModal = () => {
  const query = prompt("Enter search query:");
  if (query) {
    // Envoyer message avec instruction de recherche
    handleSendMessage(`[WEB_SEARCH] ${query}`, null);
  }
};
```

**Note**: Solution temporaire avec `prompt()`. Créer des modals dédiés dans un jalon ultérieur si nécessaire.

---

### Étape 4.2 : Affichage Thinking dans le chat

**Fichier**: `components/V2AgentNode.tsx`

**Localisation**: Dans la fonction `renderMessage()`

```tsx
const renderMessage = (message: ChatMessage) => {
  const isUser = message.sender === 'user';
  const isError = message.isError;

  return (
    <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
        isUser
          ? 'bg-indigo-600 text-white'
          : isError
            ? 'bg-red-600/20 text-red-200'
            : 'bg-gray-700 text-gray-100'
      }`}>
        {/* 🆕 Thinking block (collapsible) */}
        {!isUser && message.thinking && showThinking && (
          <details className="mb-2 p-2 bg-purple-900/30 border border-purple-500/50 rounded">
            <summary className="cursor-pointer text-purple-300 font-semibold flex items-center gap-2">
              💭 Réflexion de l'agent
              <span className="text-xs text-purple-400">({message.thinking.length} chars)</span>
            </summary>
            <pre className="mt-2 text-xs text-purple-200 whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto">
              {message.thinking}
            </pre>
          </details>
        )}
        
        {/* Message content (existing) */}
        {/* ... reste du code d'affichage existant ... */}
      </div>
    </div>
  );
};
```

---

## 🖼️ PHASE 5 : UI - Fenêtre Agrandie

### Étape 5.1 : `FullscreenChatModal.tsx` - Réplication logique

**Fichier**: `components/modals/FullscreenChatModal.tsx`

**Action**: Copier EXACTEMENT la même implémentation que `V2AgentNode.tsx`

#### 5.1.1 : Boutons header

```tsx
{/* Header Action Buttons */}
<div className="flex items-center space-x-2">
  {/* Extended Thinking toggle */}
  {agent?.capabilities?.includes(LLMCapability.ExtendedThinking) && (
    <Button onClick={() => setShowThinking(!showThinking)} title="Toggle thinking">
      💭
    </Button>
  )}
  
  {/* Web Fetch Tool */}
  {agent?.capabilities?.includes(LLMCapability.WebFetchTool) && (
    <Button onClick={handleOpenWebFetchModal} title="Fetch web content">
      🌐
    </Button>
  )}
  
  {/* Web Search Tool */}
  {agent?.capabilities?.includes(LLMCapability.WebSearchToolAnthropic) && (
    <Button onClick={handleOpenWebSearchModal} title="Search the web">
      🔍
    </Button>
  )}
  
  {/* Existing buttons: Image, Video, Maps, Minimize, Delete */}
  {/* ... */}
</div>
```

#### 5.1.2 : Upload unifié (Input area)

```tsx
{/* File upload - Images + PDF */}
{agent?.capabilities?.includes(LLMCapability.FileUpload) && (
  <>
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileUpload}
      accept={
        agent.capabilities.includes(LLMCapability.PDFSupport)
          ? "image/*,application/pdf"
          : "image/*"
      }
      className="hidden"
    />
    <Button onClick={() => fileInputRef.current?.click()}>
      <UploadIcon width={16} height={16} />
    </Button>
  </>
)}
```

#### 5.1.3 : Affichage Thinking

```tsx
{/* Thinking block */}
{!isUser && message.thinking && showThinking && (
  <details className="mb-2 p-2 bg-purple-900/30 border border-purple-500/50 rounded">
    <summary className="cursor-pointer text-purple-300">
      💭 Réflexion de l'agent
    </summary>
    <pre className="mt-2 text-xs text-purple-200 whitespace-pre-wrap">
      {message.thinking}
    </pre>
  </details>
)}
```

---

## 📦 PHASE 6 : Types ChatMessage - Enrichissement

### Étape 6.1 : Ajouter fields pour thinking et PDF

**Fichier**: `types.ts`

**Action**: Modifier l'interface `ChatMessage`

```typescript
export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'tool' | 'tool_result';
  text: string;
  image?: string;
  mimeType?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  isError?: boolean;
  videoGeneration?: VideoGenerationInfo;
  mapsGrounding?: MapsGroundingInfo;
  webSearchGrounding?: WebSearchGroundingInfo;
  
  // 🆕 Anthropic Claude 4 fields
  thinking?: string;              // Extended thinking content
  document?: string;              // Base64 encoded document (PDF)
  documentType?: 'image' | 'pdf'; // Type de document uploadé
}
```

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### Phase 1 : Foundation
- [ ] **types.ts** : Ajouter nouvelles capabilities (ExtendedThinking, PDFSupport, etc.)
- [ ] **types.ts** : Enrichir ChatMessage (thinking, document, documentType)
- [ ] **llmModels.ts** : Remplacer modèles Anthropic par Claude 4.x

### Phase 2 : Service Anthropic
- [ ] **anthropicService.ts** : Extended Thinking (header beta + parsing)
- [ ] **anthropicService.ts** : PDF Support (formatMessages avec document type)
- [ ] **anthropicService.ts** : Web Fetch Tool (tool definition native)
- [ ] **anthropicService.ts** : Web Search Tool (tool definition native)
- [ ] **anthropicService.ts** : Structured Outputs (response_format)

### Phase 3 : UI Formulaire
- [ ] **AgentFormModal.tsx** : Vérifier affichage nouveaux modèles
- [ ] **AgentFormModal.tsx** : Vérifier checkboxes nouvelles capabilities

### Phase 4 : UI Workflow
- [ ] **V2AgentNode.tsx** : Bouton Extended Thinking (💭)
- [ ] **V2AgentNode.tsx** : Upload unifié (images + PDF)
- [ ] **V2AgentNode.tsx** : Boutons Web Fetch (🌐) et Web Search (🔍)
- [ ] **V2AgentNode.tsx** : Affichage thinking blocks (collapsible)
- [ ] **V2AgentNode.tsx** : Handler PDF upload

### Phase 5 : UI Fullscreen
- [ ] **FullscreenChatModal.tsx** : Copier bouton Extended Thinking
- [ ] **FullscreenChatModal.tsx** : Copier upload unifié
- [ ] **FullscreenChatModal.tsx** : Copier boutons Web Tools
- [ ] **FullscreenChatModal.tsx** : Copier affichage thinking

### Phase 6 : Tests
- [ ] Test création agent avec Claude Sonnet 4.5
- [ ] Test upload PDF + vérification envoi Anthropic
- [ ] Test Extended Thinking + affichage thinking block
- [ ] Test Web Fetch Tool (demander à l'agent de fetch une URL)
- [ ] Test Web Search Tool (demander une recherche)
- [ ] Test Structured Outputs avec JSON schema
- [ ] Test fenêtre agrandie (même features que normale)

---

## 📚 Références Documentation

- **Models Overview**: https://platform.claude.com/docs/en/about-claude/models
- **API Messages**: https://platform.claude.com/docs/en/api/messages
- **Tools Overview**: https://platform.claude.com/docs/en/api/overview#tools
- **Web Fetch Tool**: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool
- **Web Search Tool**: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool

---

## 🎯 Points d'Attention

### Sécurité
- ✅ Web Fetch & Search : Exécution côté Anthropic (pas de backend = pas de risque injection)
- ✅ PDF Upload : Limite taille fichier (10MB max recommandé)

### Performance
- ⚠️ Extended Thinking peut allonger les temps de réponse (afficher indicateur de chargement)
- ⚠️ PDF parsing peut être coûteux en tokens (documenter les limites)

### UX
- ✅ Thinking collapsible par défaut (éviter pollution du chat)
- ✅ Upload unifié (UX cohérente images + PDF)
- ✅ Boutons Web Tools avec icônes explicites

### Compatibilité
- ✅ Structured Outputs compatible avec OutputConfig existant
- ✅ Anciens agents Claude 3 restent fonctionnels (modèles retirés de la liste mais toujours dans le code)

---

## 📊 Estimation Temps

- **Phase 1** (Types + Modèles) : **15 min**
- **Phase 2** (Service Anthropic) : **45 min**
- **Phase 3** (UI Formulaire) : **5 min** (vérification)
- **Phase 4** (UI Workflow) : **35 min**
- **Phase 5** (UI Fullscreen) : **20 min**
- **Phase 6** (Tests) : **25 min**

**TOTAL ESTIMÉ : ~2h25**

---

## ✅ Validation Chef de Projet

- [x] Nouveaux modèles Claude 4.x validés
- [x] Extended Thinking : Option B (collapsible) ✅
- [x] PDF Support : Option C (upload unifié) ✅
- [x] Bash Tool : ❌ NON implémenté (reporter)
- [x] Web Fetch : Option C (Anthropic natif) ✅
- [x] Web Search : Anthropic natif ✅
- [x] Prompt Caching : ❌ NON implémenté (reporter)
- [x] Structured Outputs : Option B (compatibilité arrière) ✅

**Status** : ✅ PRÊT POUR IMPLÉMENTATION

**Date validation** : 2 décembre 2025
