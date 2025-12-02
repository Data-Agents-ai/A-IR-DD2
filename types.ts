// types.ts
import React from 'react';

export enum LLMProvider {
  Gemini = 'Gemini',
  OpenAI = 'OpenAI',
  Mistral = 'Mistral',
  Anthropic = 'Anthropic',
  Grok = 'Grok',
  Perplexity = 'Perplexity',
  Qwen = 'Qwen',
  Kimi = 'Kimi K2',
  DeepSeek = 'DeepSeek',
  LMStudio = 'LMStudio',
  ArcLLM = 'Arc-LLM', // Arc-LLM provider for Video, Maps, Web Grounding
}

export enum LLMCapability {
  Chat = 'Chat',
  FileUpload = 'File Analysis',
  URLAnalysis = 'URL Analysis',
  ImageGeneration = 'Image Generation',
  ImageModification = 'Image Modification',
  WebSearch = 'Web Search',
  FunctionCalling = 'Function Calling',
  OutputFormatting = 'Output Formatting',
  Embedding = 'Embedding',
  OCR = 'OCR',
  Reasoning = 'Reasoning Mode',
  CacheOptimization = 'Cache Optimization',
  LocalDeployment = 'Local Deployment',
  CodeSpecialization = 'Code Specialization',
  // Arc-LLM specific capabilities
  VideoGeneration = 'Video Generation',
  MapsGrounding = 'Maps Grounding',
  WebSearchGrounding = 'Web Search Grounding', // Distinct from basic WebSearch

  // 🆕 Anthropic Claude 4 - Core Capabilities
  ExtendedThinking = 'Extended Thinking',        // Raisonnement étendu avec thinking blocks
  PDFSupport = 'PDF Support',                    // Support natif des documents PDF
  StructuredOutputs = 'Structured Outputs',      // Sorties structurées avec validation JSON Schema

  // 🆕 Anthropic Claude 4 - Tools (natifs côté Anthropic)
  WebFetchTool = 'Web Fetch Tool',               // Récupération de contenu web (Anthropic exécute)
  WebSearchToolAnthropic = 'Web Search Tool (Anthropic)', // Recherche web native (Anthropic exécute)
}

export interface LLMConfig {
  provider: LLMProvider;
  enabled: boolean;
  apiKey: string;
  capabilities: { [key in LLMCapability]?: boolean };
}

export interface HistoryConfig {
  enabled: boolean;
  llmProvider: LLMProvider;
  model: string;
  role: string;
  systemPrompt: string;
  limits: {
    char: number;
    word: number;
    token: number;
    sentence: number;
    message: number;
  };
}

export interface Tool {
  name: string;
  description: string;
  parameters: any; // JSON Schema object
  outputSchema?: any; // JSON Schema for the tool's return value
}

export type OutputFormat = 'json' | 'xml' | 'yaml' | 'shell' | 'powershell' | 'python' | 'html' | 'css' | 'javascript' | 'typescript' | 'php' | 'sql' | 'mysql' | 'mongodb';

export interface OutputConfig {
  enabled: boolean;
  format: OutputFormat;
  useCodestralCompletion?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  llmProvider: LLMProvider;
  model: string;
  capabilities: LLMCapability[];
  historyConfig?: HistoryConfig;
  tools?: Tool[];
  outputConfig?: OutputConfig;
  // V2 Governance: Robot creator validation
  creator_id: RobotId;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// V2 Governance: Other prototype types by robot specialization

export interface ConnectionPrototype {
  id: string;
  name: string;
  type: 'api' | 'webhook' | 'database' | 'external_service';
  endpoint: string;
  authentication: {
    type: 'bearer' | 'api_key' | 'oauth' | 'basic' | 'none';
    credentials?: Record<string, string>;
  };
  configuration: Record<string, any>;
  creator_id: RobotId; // Must be RobotId.Com
  created_at: string;
  updated_at: string;
}

export interface FilePrototype {
  id: string;
  name: string;
  type: 'upload' | 'transformation' | 'validation' | 'output';
  format: string; // 'json', 'csv', 'pdf', etc.
  validation_rules: Record<string, any>;
  transformation_config?: Record<string, any>;
  creator_id: RobotId; // Must be RobotId.Phil
  created_at: string;
  updated_at: string;
}

export interface EventPrototype {
  id: string;
  name: string;
  type: 'trigger' | 'scheduler' | 'webhook' | 'conditional';
  schedule?: string; // cron expression
  conditions?: Record<string, any>;
  rate_limit?: {
    max_calls: number;
    time_window: number; // seconds
  };
  creator_id: RobotId; // Must be RobotId.Tim
  created_at: string;
  updated_at: string;
}

// Nouvelle distinction : Instance d'un agent dans un workflow
export interface AgentInstance {
  id: string; // ID unique de l'instance
  prototypeId: string; // Référence vers l'Agent prototype
  name: string; // Peut être différent du prototype (personnalisation)
  position: { x: number; y: number };
  isMinimized: boolean;
  isMaximized: boolean; // Mode agrandissement plein écran workflow

  // 🆕 Configuration enrichie (clone du prototype au moment de l'instanciation)
  // null = fallback vers prototype (rétrocompatibilité)
  configuration_json: {
    // Configuration métier (clonée du prototype)
    role: string;
    model: string;
    llmProvider: LLMProvider;
    systemPrompt: string;
    tools: Tool[];
    outputConfig?: OutputConfig;
    capabilities?: LLMCapability[];
    historyConfig?: HistoryConfig;

    // Métadonnées d'instance
    position: { x: number; y: number };

    // 🔮 Sections futures (préparation)
    links?: any[]; // Connexions entre agents
    tasks?: any[]; // Tâches assignées
    logs?: any[]; // Historique d'exécution
    errors?: any[]; // Erreurs rencontrées
  } | null;
}

// Interface pour accéder aux données complètes d'une instance
export interface ResolvedAgentInstance {
  instance: AgentInstance;
  prototype: Agent;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string of arguments
}


// LMStudio Dynamic Route Detection (Jalon 1)
export interface LMStudioRoutes {
  models: boolean;              // GET /v1/models
  chatCompletions: boolean;     // POST /v1/chat/completions
  completions: boolean;         // POST /v1/completions
  embeddings: boolean;          // POST /v1/embeddings
  images: boolean;              // POST /v1/images/generations
  audio: boolean;               // POST /v1/audio/transcriptions
}

export interface LMStudioModelDetection {
  modelId: string;              // Ex: "Mistral-7B-Instruct-v0.2"
  routes: LMStudioRoutes;       // Routes HTTP disponibles
  capabilities: LLMCapability[];// Capacités A-IR-DD2 déduites
  contextWindow?: number;       // Longueur contexte (tokens)
  detectedAt: string;           // ISO timestamp de la détection
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'tool' | 'tool_result';
  text: string;
  image?: string; // base64 encoded image
  mimeType?: string;
  filename?: string;
  fileContent?: string; // For Mistral text file content
  citations?: { title: string; uri: string }[];
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  status?: 'executing_tool';
  isError?: boolean;
  // Maps & Web Search Grounding (Arc-LLM, Gemini)
  mapsGrounding?: MapSource[];
  webSearchGrounding?: WebSearchSource[];
  // Video Generation (Veo 3.1)
  videoGeneration?: {
    operationId: string;
    videoUrl?: string; // Available when completed
    thumbnailUrl?: string;
    prompt: string;
    status: 'processing' | 'completed' | 'failed';
    error?: string;
  };

  // 🆕 Anthropic Claude 4 fields
  thinking?: string;              // Extended thinking content
  document?: string;              // Base64 encoded document (PDF)
  documentType?: 'image' | 'pdf'; // Type de document uploadé
}

export interface WorkflowNode {
  id: string;
  agent: Agent;
  position: { x: number; y: number };
  messages: ChatMessage[];
  isMinimized: boolean;
  isMaximized?: boolean;
  instanceId?: string; // 🆕 Lié à AgentInstance dans le DesignStore
}

// V2 Robot Navigation Interfaces
export enum RobotId {
  Archi = 'AR_001',
  Bos = 'BO_002',
  Com = 'CO_003',
  Phil = 'PH_004',
  Tim = 'TI_005'
}

export interface RobotMenuItem {
  id: RobotId;
  name: string;
  iconComponent: React.ComponentType<any>;
  path: string;
  description: string;
  nestedItems?: RobotMenuItem[];
}

export interface RobotCapability {
  id: string;
  name: string;
  description: string;
  requiresAuth?: boolean;
}

// V2 React Flow Types - Architecture Prototype vs Instance
export interface V2WorkflowNode {
  id: string;
  type: 'agent' | 'connection' | 'event' | 'file';
  position: { x: number; y: number };
  data: {
    robotId: RobotId;
    label: string;
    agentInstance?: AgentInstance; // Pour les nodes agent (référence à l'instance)
    isMinimized?: boolean;
    isMaximized?: boolean; // Mode agrandissement plein écran workflow
  };
}

export interface V2WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'step' | 'smoothstep' | 'straight';
  data?: {
    label?: string;
    conditions?: string[];
  };
}

// V2 Governance System - Robot Creation Rights

export type PrototypeType = 'agent' | 'connection' | 'file' | 'event';

export interface RobotCapabilities {
  canCreate: PrototypeType[];
  canModify: PrototypeType[];
  canDelete: PrototypeType[];
}

export const ROBOT_CREATION_RIGHTS: Record<RobotId, RobotCapabilities> = {
  [RobotId.Archi]: {
    canCreate: ['agent'],
    canModify: ['agent'],
    canDelete: ['agent']
  },
  [RobotId.Com]: {
    canCreate: ['connection'],
    canModify: ['connection'],
    canDelete: ['connection']
  },
  [RobotId.Phil]: {
    canCreate: ['file'],
    canModify: ['file'],
    canDelete: ['file']
  },
  [RobotId.Tim]: {
    canCreate: ['event'],
    canModify: ['event'],
    canDelete: ['event']
  },
  [RobotId.Bos]: {
    canCreate: [], // Bos supervise mais ne crée pas
    canModify: [], // Seulement lecture pour monitoring
    canDelete: [] // Pas de suppression directe
  }
};

export interface GovernanceValidationResult {
  isValid: boolean;
  error?: string;
  robotId: RobotId;
  prototypeType: PrototypeType;
  operation: 'create' | 'modify' | 'delete';
}

// ============================================
// Arc-LLM Specific Types
// ============================================

/**
 * Options pour la génération de vidéo Arc-LLM (Gemini Veo 3.1)
 */
export interface VideoGenerationOptions {
  prompt: string;
  negativePrompt?: string; // Exclude unwanted elements

  // Mode selection
  mode: 'text-to-video' | 'image-to-video' | 'interpolation' | 'extension' | 'with-references';

  // Image-to-video (animate single image as first frame)
  firstFrame?: { mimeType: string; data: string };

  // Interpolation (first + last frame)
  lastFrame?: { mimeType: string; data: string };

  // Extension (continue existing video)
  existingVideo?: { uri: string; operationId: string };

  // Reference images (max 3) for style/content guidance
  referenceImages?: Array<{
    image: { mimeType: string; data: string };
    referenceType: 'asset'; // Gemini uses 'asset' for style references
  }>;

  // Parameters
  resolution?: '720p' | '1080p';
  aspectRatio?: '16:9' | '9:16';
  durationSeconds?: 4 | 6 | 8;
  personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow';
  seed?: number; // Improves determinism slightly
}

/**
 * Statut d'une génération vidéo (polling asynchrone)
 */
export interface VideoGenerationStatus {
  operationId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  videoUrl?: string; // Disponible si status = COMPLETED
  progress?: number; // 0-100
  error?: string; // Disponible si status = FAILED
}

/**
 * Source cartographique extraite par Maps Grounding
 * Structure similaire à groundingMetadata de Gemini
 */
export interface MapSource {
  uri: string; // Lien Google Maps
  placeTitle: string;
  placeId: string;
  coordinates: { latitude: number; longitude: number };
  reviewExcerpts?: string[]; // Extraits d'avis utilisateurs
}

/**
 * Source web extraite par Web Search Grounding
 * Structure similaire aux citations Gemini
 */
export interface WebSearchSource {
  uri: string;
  webTitle: string;
  snippet?: string; // Extrait de la source
}

/**
 * Résultat Maps Grounding (pattern similaire à Gemini)
 */
export interface MapsGroundingResponse {
  text: string;
  mapSources: MapSource[];
}

/**
 * Résultat Web Search Grounding (pattern similaire à Gemini)
 */
export interface WebSearchGroundingResponse {
  text: string;
  webSources: WebSearchSource[];
}
