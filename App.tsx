import React, { useState, useCallback, useEffect } from 'react';
import { Agent, LLMConfig, LLMProvider, WorkflowNode, LLMCapability, ChatMessage, HistoryConfig, RobotId } from './types';
import { NavigationLayout } from './components/NavigationLayout';
import { RobotPageRouter } from './components/RobotPageRouter';
import { AgentFormModal } from './components/modals/AgentFormModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { Header } from './components/Header';
import { GUEST_STORAGE_KEYS } from './utils/guestDataUtils';
import { ImageGenerationPanel } from './components/panels/ImageGenerationPanel';
import { ImageModificationPanel } from './components/panels/ImageModificationPanel';
import { VideoGenerationConfigPanel } from './components/panels/VideoGenerationConfigPanel';
import { MapsGroundingConfigPanel } from './components/panels/MapsGroundingConfigPanel';
import { useLocalization } from './hooks/useLocalization';
import { Button } from './components/UI';
import { ConfirmationModal } from './components/modals/ConfirmationModal';
import { FullscreenChatModal } from './components/modals/FullscreenChatModal';
import { AgentConfigurationModal } from './components/modals/AgentConfigurationModal';
import { useRuntimeStore } from './stores/useRuntimeStore';
import { useDesignStore } from './stores/useDesignStore';
import { NotificationProvider } from './contexts';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationDisplay } from './components/NotificationDisplay';
import { QueryProvider } from './providers';
import { getSettingsStorage } from './utils/SettingsStorage';

// ⭐ J4.4: Use the key from guestDataUtils to ensure consistency with wipeGuestData()
const LLM_CONFIGS_KEY = GUEST_STORAGE_KEYS.LLM_CONFIGS;

interface EditingImageInfo {
  nodeId: string;
  sourceImage: string;
  mimeType: string;
}

const initialLLMConfigs: LLMConfig[] = [
  { provider: LLMProvider.Gemini, enabled: true, apiKey: '', capabilities: { [LLMCapability.Chat]: true, [LLMCapability.FileUpload]: true, [LLMCapability.ImageGeneration]: true, [LLMCapability.ImageModification]: true, [LLMCapability.WebSearch]: true, [LLMCapability.URLAnalysis]: true, [LLMCapability.FunctionCalling]: true, [LLMCapability.OutputFormatting]: true, [LLMCapability.VideoGeneration]: true, [LLMCapability.MapsGrounding]: true, [LLMCapability.WebSearchGrounding]: true } },
  { provider: LLMProvider.OpenAI, enabled: false, apiKey: '', capabilities: { [LLMCapability.Chat]: true, [LLMCapability.FileUpload]: true, [LLMCapability.ImageGeneration]: true, [LLMCapability.FunctionCalling]: true, [LLMCapability.OutputFormatting]: true } },
  { provider: LLMProvider.Mistral, enabled: false, apiKey: '', capabilities: { [LLMCapability.Chat]: true, [LLMCapability.FileUpload]: true, [LLMCapability.FunctionCalling]: true, [LLMCapability.OutputFormatting]: true, [LLMCapability.Embedding]: true, [LLMCapability.OCR]: true } },
  { provider: LLMProvider.Anthropic, enabled: false, apiKey: '', capabilities: { [LLMCapability.Chat]: true, [LLMCapability.FileUpload]: true, [LLMCapability.FunctionCalling]: true, [LLMCapability.OutputFormatting]: true } },
  { provider: LLMProvider.Grok, enabled: false, apiKey: '', capabilities: { [LLMCapability.Chat]: true, [LLMCapability.FileUpload]: true, [LLMCapability.FunctionCalling]: true, [LLMCapability.OutputFormatting]: true } },
  { provider: LLMProvider.Perplexity, enabled: false, apiKey: '', capabilities: { [LLMCapability.Chat]: true, [LLMCapability.FunctionCalling]: true, [LLMCapability.OutputFormatting]: true, [LLMCapability.WebSearch]: true } },
  { provider: LLMProvider.Qwen, enabled: false, apiKey: '', capabilities: { [LLMCapability.Chat]: true, [LLMCapability.FileUpload]: true, [LLMCapability.FunctionCalling]: true, [LLMCapability.OutputFormatting]: true } },
  { provider: LLMProvider.Kimi, enabled: false, apiKey: '', capabilities: { [LLMCapability.Chat]: true, [LLMCapability.FunctionCalling]: true, [LLMCapability.OutputFormatting]: true } },
  { provider: LLMProvider.DeepSeek, enabled: false, apiKey: '', capabilities: { [LLMCapability.Chat]: true, [LLMCapability.FunctionCalling]: true, [LLMCapability.OutputFormatting]: true, [LLMCapability.Reasoning]: true, [LLMCapability.CacheOptimization]: true } },
  { provider: LLMProvider.LMStudio, enabled: false, apiKey: 'http://localhost:3928', capabilities: { [LLMCapability.Chat]: true, [LLMCapability.FunctionCalling]: true, [LLMCapability.OutputFormatting]: true, [LLMCapability.Embedding]: false, [LLMCapability.CodeSpecialization]: false } },
];

const loadLLMConfigs = (isAuthenticated: boolean = false, accessToken: string | null = null): LLMConfig[] => {
  try {
    // ⭐ J4.4 CRITICAL: Guest-only fallback
    // Authenticated users get configs from AuthContext.llmApiKeys (fetched at login)
    // This localStorage ONLY for guest mode
    
    if (isAuthenticated && accessToken) {
      // Authenticated mode: IGNORE localStorage, use llmApiKeys from AuthContext
      // Return defaults here, real configs merged via useEffect when llmApiKeys loads
      return initialLLMConfigs;
    }
    
    // Guest mode: Load from localStorage
    const storedConfigsJSON = localStorage.getItem(LLM_CONFIGS_KEY);
    if (!storedConfigsJSON) {
      return initialLLMConfigs;
    }

    const storedConfigs = JSON.parse(storedConfigsJSON) as any[];
    const storedProviders = new Map(storedConfigs.map(c => [c.provider, c]));

    const syncedConfigs = initialLLMConfigs.map(initialConfig => {
      const storedConfig = storedProviders.get(initialConfig.provider);

      if (!storedConfig) {
        return initialConfig; // No user settings for this provider, use default.
      }

      // Sync capabilities
      const syncedCapabilities: { [key in LLMCapability]?: boolean } = {};
      for (const capKey in initialConfig.capabilities) {
        const cap = capKey as LLMCapability;
        if (storedConfig.capabilities && storedConfig.capabilities[cap] !== undefined) {
          syncedCapabilities[cap] = storedConfig.capabilities[cap];
        } else {
          syncedCapabilities[cap] = initialConfig.capabilities[cap];
        }
      }

      // ⭐ J4.4.3 FIX: Support both LLMConfig format (apiKey) and ILLMConfigUI format (apiKeyPlaintext)
      // llmConfigService stores as ILLMConfigUI with apiKeyPlaintext for guest mode
      // Legacy code stored as LLMConfig with apiKey
      const apiKey = storedConfig.apiKey || storedConfig.apiKeyPlaintext || '';

      // Merge
      return {
        ...initialConfig,
        enabled: storedConfig.enabled,
        apiKey: apiKey,
        capabilities: syncedCapabilities,
      };
    });

    return syncedConfigs;

  } catch (error) {
    console.error("Failed to load LLM configs from localStorage", error);
    return initialLLMConfigs;
  }
};


interface DeleteConfirmationState {
  agentId: string;
  agentName: string;
}

interface UpdateConfirmationState {
  agentData: Omit<Agent, 'id'>;
  agentId: string;
  count: number;
}


/**
 * Inner App component that uses Auth context
 * Must be wrapped by AuthProvider to access useAuth()
 */
function AppContent() {
  const { isAuthenticated, accessToken, llmApiKeys } = useAuth();
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isAgentModalOpen, setAgentModalOpen] = useState(false);
  const [isImagePanelOpen, setImagePanelOpen] = useState(false);
  const [isImageModificationPanelOpen, setImageModificationPanelOpen] = useState(false);
  const [isVideoPanelOpen, setVideoPanelOpen] = useState(false);
  const [isMapsPanelOpen, setMapsPanelOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]);
  // ⭐ J4.4: Start with defaults - will be reloaded on first auth change
  const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>(initialLLMConfigs);
  const [currentImageNodeId, setCurrentImageNodeId] = useState<string | null>(null);
  const [currentVideoNodeId, setCurrentVideoNodeId] = useState<string | null>(null);
  const [currentMapsNodeId, setCurrentMapsNodeId] = useState<string | null>(null);
  const [editingImageInfo, setEditingImageInfo] = useState<EditingImageInfo | null>(null);
  const [mapsPreloadedResults, setMapsPreloadedResults] = useState<{
    text: string;
    mapSources: any[];
    query?: string;
  } | null>(null);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; mimeType: string } | null>(null);
  const { t } = useLocalization();

  // Runtime Store access
  const { updateLLMConfigs, setNavigationHandler, addNodeMessage } = useRuntimeStore();

  // Design Store access for integrity validation  
  const { validateWorkflowIntegrity, cleanupOrphanedInstances, addAgentInstance, deleteNode } = useDesignStore();

  /**
   * ⭐ CRITICAL J4.4: Reload LLM configs + WIPE STATE when auth state changes
   * Prevents guest and authenticated sessions from contaminating each other
   * 
   * When user logs in/out or changes auth status:
   * 1. Guest → Auth: configs cleared, defaults set, then real configs via llmApiKeys
   * 2. Auth → Guest: configs cleared, guest configs from localStorage
   * 3. Guest → Guest (new session): configs cleared
   * 
   * ⚠️ SECURITY: ALWAYS reload from scratch on auth change
   * ⚠️ CRITICAL FIX: workflowNodes is React state NOT in Zustand stores
   *    Must be explicitly cleared here to prevent agent leaks on canvas
   * ⚠️ CRITICAL FIX J4.4.2: agents is ALSO React state NOT in Zustand
   *    Must be cleared to prevent prototype leaks in sidebar/navigation
   */
  useEffect(() => {
    // Reload LLM configs respecting new auth state
    const freshConfigs = loadLLMConfigs(isAuthenticated, accessToken);
    setLlmConfigs(freshConfigs);
    updateLLMConfigs(freshConfigs);
    
    // ⭐ CRITICAL J4.4: Clear React state on auth change to prevent data leaks
    setWorkflowNodes([]);
    setAgents([]);
  }, [isAuthenticated, accessToken, updateLLMConfigs]);

  /**
   * ⭐ J4.4.3 FIX: Sync LLM configs from AuthContext's llmApiKeys for authenticated users
   * 
   * Root Cause: The previous fix used useLLMConfigs() which returns ILLMConfigUI[]
   * without the actual apiKey. AuthContext.llmApiKeys contains the decrypted keys
   * from the backend endpoint /api/llm/get-all-api-keys.
   * 
   * Architecture:
   * - Guest mode: loadLLMConfigs() reads from localStorage (LLMConfig[] format)
   * - Auth mode: llmApiKeys from AuthContext (fetched at login with decrypted keys)
   * 
   * This effect runs AFTER auth change effect, merging real API keys with defaults.
   */
  useEffect(() => {
    if (isAuthenticated && llmApiKeys && llmApiKeys.length > 0) {
      // Convert LLMApiKey[] to LLMConfig[]
      const apiConfigs: LLMConfig[] = llmApiKeys.map(key => ({
        provider: key.provider as LLMProvider,
        apiKey: key.apiKey,
        enabled: key.enabled,
        capabilities: (key.capabilities || {}) as { [k in LLMCapability]?: boolean }
      }));
      
      // Merge with initial configs to keep capabilities defaults for providers not in API
      const mergedConfigs = initialLLMConfigs.map(initial => {
        const apiConfig = apiConfigs.find(c => c.provider === initial.provider);
        if (apiConfig) {
          return {
            ...initial,
            ...apiConfig,
            capabilities: { ...initial.capabilities, ...apiConfig.capabilities }
          };
        }
        return initial;
      });
      
      setLlmConfigs(mergedConfigs);
      updateLLMConfigs(mergedConfigs);
    }
  }, [isAuthenticated, llmApiKeys, updateLLMConfigs]);

  // Configure navigation handler for agent nodes
  useEffect(() => {
    setNavigationHandler(handleRobotNavigation);
  }, [setNavigationHandler]);

  // PHASE 1B: Integrity validation on app startup + Migration legacy nodes
  useEffect(() => {
    // Clean up any orphaned instances first
    const cleanedCount = cleanupOrphanedInstances();

    // Then validate workflow integrity
    const { fixedCount } = validateWorkflowIntegrity();

    // 🆕 Migration: Créer des instances pour les nodes legacy sans instanceId
    let migratedCount = 0;
    const updatedNodes = workflowNodes.map(node => {
      if (!node.instanceId && node.agent) {
        // Créer une instance pour ce node legacy
        const instanceId = addAgentInstance(node.agent.id, node.position, node.agent.name);
        migratedCount++;
        return { ...node, instanceId };
      }
      return node;
    });

    if (migratedCount > 0) {
      setWorkflowNodes(updatedNodes);
      console.log(`🔄 Migrated ${migratedCount} legacy nodes to instance architecture`);
    }

    if (cleanedCount > 0 || fixedCount > 0) {
      console.log(`🚀 App startup integrity check completed: cleaned ${cleanedCount} instances, fixed ${fixedCount} nodes`);
    }
  }, []); // Run only once on mount

  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState | null>(null);
  const [updateConfirmation, setUpdateConfirmation] = useState<UpdateConfirmationState | null>(null);

  // Robot Navigation State
  const [currentPath, setCurrentPath] = useState('/bos/dashboard');

  const handleRobotNavigation = (robotId: RobotId, path: string) => {
    setCurrentPath(path);
    // TODO: Implement proper routing logic
    console.log(`Navigating to robot ${robotId} at path ${path}`);
  };

  const handleSaveSettings = async (newLLMConfigs: LLMConfig[]) => {
    try {
      console.log('[App] handleSaveSettings called with configs:', newLLMConfigs);
      const lmStudioConfig = newLLMConfigs.find(c => c.provider === LLMProvider.LMStudio);
      console.log('[App] Saving LMStudio config:', {
        enabled: lmStudioConfig?.enabled,
        endpoint: lmStudioConfig?.apiKey
      });

      // Get appropriate storage based on auth state
      const storage = getSettingsStorage({
        isAuthenticated,
        accessToken,
        user: null,
        login: async () => { },
        register: async () => { },
        logout: () => { },
        refreshToken: async () => { },
        llmApiKeys: null,
        isLoading: false,
        error: null
      });

      // NOTE J4.4: LLMConfigs are now managed separately via useLLMConfigs hook
      // We only save PREFERENCES here (language, theme)
      // LLMConfigs should be saved via LLMConfigModal -> useLLMConfigs -> updateConfig()
      
      // Save preferences only
      await storage.saveSettings({
        preferences: { language: 'fr' }
      });

      console.log('[App] Preferences saved to storage successfully');
      setLlmConfigs(newLLMConfigs);
      console.log('[App] React state updated with new configs');
    } catch (error) {
      console.error("[App] Failed to save settings", error);
    }
  };

  const handleOpenEditAgentModal = (agent: Agent) => {
    setEditingAgent(agent);
    setAgentModalOpen(true);
  };

  const handleSaveAgent = (agentData: Omit<Agent, 'id'>, agentId?: string) => {
    if (agentId) { // Editing existing agent
      const instancesCount = workflowNodes.filter(n => n.agent.id === agentId).length;
      if (instancesCount > 0) {
        setUpdateConfirmation({ agentData, agentId, count: instancesCount });
      } else {
        // No instances, just save directly
        const updatedAgent = { ...agentData, id: agentId };
        setAgents(prev => prev.map(a => a.id === agentId ? updatedAgent : a));
      }
    } else { // Creating new agent
      setAgents(prev => [...prev, { ...agentData, id: `agent-${Date.now()}` }]);
    }
    setAgentModalOpen(false);
    setEditingAgent(null);
  };

  const handleUpdateConfirmation = (updateInstances: boolean) => {
    if (updateConfirmation) {
      const { agentData, agentId } = updateConfirmation;
      const updatedAgent = { ...agentData, id: agentId };

      // Update the prototype agent
      setAgents(prev => prev.map(a => a.id === agentId ? updatedAgent : a));

      if (updateInstances) {
        setWorkflowNodes(prev => prev.map(node =>
          node.agent.id === agentId
            ? { ...node, agent: updatedAgent }
            : node
        ));
      }
    }
    setUpdateConfirmation(null);
  };

  const handleDeleteAgent = (agentId: string) => {
    const agentToDelete = agents.find(agent => agent.id === agentId);
    if (agentToDelete) {
      setDeleteConfirmation({ agentId, agentName: agentToDelete.name });
    }
  };

  const confirmDeleteAgent = () => {
    if (deleteConfirmation) {
      const { agentId } = deleteConfirmation;
      setAgents(prev => prev.filter(agent => agent.id !== agentId));
      setWorkflowNodes(prev => prev.filter(node => node.agent.id !== agentId));
      setDeleteConfirmation(null);
    }
  };

  const addAgentToWorkflow = useCallback((agent: Agent) => {
    // Calculate position based on existing instances
    const position = {
      x: (workflowNodes.length % 4) * 420 + 20,
      y: Math.floor(workflowNodes.length / 4) * 540 + 20,
    };

    // Add agent instance to DesignStore instead of local state
    const instanceId = addAgentInstance(agent.id, position);

    // Legacy: Also add to local state for now to maintain compatibility
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      agent,
      position,
      messages: [],
      isMinimized: false,
      isMaximized: false,
      instanceId // ✅ Stocker instanceId pour accès au modal de configuration
    };
    setWorkflowNodes(prev => [...prev, newNode]);
  }, [workflowNodes, addAgentInstance]);

  const handleDeleteNode = (nodeId: string) => {
    setWorkflowNodes(prev => prev.filter(node => node.id !== nodeId));
    // CRITICAL: Also delete from Zustand store to maintain consistency
    deleteNode(nodeId);
  };

  const handleDeleteNodes = (instanceIds: string[]) => {
    // Batch delete multiple nodes by instanceId (used when deleting prototype with instances)
    setWorkflowNodes(prev => prev.filter(node => !node.instanceId || !instanceIds.includes(node.instanceId)));
  };

  const handleUpdateNodePosition = (nodeId: string, position: { x: number; y: number }) => {
    setWorkflowNodes(prev =>
      prev.map(node => (node.id === nodeId ? { ...node, position } : node))
    );
  };

  const handleToggleNodeMaximize = (nodeId: string) => {
    setWorkflowNodes(prev =>
      prev.map(node => {
        // Si c'est le node ciblé, inverser son état isMaximized
        if (node.id === nodeId) {
          return { ...node, isMaximized: !node.isMaximized };
        }
        // Forcer tous les autres nodes à isMaximized: false (un seul à la fois)
        return { ...node, isMaximized: false };
      })
    );
  };

  const handleOpenImagePanel = (nodeId: string) => {
    setCurrentImageNodeId(nodeId);
    setImagePanelOpen(true);
  };

  const handleImageGenerated = (nodeId: string, imageBase64: string) => {
    const imageMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      text: t('app_generatedImageText'),
      image: imageBase64,
      mimeType: 'image/png',
    };
    handleUpdateNodeMessages(nodeId, prev => [...prev, imageMessage]);
    addNodeMessage(nodeId, imageMessage);
  };

  const handleOpenImageModificationPanel = (nodeId: string, sourceImage: string, mimeType: string = 'image/png') => {
    setEditingImageInfo({ nodeId, sourceImage, mimeType });
    setImageModificationPanelOpen(true);
  };

  const handleOpenVideoPanel = (nodeId: string) => {
    setCurrentVideoNodeId(nodeId);
    setVideoPanelOpen(true);
  };

  const handleOpenMapsPanel = (nodeId: string, preloadedResults?: { text: string; mapSources: any[]; query?: string }) => {
    setCurrentMapsNodeId(nodeId);
    setMapsPreloadedResults(preloadedResults || null);
    setMapsPanelOpen(true);
  };

  const handleImageModified = (nodeId: string, newImage: string, text: string) => {
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      text: text,
      image: newImage,
      mimeType: 'image/png',
    };
    handleUpdateNodeMessages(nodeId, prev => [...prev, message]);
    addNodeMessage(nodeId, message);
  };

  const handleToggleNodeMinimize = (nodeId: string) => {
    setWorkflowNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, isMinimized: !node.isMinimized } : node
    ));
    // Note: Le centrage sera géré par WorkflowCanvas via centerNodeRef
  };

  const handleUpdateNodeMessages = (nodeId: string, messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setWorkflowNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, messages: typeof messages === 'function' ? messages(node.messages) : messages }
        : node
    ));
  };

  const handleOpenFullscreen = (src: string, mimeType: string) => {
    setFullscreenImage({ src, mimeType });
  };

  const handleOpenAgentFullscreen = (nodeId: string) => {
    // Utiliser le store runtime pour ouvrir le FullscreenChatModal existant
    const { setFullscreenChatNodeId } = useRuntimeStore.getState();
    setFullscreenChatNodeId(nodeId);
  };

  const handleAddToWorkflow = (agent: Agent) => {
    addAgentToWorkflow(agent);
  };

  return (
    <QueryProvider>
      <NotificationProvider>
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
          <Header
            onOpenSettings={() => setSettingsModalOpen(true)}
          />
          <div className="flex flex-1 overflow-hidden">
            <NavigationLayout
              agents={agents}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
              onAddAgent={() => { setEditingAgent(null); setAgentModalOpen(true); }}
              onAddToWorkflow={addAgentToWorkflow}
              onDeleteAgent={handleDeleteAgent}
              onEditAgent={handleOpenEditAgentModal}
              currentPath={currentPath}
              onNavigate={handleRobotNavigation}
            />
            <main className="flex-1 bg-gray-800/50 overflow-hidden">
              <RobotPageRouter
                currentPath={currentPath}
                llmConfigs={llmConfigs}
                onNavigate={handleRobotNavigation}
                agents={agents}
                workflowNodes={workflowNodes}
                onDeleteNode={handleDeleteNode}
                onDeleteNodes={handleDeleteNodes}
                onUpdateNodeMessages={handleUpdateNodeMessages}
                onUpdateNodePosition={handleUpdateNodePosition}
                onToggleNodeMinimize={handleToggleNodeMinimize}
                onToggleNodeMaximize={handleToggleNodeMaximize}
                onOpenImagePanel={handleOpenImagePanel}
                onOpenImageModificationPanel={handleOpenImageModificationPanel}
                onOpenVideoPanel={handleOpenVideoPanel}
                onOpenMapsPanel={handleOpenMapsPanel}
                onOpenFullscreen={handleOpenFullscreen}
                onOpenAgentFullscreen={handleOpenAgentFullscreen}
                onAddToWorkflow={handleAddToWorkflow}
                isImagePanelOpen={isImagePanelOpen}
                isImageModificationPanelOpen={isImageModificationPanelOpen}
                isVideoPanelOpen={isVideoPanelOpen}
                isMapsPanelOpen={isMapsPanelOpen}
              />
            </main>
          </div>

          {isSettingsModalOpen && (
            <SettingsModal
              llmConfigs={llmConfigs}
              onClose={() => setSettingsModalOpen(false)}
              onSave={handleSaveSettings}
            />
          )}

          {isAgentModalOpen && (
            <AgentFormModal
              onClose={() => { setAgentModalOpen(false); setEditingAgent(null); }}
              onSave={handleSaveAgent}
              llmConfigs={llmConfigs}
              existingAgent={editingAgent}
            />
          )}

          {updateConfirmation && (
            <ConfirmationModal
              isOpen={true}
              title={t('dialog_update_title')}
              message={t('dialog_update_message', { count: updateConfirmation.count })}
              confirmText={t('dialog_update_confirmButton')}
              cancelText={t('dialog_update_cancelButton')}
              onConfirm={() => handleUpdateConfirmation(true)}
              onCancel={() => handleUpdateConfirmation(false)}
            />
          )}

          {deleteConfirmation && (
            <ConfirmationModal
              isOpen={true}
              title={t('dialog_delete_title')}
              message={t('dialog_delete_message', { agentName: deleteConfirmation.agentName })}
              confirmText={t('dialog_delete_confirmButton')}
              onConfirm={confirmDeleteAgent}
              onCancel={() => setDeleteConfirmation(null)}
              variant="danger"
            />
          )}

          {isImagePanelOpen && (
            <ImageGenerationPanel
              isOpen={isImagePanelOpen}
              nodeId={currentImageNodeId}
              llmConfigs={llmConfigs}
              workflowNodes={workflowNodes}
              onClose={() => setImagePanelOpen(false)}
              onImageGenerated={handleImageGenerated}
              onOpenImageModificationPanel={handleOpenImageModificationPanel}
            />
          )}

          {isImageModificationPanelOpen && (
            <ImageModificationPanel
              isOpen={isImageModificationPanelOpen}
              editingImageInfo={editingImageInfo}
              llmConfigs={llmConfigs}
              workflowNodes={workflowNodes}
              onClose={() => setImageModificationPanelOpen(false)}
              onImageModified={handleImageModified}
            />
          )}

          {isVideoPanelOpen && (
            <VideoGenerationConfigPanel
              isOpen={isVideoPanelOpen}
              nodeId={currentVideoNodeId}
              llmConfigs={llmConfigs}
              workflowNodes={workflowNodes}
              onClose={() => setVideoPanelOpen(false)}
            />
          )}

          {isMapsPanelOpen && (
            <MapsGroundingConfigPanel
              isOpen={isMapsPanelOpen}
              nodeId={currentMapsNodeId}
              llmConfigs={llmConfigs}
              workflowNodes={workflowNodes}
              onClose={() => {
                setMapsPanelOpen(false);
                setMapsPreloadedResults(null);
              }}
              preloadedResults={mapsPreloadedResults || undefined}
            />
          )}

          {fullscreenImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm"
              onClick={() => setFullscreenImage(null)}
            >
              <img
                src={`data:${fullscreenImage.mimeType};base64,${fullscreenImage.src}`}
                alt={t('fullscreenModal_alt')}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                variant="ghost"
                onClick={() => setFullscreenImage(null)}
                className="absolute top-4 right-4 text-white text-2xl px-2 py-2"
                aria-label={t('fullscreenModal_close_aria')}
              >
                &times;
              </Button>
            </div>
          )}

          {/* Fullscreen Chat Modal */}
          <FullscreenChatModal
            onDeleteNode={handleDeleteNode}
            onOpenImagePanel={handleOpenImagePanel}
            onOpenVideoPanel={handleOpenVideoPanel}
            onOpenMapsPanel={handleOpenMapsPanel}
          />

          {/* Configuration Modal */}
          <AgentConfigurationModal llmConfigs={llmConfigs} />

          <NotificationDisplay />
        </div>
      </NotificationProvider>
    </QueryProvider>
  );
}

/**
 * Root App component with all providers
 * AuthProvider wraps AppContent to enable useAuth() hook
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
