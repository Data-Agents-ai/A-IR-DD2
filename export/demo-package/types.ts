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
}

// Nouvelle distinction : Instance d'un agent dans un workflow
export interface AgentInstance {
  id: string; // ID unique de l'instance
  prototypeId: string; // Référence vers l'Agent prototype
  name: string; // Peut être différent du prototype (personnalisation)
  position: { x: number; y: number };
  isMinimized: boolean;
  // L'instance hérite automatiquement des propriétés du prototype
  // mais peut avoir des overrides spécifiques si nécessaire
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
}

export interface WorkflowNode {
  id: string;
  agent: Agent;
  position: { x: number; y: number };
  messages: ChatMessage[];
  isMinimized: boolean;
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