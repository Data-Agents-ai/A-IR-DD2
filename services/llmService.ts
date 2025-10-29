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
        default: return geminiService;
    }
};

export const generateContentStream = async function* (
    provider: LLMProvider, apiKey: string, model: string,
    systemInstruction?: string, history?: ChatMessage[], tools?: Tool[], outputConfig?: OutputConfig
) {
    const service = getServiceProvider(provider);
    yield* service.generateContentStream(apiKey, model, systemInstruction, history, tools, outputConfig);
};

export const generateContent = (
    provider: LLMProvider, apiKey: string, model: string,
    systemInstruction?: string, history?: ChatMessage[], tools?: Tool[], outputConfig?: OutputConfig
): Promise<{ text: string }> => {
    const service = getServiceProvider(provider);
    return service.generateContent(apiKey, model, systemInstruction, history, tools, outputConfig);
};

export const generateContentWithSearch = (
    provider: LLMProvider, apiKey: string, model: string, prompt: string, systemInstruction?: string
): Promise<{ text: string; citations: { title: string; uri: string }[] }> => {
    const service = getServiceProvider(provider);
    if (!service.generateContentWithSearch) {
         return Promise.resolve({ text: `Error: ${provider} does not support Web Search.`, citations: [] });
    }
    return service.generateContentWithSearch(apiKey, model, prompt, systemInstruction);
};

export const generateImage = (
    provider: LLMProvider, apiKey: string, prompt: string
): Promise<{ image: string; error?: undefined } | { error: string; image?: undefined }> => {
    const service = getServiceProvider(provider);
     if (!service.generateImage) {
         return Promise.resolve({ error: `Image generation is not supported by ${provider}.` });
    }
    return service.generateImage(apiKey, prompt);
};

export const editImage = (
    provider: LLMProvider, apiKey: string, prompt: string, image: { mimeType: string; data: string }
): Promise<{ image?: string; text?: string; error?: string }> => {
    const service = getServiceProvider(provider);
    if (!service.editImage) {
        return Promise.resolve({ error: `Image modification is not supported by ${provider}.` });
    }
    return service.editImage(apiKey, prompt, image);
};