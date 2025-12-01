import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../UI';
import { CloseIcon, UploadIcon, SendIcon, ImageIcon, EditIcon } from '../Icons';
import { useRuntimeStore } from '../../stores/useRuntimeStore';
import { useDesignStore } from '../../stores/useDesignStore';
import { useAgentChat } from '../../hooks/useAgentChat';
import { useLocalization } from '../../hooks/useLocalization';
import { ChatMessage, Agent, LLMCapability } from '../../types';
import { ConfirmationModal } from './ConfirmationModal';

// Minimize icon
const MinimizeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

// Video icon Arc-LLM
const VideoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

// Map icon Arc-LLM
const MapIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
    <line x1="8" y1="2" x2="8" y2="18"></line>
    <line x1="16" y1="6" x2="16" y2="22"></line>
  </svg>
);

// Web Search icon Arc-LLM
const WebSearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
    <path d="M11 1v2"></path>
    <path d="M11 19v2"></path>
    <path d="M1 11h2"></path>
    <path d="M19 11h2"></path>
  </svg>
);

interface FullscreenChatModalProps {
  onDeleteNode?: (nodeId: string) => void;
  onOpenImagePanel?: (nodeId: string) => void;
  onOpenVideoPanel?: (nodeId: string) => void;
  onOpenMapsPanel?: (nodeId: string, preloadedResults?: { text: string; mapSources: any[]; query?: string }) => void;
}

export const FullscreenChatModal: React.FC<FullscreenChatModalProps> = ({
  onDeleteNode,
  onOpenImagePanel,
  onOpenVideoPanel,
  onOpenMapsPanel
}) => {
  const {
    fullscreenChatNodeId,
    fullscreenChatAgent,
    setFullscreenChatNodeId,
    getNodeMessages,
    addNodeMessage,
    setNodeExecuting,
    isNodeExecuting
  } = useRuntimeStore();

  const { getResolvedInstance, agents } = useDesignStore();
  const { t } = useLocalization();

  const [userInput, setUserInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Appeler getResolvedInstance AVANT tout early return (Rules of Hooks)
  const resolvedInstance = fullscreenChatNodeId ? getResolvedInstance(fullscreenChatNodeId) : null;
  const messages = fullscreenChatNodeId ? getNodeMessages(fullscreenChatNodeId) : [];
  const isLoading = fullscreenChatNodeId ? isNodeExecuting(fullscreenChatNodeId) : false;

  // Récupérer llmConfigs depuis le store
  const llmConfigs = useRuntimeStore(state => state.llmConfigs);

  // Récupérer l'agent complet (priorité: fullscreenChatAgent du store, sinon V2 resolvedInstance)
  const agent: Agent | null = fullscreenChatAgent || (resolvedInstance ? resolvedInstance.prototype : null);

  // Hook pour gérer l'envoi de messages (logique partagée avec V2AgentNode)
  const { handleSendMessage: sendMessageToLLM, loadingMessage } = useAgentChat({
    nodeId: fullscreenChatNodeId || '',
    agent,
    llmConfigs,
    t
  });

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Si pas de node sélectionné, ne pas afficher la modal (APRÈS tous les hooks)
  if (!fullscreenChatNodeId) return null;

  // Déterminer le nom et les infos de l'agent
  const agentName = resolvedInstance
    ? (resolvedInstance.instance.name || resolvedInstance.prototype.name)
    : (agent?.name || 'Agent'); // Fallback: utiliser agent.name si disponible

  const agentModel = agent?.model || 'Unknown';
  const agentProvider = agent?.llmProvider || 'Unknown';

  const handleClose = () => {
    const { setFullscreenChatAgent } = useRuntimeStore.getState();
    setFullscreenChatNodeId(null);
    setFullscreenChatAgent(null); // Nettoyer l'agent au moment de fermer
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (fullscreenChatNodeId && onDeleteNode) {
      onDeleteNode(fullscreenChatNodeId);
    }
    setShowDeleteConfirm(false);
    handleClose(); // Fermer le modal après suppression
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleOpenImagePanel = () => {
    if (fullscreenChatNodeId && onOpenImagePanel) {
      onOpenImagePanel(fullscreenChatNodeId);
    }
  };

  const handleOpenVideoPanel = () => {
    if (fullscreenChatNodeId && onOpenVideoPanel) {
      onOpenVideoPanel(fullscreenChatNodeId);
    }
  };

  const handleOpenMapsPanel = () => {
    if (fullscreenChatNodeId && onOpenMapsPanel) {
      onOpenMapsPanel(fullscreenChatNodeId);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput && !attachedFile) return;

    // Déléguer l'envoi au hook partagé (même logique que V2AgentNode)
    await sendMessageToLLM(trimmedInput, attachedFile);

    // Nettoyer l'input après envoi
    setUserInput('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.sender === 'user';
    const isError = message.isError;

    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-3xl px-4 py-2 rounded-lg ${isUser
          ? 'bg-indigo-600 text-white ml-12'
          : isError
            ? 'bg-red-600/20 text-red-200 mr-12'
            : 'bg-gray-700 text-gray-100 mr-12'
          }`}>
          <div className="whitespace-pre-wrap break-words">
            {message.text}
          </div>
          {message.image && (
            <div className="mt-2">
              <img
                src={`data:${message.mimeType};base64,${message.image}`}
                alt="Uploaded content"
                className="max-w-sm rounded cursor-pointer hover:opacity-80"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full h-full max-w-6xl bg-gray-800 rounded-lg shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-gray-900/80 via-gray-800/60 to-gray-900/80 rounded-t-lg backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full shadow-lg transition-all duration-200 ${isLoading ? 'bg-yellow-400 animate-pulse shadow-yellow-400/60' : 'bg-green-400 shadow-green-400/60'}`}></div>
            <h2 className="text-xl font-semibold text-white">
              💬 {agentName}
            </h2>
            <span className="text-sm text-gray-400">
              ({agentModel} • {agentProvider})
            </span>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Image generation/modification button */}
            {(agent?.capabilities?.includes(LLMCapability.ImageGeneration) || agent?.capabilities?.includes(LLMCapability.ImageModification)) && (
              <Button
                variant="ghost"
                className="p-2 h-8 w-8 text-gray-400 hover:text-purple-400 
                           hover:bg-purple-500/20 hover:shadow-lg hover:shadow-purple-500/40
                           transition-all duration-200 rounded-md
                           hover:scale-110 active:scale-95"
                onClick={handleOpenImagePanel}
                disabled={isLoading}
                title={t('agentNode_aria_generateImage')}
              >
                <ImageIcon width={16} height={16} />
              </Button>
            )}

            {/* Video generation button */}
            {agent?.capabilities?.includes(LLMCapability.VideoGeneration) && (
              <Button
                variant="ghost"
                className="p-2 h-8 w-8 text-gray-400 hover:text-pink-400 
                           hover:bg-pink-500/20 hover:shadow-lg hover:shadow-pink-500/40
                           transition-all duration-200 rounded-md
                           hover:scale-110 active:scale-95"
                onClick={handleOpenVideoPanel}
                disabled={isLoading}
                title="Générer une vidéo"
              >
                <VideoIcon />
              </Button>
            )}

            {/* Maps grounding button */}
            {agent?.capabilities?.includes(LLMCapability.MapsGrounding) && (
              <Button
                variant="ghost"
                className="p-2 h-8 w-8 text-gray-400 hover:text-green-400 
                           hover:bg-green-500/20 hover:shadow-lg hover:shadow-green-500/40
                           transition-all duration-200 rounded-md
                           hover:scale-110 active:scale-95"
                onClick={handleOpenMapsPanel}
                disabled={isLoading}
                title="Recherche de lieux"
              >
                <MapIcon />
              </Button>
            )}

            {/* Minimize/Restore button (ferme le fullscreen) */}
            <Button
              variant="ghost"
              className="p-2 h-8 w-8 text-gray-400 hover:text-blue-400 
                         hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/40
                         transition-all duration-200 rounded-md
                         hover:scale-110 active:scale-95"
              onClick={handleClose}
              title={t('restore_size')}
            >
              <MinimizeIcon width={16} height={16} />
            </Button>

            {/* Delete button */}
            <Button
              variant="ghost"
              className="p-2 h-8 w-8 text-gray-400 hover:text-red-400 
                         hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/40
                         transition-all duration-200 rounded-md
                         hover:scale-110 active:scale-95"
              onClick={handleDelete}
              title={t('sidebar_deleteAgent_aria', { agentName })}
            >
              <CloseIcon width={16} height={16} />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">💬</div>
                <p>Commencez une conversation avec {agentName}</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </>
          )}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-700 text-gray-100 mr-12 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                  <span>{loadingMessage || 'Agent en cours de réflexion...'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 bg-gray-900/30 p-4">
          <form onSubmit={handleSendMessage} className="space-y-3">
            {attachedFile && (
              <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded">
                <span className="text-sm text-gray-300">📎 {attachedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAttachedFile(null)}
                  className="p-1 h-6 w-6 text-gray-400 hover:text-red-400"
                >
                  <CloseIcon width={12} height={12} />
                </Button>
              </div>
            )}

            <div className="flex space-x-2">
              {agent?.capabilities?.includes(LLMCapability.FileUpload) && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 h-10 w-10 text-gray-400 hover:text-blue-400"
                    disabled={isLoading}
                  >
                    <UploadIcon width={16} height={16} />
                  </Button>
                </>
              )}

              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Tapez votre message..."
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                disabled={isLoading}
              />

              <Button
                type="submit"
                disabled={(!userInput.trim() && !attachedFile) || isLoading}
                className="p-2 h-10 w-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendIcon width={16} height={16} />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={t('confirm_delete_agent_title')}
        message={t('confirm_delete_agent_message', { agentName })}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText={t('confirm_delete')}
        cancelText={t('cancel')}
        variant="danger"
      />
    </div>
  );
};