/**
 * 🎯 SERVICE: localLLMService
 * 
 * Responsabilité Unique: Détection intelligente des capacités des LLM locaux
 * Architecture: Test endpoint + probe des capacités en parallèle
 * Principes SOLID: SRP (validation de config seulement, pas de proxy runtime)
 */

import { LLMProvider, LLMCapability } from '../types/lmstudio.types';

interface LocalLLMCapabilities {
    chat: boolean;
    functionCalling: boolean;
    streaming: boolean;
    embedding: boolean;
    jsonMode: boolean;
}

interface DetectionResult {
    healthy: boolean;
    endpoint: string;
    modelId?: string;
    modelName?: string;
    capabilities: LLMCapability[];
    detectedAt: string;
    error?: string;
}

/**
 * Fetch avec timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Étape 1: Vérifier que l'endpoint est accessible
 */
async function testEndpointHealth(endpoint: string): Promise<{ healthy: boolean; error?: string }> {
    try {
        console.log(`[LocalLLM] Testing endpoint health: ${endpoint}`);

        const response = await fetchWithTimeout(`${endpoint}/v1/models`, { method: 'GET' }, 5000);

        if (!response.ok) {
            return {
                healthy: false,
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }

        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
            return {
                healthy: false,
                error: 'No models returned from endpoint'
            };
        }

        console.log(`[LocalLLM] Endpoint healthy, found ${data.data.length} model(s)`);
        return { healthy: true };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[LocalLLM] Endpoint health check failed: ${errorMsg}`);
        return {
            healthy: false,
            error: `Connection failed: ${errorMsg}`
        };
    }
}

/**
 * Étape 2: Récupérer le premier modèle disponible
 */
async function detectFirstModel(endpoint: string): Promise<{ id: string; name: string } | null> {
    try {
        const response = await fetchWithTimeout(`${endpoint}/v1/models`, { method: 'GET' }, 5000);

        if (!response.ok) {
            console.warn(`[LocalLLM] Failed to fetch models: ${response.status}`);
            return null;
        }

        const data = await response.json();
        if (!data.data || data.data.length === 0) {
            console.warn(`[LocalLLM] No models available at endpoint`);
            return null;
        }

        const firstModel = data.data[0];
        console.log(`[LocalLLM] First model detected: ${firstModel.id}`);

        return {
            id: firstModel.id,
            name: firstModel.name || firstModel.id
        };

    } catch (error) {
        console.error(`[LocalLLM] Failed to detect models:`, error);
        return null;
    }
}

/**
 * Étape 3: Tester les capacités en parallèle (non-bloquant)
 */
async function probeCapabilities(endpoint: string, modelId: string): Promise<LocalLLMCapabilities> {
    const capabilities: LocalLLMCapabilities = {
        chat: false,
        functionCalling: false,
        streaming: false,
        embedding: false,
        jsonMode: false
    };

    // Tester en parallèle avec Promise.allSettled (ne bloque pas sur une failure)
    const probes = [
        testChatEndpoint(endpoint, modelId).then(() => { capabilities.chat = true; }).catch(() => { }),
        testFunctionCalling(endpoint, modelId).then(() => { capabilities.functionCalling = true; }).catch(() => { }),
        testStreaming(endpoint, modelId).then(() => { capabilities.streaming = true; }).catch(() => { }),
        testEmbedding(endpoint).then(() => { capabilities.embedding = true; }).catch(() => { }),
        testJsonMode(endpoint, modelId).then(() => { capabilities.jsonMode = true; }).catch(() => { })
    ];

    await Promise.allSettled(probes);

    console.log(`[LocalLLM] Capabilities detected:`, {
        chat: capabilities.chat,
        functionCalling: capabilities.functionCalling,
        streaming: capabilities.streaming,
        embedding: capabilities.embedding,
        jsonMode: capabilities.jsonMode
    });

    return capabilities;
}

/**
 * Probe: Test chat endpoint
 */
async function testChatEndpoint(endpoint: string, modelId: string): Promise<void> {
    const response = await fetchWithTimeout(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10,
            temperature: 0
        })
    }, 3000);

    if (!response.ok) {
        throw new Error(`Chat endpoint returned ${response.status}`);
    }
}

/**
 * Probe: Test function calling
 */
async function testFunctionCalling(endpoint: string, modelId: string): Promise<void> {
    const response = await fetchWithTimeout(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: 'test' }],
            tools: [{
                type: 'function',
                function: {
                    name: 'test_function',
                    description: 'Test function',
                    parameters: { type: 'object', properties: {} }
                }
            }],
            max_tokens: 10
        })
    }, 3000);

    if (!response.ok) {
        throw new Error(`Function calling not supported: ${response.status}`);
    }
}

/**
 * Probe: Test streaming
 */
async function testStreaming(endpoint: string, modelId: string): Promise<void> {
    const response = await fetchWithTimeout(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: 'test' }],
            stream: true,
            max_tokens: 10
        })
    }, 3000);

    if (!response.ok) {
        throw new Error(`Streaming not supported: ${response.status}`);
    }

    // Vérifier que c'est réellement du streaming (content-type: text/event-stream)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('event-stream')) {
        throw new Error('Not streaming response');
    }
}

/**
 * Probe: Test embeddings
 */
async function testEmbedding(endpoint: string): Promise<void> {
    const response = await fetchWithTimeout(`${endpoint}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'embedding-model',
            input: 'test'
        })
    }, 3000);

    if (!response.ok) {
        throw new Error(`Embeddings not supported: ${response.status}`);
    }
}

/**
 * Probe: Test JSON mode
 */
async function testJsonMode(endpoint: string, modelId: string): Promise<void> {
    const response = await fetchWithTimeout(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: 'test' }],
            response_format: { type: 'json_object' },
            max_tokens: 10
        })
    }, 3000);

    if (!response.ok) {
        throw new Error(`JSON mode not supported: ${response.status}`);
    }
}

/**
 * Convertir capacités locales en LLMCapability enum
 */
function capabilitiesToEnum(caps: LocalLLMCapabilities): LLMCapability[] {
    const result: LLMCapability[] = [];

    if (caps.chat) result.push(LLMCapability.Chat);
    if (caps.functionCalling) result.push(LLMCapability.FunctionCalling);
    if (caps.embedding) result.push(LLMCapability.Embedding);
    if (caps.jsonMode) result.push(LLMCapability.OutputFormatting);

    return result;
}

/**
 * Fonction principale: Détecter les capacités d'un LLM local
 * 
 * Flux:
 * 1. Vérifier que l'endpoint est accessible
 * 2. Détecter le premier modèle disponible
 * 3. Tester les capacités (non-bloquant)
 * 4. Retourner résultat
 */
export async function detectLocalLLMCapabilities(endpoint: string): Promise<DetectionResult> {
    try {
        console.log(`[LocalLLM] Starting capability detection for endpoint: ${endpoint}`);

        // Étape 1: Health check
        const healthCheck = await testEndpointHealth(endpoint);
        if (!healthCheck.healthy) {
            return {
                healthy: false,
                endpoint,
                capabilities: [],
                detectedAt: new Date().toISOString(),
                error: healthCheck.error
            };
        }

        // Étape 2: Détecter le modèle
        const model = await detectFirstModel(endpoint);
        if (!model) {
            return {
                healthy: true,
                endpoint,
                capabilities: [],
                detectedAt: new Date().toISOString(),
                error: 'No models available'
            };
        }

        // Étape 3: Probe des capacités
        const localCaps = await probeCapabilities(endpoint, model.id);
        const capabilities = capabilitiesToEnum(localCaps);

        console.log(`[LocalLLM] Detection complete for ${endpoint}:`, {
            modelId: model.id,
            capabilitiesCount: capabilities.length
        });

        return {
            healthy: true,
            endpoint,
            modelId: model.id,
            modelName: model.name,
            capabilities,
            detectedAt: new Date().toISOString()
        };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[LocalLLM] Detection failed for ${endpoint}:`, errorMsg);

        return {
            healthy: false,
            endpoint,
            capabilities: [],
            detectedAt: new Date().toISOString(),
            error: errorMsg
        };
    }
}

export type { DetectionResult, LocalLLMCapabilities };
