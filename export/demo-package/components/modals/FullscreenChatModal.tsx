import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../UI';
import { CloseIcon, UploadIcon, SendIcon } from '../Icons';
import { useRuntimeStore } from '../../stores/useRuntimeStore';
import { useDesignStore } from '../../stores/useDesignStore';
import { ChatMessage } from '../../types';

interface FullscreenChatModalProps {}

export const FullscreenChatModal: React.FC<FullscreenChatModalProps> = () => {
  const { 
    fullscreenChatNodeId, 
    setFullscreenChatNodeId, 
    getNodeMessages, 
    addNodeMessage,
    setNodeExecuting,
    isNodeExecuting
  } = useRuntimeStore();
  
  const { getResolvedInstance } = useDesignStore();
  
  const [userInput, setUserInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Si pas de node sélectionné, ne pas afficher la modal
  if (!fullscreenChatNodeId) return null;
  
  const resolvedInstance = getResolvedInstance(fullscreenChatNodeId);
  if (!resolvedInstance) return null;
  
  const { instance, prototype } = resolvedInstance;
  const messages = getNodeMessages(fullscreenChatNodeId);
  const isLoading = isNodeExecuting(fullscreenChatNodeId);
  
  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleClose = () => {
    setFullscreenChatNodeId(null);
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput && !attachedFile) return;

    setNodeExecuting(fullscreenChatNodeId, true);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: trimmedInput,
    };

    if (attachedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        userMessage.image = base64Data;
        userMessage.mimeType = attachedFile.type;
        addNodeMessage(fullscreenChatNodeId, userMessage);
      };
      reader.readAsDataURL(attachedFile);
    } else {
      addNodeMessage(fullscreenChatNodeId, userMessage);
    }

    setUserInput('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // TODO: Trigger LLM response (similar to V2AgentNode)
    // For now, just remove loading state
    setTimeout(() => {
      setNodeExecuting(fullscreenChatNodeId, false);
    }, 1000);
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
        <div className={`max-w-3xl px-4 py-2 rounded-lg ${
          isUser 
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
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
            <h2 className="text-xl font-semibold text-white">
              💬 {prototype.name}
            </h2>
            <span className="text-sm text-gray-400">
              ({prototype.model} • {prototype.llmProvider})
            </span>
          </div>
          
          <Button
            variant="ghost"
            onClick={handleClose}
            className="p-2 h-10 w-10 text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <CloseIcon width={20} height={20} />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">💬</div>
                <p>Commencez une conversation avec {prototype.name}</p>
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
                  <span>Agent en cours de réflexion...</span>
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
              >
                <UploadIcon width={16} height={16} />
              </Button>
              
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
    </div>
  );
};