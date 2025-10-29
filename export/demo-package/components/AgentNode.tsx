import React, { useState, useRef, useEffect } from 'react';
import { LLMCapability, WorkflowNode, ChatMessage, LLMConfig, ToolCall, LLMProvider } from '../types';
import { Button, Card } from './UI';
import { UploadIcon, SendIcon, CloseIcon, CollapseIcon, ExpandIcon, ImageIcon, WebIcon, ErrorIcon, EditIcon, SaveIcon, PrintIcon, FileIcon, ChevronRightIcon, EmbeddingIcon, OcrIcon } from './Icons';
import * as llmService from '../services/llmService';
import * as mistralService from '../services/mistralService';
import { fileToBase64, fileToText } from '../utils/fileUtils';
import { countChars, countWords, countTokens, countSentences, countMessages } from '../utils/textUtils';
import { executeTool } from '../utils/toolExecutor';
import { useLocalization } from '../hooks/useLocalization';

const ToolIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
);


interface AgentNodeProps {
  node: WorkflowNode;
  llmConfigs: LLMConfig[];
  onDelete: (nodeId: string) => void;
  onUpdateMessages: (nodeId: string, messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  onToggleMinimize: (nodeId: string) => void;
  onOpenImagePanel: (nodeId: string) => void;
  onOpenImageModificationPanel: (nodeId: string, sourceImage: string, mimeType: string) => void;
  onOpenFullscreen: (sourceImage: string, mimeType: string) => void;
  onDragStart: (nodeId: string, e: React.MouseEvent) => void;
}

export const AgentNode: React.FC<AgentNodeProps> = ({ node, llmConfigs, onDelete, onUpdateMessages, onToggleMinimize, onOpenImagePanel, onOpenImageModificationPanel, onOpenFullscreen, onDragStart }) => {
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const ocrFileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [historyStats, setHistoryStats] = useState({ tokens: 0, words: 0, sentences: 0, messages: 0 });
    const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
    const [showOcrUrlInput, setShowOcrUrlInput] = useState(false);
    const [ocrUrl, setOcrUrl] = useState('');
    const { t } = useLocalization();

    const agentConfig = llmConfigs.find(c => c.provider === node.agent.llmProvider);
    
    useEffect(() => {
        if (!node.isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        if (node.agent.historyConfig?.enabled) {
            setHistoryStats({
                tokens: countTokens(node.messages),
                words: countWords(node.messages),
                sentences: countSentences(node.messages),
                messages: countMessages(node.messages),
            });
        }
    }, [node.messages, node.isMinimized, node.agent.historyConfig?.enabled]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = userInput.trim();
        if (!trimmedInput && !attachedFile) return;

        setIsLoading(true);
        setLoadingMessage('');

        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'user',
            text: trimmedInput,
        };
        
        if (attachedFile) {
            userMessage.filename = attachedFile.name;
            userMessage.mimeType = attachedFile.type;
            if (node.agent.llmProvider === LLMProvider.Mistral) {
                try {
                    userMessage.fileContent = await fileToText(attachedFile);
                } catch (err) {
                    console.error("Could not read attached file as text for Mistral agent:", err);
                    userMessage.text = `(Une erreur est survenue lors de la lecture du fichier '${attachedFile.name}')\n\n` + userMessage.text;
                    userMessage.isError = true;
                }
            } else {
                userMessage.image = await fileToBase64(attachedFile);
            }
        }

        onUpdateMessages(node.id, prev => [...prev, userMessage]);
        
        let conversationHistoryForAPI: ChatMessage[];
        
        setUserInput('');
        setAttachedFile(null);

        try {
            if (!agentConfig) throw new Error(`Configuration for ${node.agent.llmProvider} is not set.`);
            
            const historyConfig = node.agent.historyConfig;
            const currentFullHistory = [...node.messages, userMessage];

            if (historyConfig?.enabled && node.messages.length > 0) {
                const { limits } = historyConfig;
                const stats = {
                    tokens: countTokens(currentFullHistory),
                    words: countWords(currentFullHistory),
                    sentences: countSentences(currentFullHistory),
                    messages: countMessages(currentFullHistory),
                };

                const shouldSummarize = stats.tokens >= limits.token || stats.words >= limits.word || stats.sentences >= limits.sentence || stats.messages >= limits.message;

                if (shouldSummarize) {
                    setLoadingMessage(t('agentNode_history_summarizing'));
                    const summarizationConfig = llmConfigs.find(c => c.provider === historyConfig.llmProvider);
                    if (!summarizationConfig) throw new Error(`Summarization LLM ${historyConfig.llmProvider} not configured.`);
                    
                    const summarizationPrompt = `Conversation à résumer:\n\n${currentFullHistory.map(m => `${m.sender}: ${m.text}`).join('\n')}`;
                    const summarizationHistory: ChatMessage[] = [{ id: `msg-summary-prompt-${Date.now()}`, sender: 'user', text: summarizationPrompt }];

                    const { text: summary } = await llmService.generateContent(
                        summarizationConfig.provider,
                        summarizationConfig.apiKey,
                        historyConfig.model,
                        historyConfig.systemPrompt,
                        summarizationHistory
                    );

                    const summaryMessage: ChatMessage = { id: `msg-${Date.now()}-summary`, sender: 'agent', text: `(Résumé de l'historique): ${summary}` };
                    
                    conversationHistoryForAPI = [summaryMessage, userMessage];
                    onUpdateMessages(node.id, [summaryMessage, userMessage]);
                } else {
                     conversationHistoryForAPI = currentFullHistory;
                }
            } else {
                conversationHistoryForAPI = historyConfig?.enabled ? currentFullHistory : [userMessage];
            }
            
            let continueConversation = true;
            let loopCount = 0;
            const maxLoops = 10;
            
            while (continueConversation && loopCount < maxLoops) {
                loopCount++;
                const systemInstruction = `Role: ${node.agent.role}. Behavior: ${node.agent.systemPrompt}.`;

                const agentMessageId = `msg-${Date.now()}-agent-${loopCount}`;
                const placeholderMessage: ChatMessage = { id: agentMessageId, sender: 'agent', text: '...' };
                onUpdateMessages(node.id, prev => [...prev, placeholderMessage]);
                
                const responseStream = llmService.generateContentStream(
                    agentConfig.provider, 
                    agentConfig.apiKey, 
                    node.agent.model,
                    systemInstruction,
                    conversationHistoryForAPI, 
                    node.agent.tools, 
                    node.agent.outputConfig
                );

                let fullResponse = '';
                let toolCalls: ToolCall[] = [];
                let hasReceivedResponse = false;

                for await (const chunk of responseStream) {
                    if (chunk.error) {
                        throw new Error(chunk.error);
                    }

                    if (chunk.response) {
                        const responsePayload = chunk.response as any;

                        if (responsePayload.text) {
                            hasReceivedResponse = true;
                            fullResponse += responsePayload.text;
                            onUpdateMessages(node.id, prev => prev.map(msg =>
                                msg.id === agentMessageId ? { ...msg, text: fullResponse } : msg
                            ));
                        } else if (responsePayload.toolCalls) {
                            hasReceivedResponse = true;
                            toolCalls = responsePayload.toolCalls;
                        }
                    }
                }
                
                if (toolCalls.length > 0) {
                    const agentToolCallMessage: ChatMessage = { id: agentMessageId, sender: 'agent', text: '', toolCalls: toolCalls, status: 'executing_tool' };
                    onUpdateMessages(node.id, prev => prev.map(msg => msg.id === agentMessageId ? agentToolCallMessage : msg));
                    
                    const toolResults: ChatMessage[] = [];
                    for (const call of toolCalls) {
                        const result = await executeTool(call);
                        const toolMessage: ChatMessage = {
                            id: `msg-${Date.now()}-tool`,
                            sender: 'tool_result',
                            toolCallId: call.id,
                            toolName: call.name,
                            text: JSON.stringify(result, null, 2),
                            isError: 'error' in result,
                        };
                        toolResults.push(toolMessage);
                    }
                    
                    onUpdateMessages(node.id, prev => {
                        const updatedMessages = prev.map(msg => msg.id === agentMessageId ? { ...msg, status: undefined } : msg);
                        return [...updatedMessages, ...toolResults];
                    });
                    
                    conversationHistoryForAPI.push(agentToolCallMessage, ...toolResults);

                } else if(hasReceivedResponse) {
                    const finalAgentMessage: ChatMessage = { id: agentMessageId, sender: 'agent', text: fullResponse };
                    conversationHistoryForAPI.push(finalAgentMessage);
                    continueConversation = false;
                } else {
                     onUpdateMessages(node.id, prev => prev.filter(msg => msg.id !== agentMessageId));
                     continueConversation = false;
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            const errorId = `msg-${Date.now()}-error`;
            onUpdateMessages(node.id, prev => [...prev.filter(m => m.text !== '...'), { id: errorId, sender: 'agent', text: `Error: ${errorMessage}`, isError: true }]);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleEmbed = async () => {
        const textToEmbed = userInput.trim();
        if (!textToEmbed || !agentConfig) return;
        setIsLoading(true);

        const result = await mistralService.createEmbedding(agentConfig.apiKey, textToEmbed);
        
        if (result.embedding) {
            const message: ChatMessage = {
                id: `msg-${Date.now()}`,
                sender: 'agent',
                text: t('agentNode_embeddingSuccess', { text: textToEmbed.substring(0, 20) + '...', dim: result.embedding.length }),
            };
            onUpdateMessages(node.id, prev => [...prev, message]);
            setUserInput('');
        } else {
            const message: ChatMessage = {
                id: `msg-${Date.now()}`,
                sender: 'agent',
                isError: true,
                text: t('agentNode_embeddingError', { error: result.error || 'Unknown error' }),
            };
            onUpdateMessages(node.id, prev => [...prev, message]);
        }
        setIsLoading(false);
    };

    const handleOcr = async (source: { file: File } | { url: string }) => {
        if (!agentConfig) return;
        setIsLoading(true);

        const result = await mistralService.performOcr(agentConfig.apiKey, source);
        
        if (result.text) {
            const sourceName = 'file' in source ? source.file.name : source.url;
            const message: ChatMessage = {
                id: `msg-${Date.now()}`,
                sender: 'agent',
                text: `${t('agentNode_ocrSuccess', { sourceName: sourceName })}:\n\n${result.text}`,
            };
            onUpdateMessages(node.id, prev => [...prev, message]);
        } else {
            const message: ChatMessage = {
                id: `msg-${Date.now()}`,
                sender: 'agent',
                isError: true,
                text: t('agentNode_ocrError', { error: result.error || 'Unknown error' }),
            };
            onUpdateMessages(node.id, prev => [...prev, message]);
        }
        setIsLoading(false);
    };

    const handleOcrFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleOcr({ file: e.target.files[0] });
            e.target.value = ''; // Reset file input
        }
    };

    const handleOcrUrlClick = () => {
        setShowOcrUrlInput(true);
    };

    const handleConfirmOcrUrl = () => {
        const url = ocrUrl.trim();
        if (!url) return;
        try {
            new URL(url); // basic validation
            handleOcr({ url });
            setShowOcrUrlInput(false);
            setOcrUrl('');
        } catch (_) {
            const message: ChatMessage = {
                id: `msg-${Date.now()}`,
                sender: 'agent',
                isError: true,
                text: t('agentNode_invalidUrl'),
            };
            onUpdateMessages(node.id, prev => [...prev, message]);
        }
    };
    
    const handleCancelOcrUrl = () => {
        setShowOcrUrlInput(false);
        setOcrUrl('');
    };
    
    const handleFileButtonClick = () => fileInputRef.current?.click();
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setAttachedFile(e.target.files[0]);
            e.target.value = ''; // Reset file input
        }
    };
    
    const toggleFileExpansion = (messageId: string) => {
        setExpandedFiles(prev => ({ ...prev, [messageId]: !prev[messageId] }));
    };

    const handleSaveImage = (base64Image: string, mimeType: string) => {
        const link = document.createElement('a');
        link.href = `data:${mimeType};base64,${base64Image}`;
        const extension = mimeType.split('/')[1] || 'png';
        link.download = `generated-image-${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintImage = (base64Image: string, mimeType: string) => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head><title>${t('agentNode_print_title')}</title></head>
                    <body style="margin:0; text-align: center;">
                        <img src="data:${mimeType};base64,${base64Image}" style="max-width:100%;" />
                        <script>
                            window.onload = function() {
                                window.print();
                                window.onafterprint = function() { window.close(); };
                            }
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const historyConfig = node.agent.historyConfig;

  return (
    <div
      className="absolute flex flex-col transition-all duration-300"
      style={{ 
        left: `${node.position.x}px`, 
        top: `${node.position.y}px`, 
        width: '400px', 
        height: node.isMinimized ? 'auto' : '520px' 
      }}
    >
      <Card className="w-full h-full shadow-2xl border-indigo-500/30 flex flex-col">
        <div 
            className="p-3 bg-gray-700/50 rounded-t-lg flex items-center justify-between cursor-grab"
            onMouseDown={(e) => onDragStart(node.id, e)}
        >
            <div className="flex-1 overflow-hidden">
                <h3 className="font-bold text-lg text-indigo-300 truncate">{node.agent.name}</h3>
                <p className="text-sm text-gray-400 truncate">{node.agent.role}</p>
            </div>
            <div className="flex items-center">
                <Button variant="ghost" className="p-1 h-8 w-8" onClick={() => onToggleMinimize(node.id)} aria-label={node.isMinimized ? t('agentNode_aria_expand') : t('agentNode_aria_collapse')}>
                    {node.isMinimized ? <ExpandIcon /> : <CollapseIcon />}
                </Button>
                <Button variant="ghost" className="p-1 h-8 w-8 text-gray-400 hover:text-red-400" onClick={() => onDelete(node.id)} aria-label={t('agentNode_aria_delete')}>
                    <CloseIcon />
                </Button>
            </div>
        </div>
        
        <div className={`flex-1 flex flex-col bg-gray-900/50 overflow-hidden ${node.isMinimized ? 'hidden' : ''}`}>
            <div className="flex-1 space-y-3 overflow-y-auto p-2 pr-3">
                {node.messages.map(msg => {
                    if (msg.sender === 'tool_result') {
                         const Icon = msg.isError ? ErrorIcon : ToolIcon;
                         const titleColor = msg.isError ? "text-red-400" : "text-gray-400";
                         const borderColor = msg.isError ? "border-red-500/50" : "border-gray-700";
                         const textColor = msg.isError ? "text-red-300" : "text-fuchsia-300";

                        return (
                            <div key={msg.id} className="flex justify-center">
                                <div className={`max-w-xs md:max-w-md px-3 py-2 rounded-lg bg-gray-800 border ${borderColor} text-xs`}>
                                   <p className={`font-semibold mb-1 flex items-center ${titleColor}`}>
                                        <Icon className="mr-1.5" /> 
                                        {msg.isError ? t('agentNode_toolError_title') : t('agentNode_toolResult_title', { toolId: msg.toolCallId?.substring(0, 8) })}
                                    </p>
                                   <pre className={`whitespace-pre-wrap ${textColor}`}>{msg.text}</pre>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md px-3 py-2 rounded-lg ${msg.sender === 'user' ? 'bg-indigo-600' : (msg.isError ? 'bg-red-800/50' : 'bg-gray-700')}`}>
                                {msg.filename && msg.fileContent && (
                                    <div className="p-2 rounded-md mb-2 bg-indigo-700/60">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FileIcon className="w-5 h-5 flex-shrink-0 text-indigo-200" />
                                                <span className="text-sm font-medium truncate text-indigo-100">{msg.filename}</span>
                                            </div>
                                            <Button variant="ghost" onClick={() => toggleFileExpansion(msg.id)} className="p-1 h-7 w-7 rounded-full hover:bg-indigo-500/50">
                                                <ChevronRightIcon className={`w-4 h-4 transition-transform ${expandedFiles[msg.id] ? 'rotate-90' : ''}`} />
                                            </Button>
                                        </div>
                                        {expandedFiles[msg.id] && (
                                            <pre className="mt-2 p-2 text-xs bg-gray-900/70 rounded-md whitespace-pre-wrap max-h-40 overflow-y-auto text-indigo-200 font-mono">
                                                {msg.fileContent}
                                            </pre>
                                        )}
                                    </div>
                                )}
                                
                                {msg.image && msg.mimeType?.startsWith('image/') && (
                                    <div className="relative group">
                                        <img src={`data:${msg.mimeType};base64,${msg.image}`} alt={msg.filename || 'Image content'} className="rounded-md mb-2 max-w-full h-auto" />
                                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {node.agent.capabilities.includes(LLMCapability.ImageModification) && (
                                                <Button 
                                                    variant="ghost" 
                                                    className="p-1.5 h-8 w-8 bg-black/50 backdrop-blur-sm rounded-full"
                                                    onClick={() => onOpenImageModificationPanel(node.id, msg.image as string, msg.mimeType || 'image/png')}
                                                    title={t('agentNode_tooltip_edit')}
                                                >
                                                    <EditIcon width={16} height={16} />
                                                </Button>
                                            )}
                                            <Button 
                                                variant="ghost" 
                                                className="p-1.5 h-8 w-8 bg-black/50 backdrop-blur-sm rounded-full"
                                                onClick={() => onOpenFullscreen(msg.image as string, msg.mimeType || 'image/png')}
                                                title={t('agentNode_tooltip_fullscreen')}
                                            >
                                                <ExpandIcon width={16} height={16} />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                className="p-1.5 h-8 w-8 bg-black/50 backdrop-blur-sm rounded-full"
                                                onClick={() => handleSaveImage(msg.image as string, msg.mimeType || 'image/png')}
                                                title={t('agentNode_tooltip_save')}
                                            >
                                                <SaveIcon width={16} height={16} />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                className="p-1.5 h-8 w-8 bg-black/50 backdrop-blur-sm rounded-full"
                                                onClick={() => handlePrintImage(msg.image as string, msg.mimeType || 'image/png')}
                                                title={t('agentNode_tooltip_print')}
                                            >
                                                <PrintIcon width={16} height={16} />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {msg.filename && msg.image && !msg.fileContent && (
                                     <div className={`flex items-center p-2 rounded-md mb-2 ${msg.sender === 'user' ? 'bg-indigo-700/60' : 'bg-gray-800/60'}`}>
                                        <FileIcon className={`w-5 h-5 flex-shrink-0 ${msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-300'}`} />
                                        <span className={`ml-3 text-sm font-medium truncate ${msg.sender === 'user' ? 'text-indigo-100' : 'text-gray-200'}`}>{msg.filename}</span>
                                    </div>
                                )}

                                {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}

                                {msg.toolCalls && (
                                    <div className="mt-2 pt-2 border-t border-gray-600 space-y-2">
                                        {msg.toolCalls.map(call => (
                                            <div key={call.id}>
                                                <p className={`text-xs font-semibold text-gray-400 flex items-center ${msg.status === 'executing_tool' ? 'animate-pulse' : ''}`}>
                                                    <ToolIcon className={`mr-1.5 ${msg.status === 'executing_tool' ? 'animate-spin' : ''}`} /> 
                                                    {msg.status === 'executing_tool' ? t('agentNode_toolCall_executing', { toolName: call.name }) : t('agentNode_toolCall_title')}
                                                </p>
                                                {msg.status !== 'executing_tool' && <p className="font-mono text-xs text-amber-300 bg-gray-800 p-1 rounded">{call.name}</p>}
                                                <details className="mt-1">
                                                    <summary className="text-xs text-gray-500 cursor-pointer">{t('agentNode_toolCall_args')}</summary>
                                                    <pre className="text-xs whitespace-pre-wrap bg-gray-800 p-1 rounded mt-1 text-amber-300">{JSON.stringify(JSON.parse(call.arguments), null, 2)}</pre>
                                                </details>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {msg.citations && msg.citations.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-600 space-y-1">
                                        <p className="text-xs font-semibold text-gray-400 flex items-center"><WebIcon className="mr-1.5"/> {t('agentNode_sources')}</p>
                                        {msg.citations.map((c, i) => <a key={i} href={c.uri} target="_blank" rel="noopener noreferrer" className="block text-xs text-indigo-400 hover:underline truncate">{c.title}</a>)}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                 {isLoading && loadingMessage && <div className="text-center text-xs text-gray-400 animate-pulse">{loadingMessage}</div>}
                <div ref={messagesEndRef} />
            </div>
            
            {historyConfig?.enabled && (
                <div className="text-xs text-gray-500 border-t border-gray-700 pt-2 text-center">
                    {t('agentNode_history_stats', {
                        messages: historyStats.messages,
                        limitMessages: historyConfig.limits.message,
                        tokens: historyStats.tokens,
                        limitTokens: historyConfig.limits.token,
                        words: historyStats.words,
                        limitWords: historyConfig.limits.word,
                        sentences: historyStats.sentences,
                        limitSentences: historyConfig.limits.sentence
                    })}
                </div>
            )}
            
            {node.agent.llmProvider === LLMProvider.Mistral && (node.agent.capabilities.includes(LLMCapability.Embedding) || node.agent.capabilities.includes(LLMCapability.OCR)) && (
                <div className="px-2 pt-2 border-t border-gray-700/50 flex items-center justify-center gap-2">
                    {node.agent.capabilities.includes(LLMCapability.Embedding) && (
                        <Button type="button" variant="secondary" onClick={handleEmbed} disabled={isLoading || !userInput.trim()} className="text-xs px-2 py-1 flex-1" title={t('agentNode_embeddingButton_title')}>
                            <EmbeddingIcon className="inline-block mr-1 w-4 h-4"/>
                            {t('agentNode_embeddingButton')}
                        </Button>
                    )}
                    {node.agent.capabilities.includes(LLMCapability.OCR) && (
                        <>
                            <input type="file" ref={ocrFileInputRef} onChange={handleOcrFileSelect} className="hidden" accept="image/*"/>
                            <Button type="button" variant="secondary" onClick={() => ocrFileInputRef.current?.click()} disabled={isLoading || ocrUrl.trim() !== ''} className="text-xs px-2 py-1 flex-1" title={t('agentNode_ocrFileButton_title')}>
                                 <OcrIcon className="inline-block mr-1 w-4 h-4"/>
                                 {t('agentNode_ocrFileButton')}
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleOcrUrlClick} disabled={isLoading} className="text-xs px-2 py-1 flex-1" title={t('agentNode_ocrUrlButton_title')}>
                                 <WebIcon className="inline-block mr-1 w-3 h-3"/>
                                {t('agentNode_ocrUrlButton')}
                            </Button>
                        </>
                    )}
                </div>
            )}

            <form onSubmit={handleSendMessage} className="p-2">
                {attachedFile && (
                    <div className="text-xs text-gray-400 p-2 bg-gray-700 rounded-md mb-2 flex justify-between items-center">
                        <span>{t('agentNode_attachedFile')} {attachedFile.name}</span>
                        <Button type="button" variant="ghost" onClick={() => setAttachedFile(null)} className="p-1 h-6 w-6 text-red-400"><CloseIcon width={14} height={14}/></Button>
                    </div>
                )}
                {showOcrUrlInput ? (
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder={t('agentNode_ocrUrlPlaceholder')} value={ocrUrl} onChange={(e) => setOcrUrl(e.target.value)} disabled={isLoading} className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
                        <Button type="button" variant="primary" onClick={handleConfirmOcrUrl} disabled={isLoading || !ocrUrl.trim()}>{t('ok')}</Button>
                        <Button type="button" variant="secondary" onClick={handleCancelOcrUrl} disabled={isLoading}>{t('cancel')}</Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        {node.agent.capabilities.includes(LLMCapability.FileUpload) && (
                            <><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" /><Button type="button" variant="ghost" onClick={handleFileButtonClick} disabled={isLoading} aria-label={t('agentNode_aria_upload')}><UploadIcon /></Button></>
                        )}
                        {node.agent.capabilities.includes(LLMCapability.ImageGeneration) && (
                             <Button type="button" variant="ghost" onClick={() => onOpenImagePanel(node.id)} disabled={isLoading} aria-label={t('agentNode_aria_generateImage')}><ImageIcon /></Button>
                        )}
                        <input type="text" placeholder={t('agentNode_sendMessage_placeholder')} value={userInput} onChange={(e) => setUserInput(e.target.value)} disabled={isLoading} className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
                        <Button type="submit" variant="primary" disabled={isLoading || (!userInput.trim() && !attachedFile)}><SendIcon /></Button>
                    </div>
                )}
            </form>
        </div>
      </Card>
    </div>
  );
};