// services/llmService.ts
// This service acts as a dispatcher to the correct LLM provider service.

import { LLMProvider, Tool, ChatMessage, OutputConfig } from '../types';
import * as geminiService from './geminiService';
import * as openAIService from './openAIService';
import * as mistralService from './mistralService';
import * as anthropicService from './anthropicService';
import * as grokService from './grokService';
import * as qwenService from './qwenService';
import * as perplexityService from './perplexityService';
import * as kimiService from './kimiService';
import * as deepSeekService from './deepSeekService';
import * as lmStudioService from './lmStudioService';


const getServiceProvider = (provider: LLMProvider) => {
    switch (provider) {
        case LLMProvider.Gemini: return geminiService;
        case LLMProvider.OpenAI: return openAIService;
        case LLMProvider.Mistral: return mistralService;
        case LLMProvider.Anthropic: return anthropicService;
        case LLMProvider.Grok: return grokService;
        case LLMProvider.Qwen: return qwenService;
        case LLMProvider.Perplexity: return perplexityService;
        case LLMProvider.Kimi: return kimiService;
        case LLMProvider.DeepSeek: return deepSeekService;
        case LLMProvider.LMStudio: return lmStudioService;
        default: return geminiService;
    }
};

export const generateContentStream = async function* (
    provider: LLMProvider, apiKey: string, model: string,
    systemInstruction?: string, history?: ChatMessage[], tools?: Tool[], outputConfig?: OutputConfig,
    endpoint?: string // For LMStudio local endpoint
) {
    const service = getServiceProvider(provider);
    
    // Handle LMStudio special case with endpoint parameter
    if (provider === LLMProvider.LMStudio) {
        yield* (service as any).generateContentStream(endpoint || 'http://localhost:3928', model, systemInstruction, history, tools, outputConfig, apiKey);
    } else {
        yield* service.generateContentStream(apiKey, model, systemInstruction, history, tools, outputConfig);
    }
};

export const generateContent = (
    provider: LLMProvider, apiKey: string, model: string,
    systemInstruction?: string, history?: ChatMessage[], tools?: Tool[], outputConfig?: OutputConfig,
    endpoint?: string // For LMStudio local endpoint
): Promise<{ text: string }> => {
    const service = getServiceProvider(provider);
    
    // Handle LMStudio special case with endpoint parameter  
    if (provider === LLMProvider.LMStudio) {
        return (service as any).generateContent(endpoint || 'http://localhost:3928', model, systemInstruction, history, tools, outputConfig, apiKey);
    } else {
        return service.generateContent(apiKey, model, systemInstruction, history, tools, outputConfig);
    }
};

export const generateContentWithSearch = (
    provider: LLMProvider, apiKey: string, model: string, prompt: string, systemInstruction?: string
): Promise<{ text: string; citations: { title: string; uri: string }[] }> => {
    const service = getServiceProvider(provider);
    if (!(service as any).generateContentWithSearch) {
         return Promise.resolve({ text: `Error: ${provider} does not support Web Search.`, citations: [] });
    }
    return (service as any).generateContentWithSearch(apiKey, model, prompt, systemInstruction);
};

export const generateImage = (
    provider: LLMProvider, apiKey: string, prompt: string
): Promise<{ image: string; error?: undefined } | { error: string; image?: undefined }> => {
    const service = getServiceProvider(provider);
     if (!(service as any).generateImage) {
         return Promise.resolve({ error: `Image generation is not supported by ${provider}.` });
    }
    return (service as any).generateImage(apiKey, prompt);
};

export const editImage = (
    provider: LLMProvider, apiKey: string, prompt: string, image: { mimeType: string; data: string }
): Promise<{ image?: string; text?: string; error?: string }> => {
    const service = getServiceProvider(provider);
    if (!(service as any).editImage) {
        return Promise.resolve({ error: `Image modification is not supported by ${provider}.` });
    }
    return (service as any).editImage(apiKey, prompt, image);
};