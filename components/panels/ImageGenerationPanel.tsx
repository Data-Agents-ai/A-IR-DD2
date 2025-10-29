import React, { useState, useRef } from 'react';
import { LLMCapability, LLMConfig, WorkflowNode } from '../../types';
import { Button, SlideOver } from '../UI';
import * as llmService from '../../services/llmService';
import { useLocalization } from '../../hooks/useLocalization';
import { fileToBase64 } from '../../utils/fileUtils';

interface ImageGenerationPanelProps {
    isOpen: boolean;
    nodeId: string | null;
    workflowNodes: WorkflowNode[];
    llmConfigs: LLMConfig[];
    onClose: () => void;
    onImageGenerated: (nodeId: string, imageBase64: string) => void;
    onOpenImageModificationPanel: (nodeId: string, sourceImage: string, mimeType: string) => void;
}

export const ImageGenerationPanel = ({ isOpen, nodeId, workflowNodes, llmConfigs, onClose, onImageGenerated, onOpenImageModificationPanel }: ImageGenerationPanelProps) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLocalization();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const node = workflowNodes.find(n => n.id === nodeId);
    const agentConfig = llmConfigs.find(c => c.provider === node?.agent.llmProvider);
    
    // Reset state when panel is closed or node changes
    React.useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setPrompt('');
                setGeneratedImage(null);
                setError(null);
                setIsLoading(false);
            }, 300); // Wait for slide-out animation
        }
    }, [isOpen]);


    const handleGenerate = async () => {
        if (!prompt.trim() || !agentConfig || !node) {
            setError(t('imageGen_error_missingPrompt'));
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        const result = await llmService.generateImage(agentConfig.provider, agentConfig.apiKey, prompt);

        if (result.image) {
            setGeneratedImage(result.image);
        } else {
            setError(result.error || t('imageGen_error_unknown'));
        }

        setIsLoading(false);
    };
    
    const handleAddToChat = () => {
        if (generatedImage && nodeId) {
            onImageGenerated(nodeId, generatedImage);
            onClose();
        }
    };
    
    const handleEditImage = () => {
        if (generatedImage && nodeId) {
            onOpenImageModificationPanel(nodeId, generatedImage, 'image/png');
            onClose();
        }
    };
    
    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && nodeId) {
            try {
                setIsLoading(true);
                setError(null);
                const imageBase64 = await fileToBase64(file);
                onOpenImageModificationPanel(nodeId, imageBase64, file.type);
                onClose();
            } catch (err) {
                console.error("Image import failed:", err);
                setError(t('imageGen_error_importFailed'));
                setIsLoading(false);
            }
        }
        if (e.target) {
            e.target.value = '';
        }
    };


    if (!node) return null;

    return (
        <SlideOver title={t('imageGen_title', { agentName: node.agent.name })} isOpen={isOpen} onClose={onClose}>
            <div className="space-y-4 h-full flex flex-col">
                <div>
                    <label htmlFor="image-prompt" className="block text-sm font-medium text-gray-300 mb-1">
                        {t('imageGen_promptLabel')}
                    </label>
                    <textarea
                        id="image-prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={t('imageGen_promptPlaceholder')}
                        disabled={isLoading}
                    />
                </div>

                <div className="flex-1 flex items-center justify-center bg-gray-900/50 rounded-lg overflow-hidden">
                    {isLoading && (
                        <div className="text-center p-4">
                            <p className="animate-pulse">{t('imageGen_generating')}</p>
                        </div>
                    )}
                    
                    {error && <p className="text-sm text-red-400 p-4">{error}</p>}
                    
                    {generatedImage && (
                        <img 
                            src={`data:image/png;base64,${generatedImage}`} 
                            alt="Generated content" 
                            className="rounded-lg object-contain max-w-full max-h-full"
                        />
                    )}
                     {!isLoading && !generatedImage && !error && (
                         <div className="text-gray-500">{t('imageGen_placeholder')}</div>
                     )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                    {generatedImage ? (
                        <>
                            {node?.agent.capabilities.includes(LLMCapability.ImageModification) && (
                                <Button onClick={handleEditImage} variant="secondary">
                                    {t('imageGen_editImage')}
                                </Button>
                            )}
                            <Button onClick={handleAddToChat} variant="primary">
                                {t('imageGen_addToChat')}
                            </Button>
                        </>
                    ) : (
                        <>
                            {node?.agent.capabilities.includes(LLMCapability.ImageModification) && (
                                <>
                                    <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading} variant="secondary">
                                        {t('imageGen_importImage')}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileImport}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/webp"
                                    />
                                </>
                            )}
                            <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} variant="primary">
                                {isLoading ? t('imageGen_generating_button') : t('imageGen_generate')}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </SlideOver>
    );
};