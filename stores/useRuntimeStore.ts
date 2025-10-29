import { create } from 'zustand';
import { ChatMessage, LLMConfig, LLMProvider } from '../types';

/**
 * Runtime Domain Store - Gère l'exécution et les états temps réel
 * Responsabilité : Messages de chat, exécution des agents,
 * WebSocket states, logs, données volatiles
 */
interface RuntimeStore {
  // Chat & Execution State
  nodeMessages: Record<string, ChatMessage[]>; // nodeId -> messages[]
  executingNodes: Set<string>; // nodeIds currently executing
  
  // LLM Configuration (runtime)
  llmConfigs: LLMConfig[];
  
  // UI State (runtime only)
  isImagePanelOpen: boolean;
  isImageModificationPanelOpen: boolean;
  currentImageNodeId: string | null;
  editingImageInfo: { nodeId: string; sourceImage: string; mimeType: string } | null;
  fullscreenImage: { src: string; mimeType: string } | null;
  
  // Fullscreen Chat State
  fullscreenChatNodeId: string | null; // nodeId for fullscreen chat mode
  
  // Navigation state (for V2AgentNode edit functionality)
  navigationHandler: ((robotId: string, path: string) => void) | null;
  
  // Actions - Messages & Execution
  setNodeMessages: (nodeId: string, messages: ChatMessage[]) => void;
  addNodeMessage: (nodeId: string, message: ChatMessage) => void;
  updateNodeMessage: (nodeId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  clearNodeMessages: (nodeId: string) => void;
  
  setNodeExecuting: (nodeId: string, isExecuting: boolean) => void;
  
  // Actions - LLM Config
  updateLLMConfigs: (configs: LLMConfig[]) => void;
  
  // Actions - UI State
  setImagePanelOpen: (isOpen: boolean, nodeId?: string) => void;
  setImageModificationPanelOpen: (isOpen: boolean, imageInfo?: { nodeId: string; sourceImage: string; mimeType: string }) => void;
  setFullscreenImage: (image: { src: string; mimeType: string } | null) => void;
  setFullscreenChatNodeId: (nodeId: string | null) => void;
  setNavigationHandler: (handler: ((robotId: string, path: string) => void) | null) => void;
  
  // Utility
  getNodeMessages: (nodeId: string) => ChatMessage[];
  isNodeExecuting: (nodeId: string) => boolean;
}

export const useRuntimeStore = create<RuntimeStore>((set, get) => ({
  // Initial state
  nodeMessages: {},
  executingNodes: new Set(),
  llmConfigs: [],
  isImagePanelOpen: false,
  isImageModificationPanelOpen: false,
  currentImageNodeId: null,
  editingImageInfo: null,
  fullscreenImage: null,
  fullscreenChatNodeId: null,
  navigationHandler: null,
  
  // Message actions
  setNodeMessages: (nodeId, messages) => set((state) => ({
    nodeMessages: { ...state.nodeMessages, [nodeId]: messages }
  })),
  
  addNodeMessage: (nodeId, message) => set((state) => ({
    nodeMessages: {
      ...state.nodeMessages,
      [nodeId]: [...(state.nodeMessages[nodeId] || []), message]
    }
  })),
  
  updateNodeMessage: (nodeId, messageId, updates) => set((state) => ({
    nodeMessages: {
      ...state.nodeMessages,
      [nodeId]: (state.nodeMessages[nodeId] || []).map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    }
  })),
  
  clearNodeMessages: (nodeId) => set((state) => ({
    nodeMessages: { ...state.nodeMessages, [nodeId]: [] }
  })),
  
  // Execution state
  setNodeExecuting: (nodeId, isExecuting) => set((state) => {
    const newExecutingNodes = new Set(state.executingNodes);
    if (isExecuting) {
      newExecutingNodes.add(nodeId);
    } else {
      newExecutingNodes.delete(nodeId);
    }
    return { executingNodes: newExecutingNodes };
  }),
  
  // LLM Config
  updateLLMConfigs: (configs) => set({ llmConfigs: configs }),
  
  // UI State actions
  setImagePanelOpen: (isOpen, nodeId) => set({
    isImagePanelOpen: isOpen,
    currentImageNodeId: isOpen ? nodeId || null : null
  }),
  
  setImageModificationPanelOpen: (isOpen, imageInfo) => set({
    isImageModificationPanelOpen: isOpen,
    editingImageInfo: isOpen ? imageInfo || null : null
  }),
  
  setFullscreenImage: (image) => set({
    fullscreenImage: image
  }),
  
  setFullscreenChatNodeId: (nodeId) => set({
    fullscreenChatNodeId: nodeId
  }),
  
  setNavigationHandler: (handler) => set({
    navigationHandler: handler
  }),
  
  // Utility functions
  getNodeMessages: (nodeId) => {
    const state = get();
    return state.nodeMessages[nodeId] || [];
  },
  
  isNodeExecuting: (nodeId) => {
    const state = get();
    return state.executingNodes.has(nodeId);
  }
}));