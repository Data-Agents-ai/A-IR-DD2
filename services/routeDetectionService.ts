// services/routeDetectionService.ts
// Jalon 1: Détection Dynamique des Routes LMStudio
// Architecture: Strategy Pattern + Cache Pattern
// MIGRATION JALON 4: Utilise le backend proxy au lieu d'appeler LMStudio directement

import { LMStudioRoutes, LMStudioModelDetection, LLMCapability } from '../types';
import { buildLMStudioProxyUrl } from '../config/api.config';

// ============================================================================
// CACHE SYSTEM (TTL 5 minutes)
// ============================================================================

interface CacheEntry {
    data: LMStudioModelDetection;
    timestamp: number;
}

class RouteDetectionCache {
    private cache = new Map<string, CacheEntry>();
    private TTL = 5 * 60 * 1000; // 5 minutes

    get(endpoint: string): LMStudioModelDetection | null {
        const entry = this.cache.get(endpoint);
        if (!entry || Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(endpoint);
            return null;
        }
        return entry.data;
    }

    set(endpoint: string, data: LMStudioModelDetection): void {
        this.cache.set(endpoint, { data, timestamp: Date.now() });
    }

    invalidate(endpoint?: string): void {
        if (endpoint) {
            this.cache.delete(endpoint);
        } else {
            this.cache.clear();
        }
    }

    size(): number {
        return this.cache.size;
    }
}

const detectionCache = new RouteDetectionCache();

// ============================================================================
// ROUTE DETECTION STRATEGIES
// ============================================================================

interface RouteTestConfig {
    endpoint: string;
    method: 'GET' | 'POST';
    testPayload?: any;
}

const routeConfigs: Record<keyof LMStudioRoutes, RouteTestConfig> = {
    models: {
        endpoint: '/v1/models',
        method: 'GET'
    },
    chatCompletions: {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        testPayload: {
            model: 'test',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
        }
    },
    completions: {
        endpoint: '/v1/completions',
        method: 'POST',
        testPayload: {
            model: 'test',
            prompt: 'test',
            max_tokens: 1
        }
    },
    embeddings: {
        endpoint: '/v1/embeddings',
        method: 'POST',
        testPayload: {
            model: 'test',
            input: 'test'
        }
    },
    images: {
        endpoint: '/v1/images/generations',
        method: 'POST',
        testPayload: {
            prompt: 'test',
            n: 1,
            size: '256x256'
        }
    },
    audio: {
        endpoint: '/v1/audio/transcriptions',
        method: 'POST',
        testPayload: {
            model: 'test',
            file: 'test.wav'
        }
    }
};

// ============================================================================
// HTTP ROUTE DETECTION (VIA BACKEND PROXY)
// ============================================================================

/**
 * Test si une route HTTP est disponible VIA BACKEND PROXY
 * MIGRATION JALON 4: TOUS les appels passent par le backend proxy pour éviter CORS
 * 
 * IMPORTANT: Ne JAMAIS appeler directement http://localhost:1234 depuis le frontend
 * → Toujours passer par http://localhost:3001/api/lmstudio/...
 * 
 * @param baseEndpoint - Endpoint LMStudio (ex: http://localhost:1234)
 * @param config - Configuration de test de la route
 * @param modelId - ID du modèle réel détecté (ex: 'mistral-7b-instruct-v0.2')
 */
async function testRoute(baseEndpoint: string, config: RouteTestConfig, modelId?: string): Promise<boolean> {
    try {
        // TOUS les tests de routes passent maintenant par le backend proxy
        // Le backend fait les appels directs vers LMStudio (localhost autorisé côté serveur)

        if (config.endpoint === '/v1/models') {
            // Route models: GET /api/lmstudio/models?endpoint=http://localhost:1234
            const proxyUrl = buildLMStudioProxyUrl('models', baseEndpoint);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(proxyUrl, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        }

        // Pour les autres routes (chat, embeddings, etc.), on utilise aussi le proxy
        // Le backend route vers LMStudio en interne
        if (config.endpoint === '/v1/chat/completions') {
            const proxyUrl = buildLMStudioProxyUrl('chat', baseEndpoint);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            // Utiliser le vrai modèle détecté au lieu de 'test'
            const payload = {
                ...config.testPayload,
                model: modelId || config.testPayload.model,
                stream: false
            };

            const response = await fetch(proxyUrl, {
                method: 'POST',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            clearTimeout(timeoutId);
            return response.status !== 404;
        }

        // Pour les autres routes non encore supportées par le backend proxy,
        // on retourne false (indisponible) au lieu d'appeler directement LMStudio
        console.warn(`[RouteDetection] Route ${config.endpoint} not yet proxied, marking as unavailable`);
        return false;

    } catch (error: any) {
        // Timeout ou erreur réseau = route probablement non disponible
        if (error.name === 'AbortError') {
            console.warn(`[RouteDetection] Timeout testing ${config.endpoint}`);
        }
        return false;
    }
}

/**
 * Détecte toutes les routes HTTP disponibles sur l'endpoint LMStudio
 * @param endpoint - Endpoint LMStudio
 * @param modelId - ID du modèle réel détecté (optionnel, améliore les tests)
 */
export async function detectAvailableRoutes(endpoint: string, modelId?: string): Promise<LMStudioRoutes> {
    const routes: LMStudioRoutes = {
        models: false,
        chatCompletions: false,
        completions: false,
        embeddings: false,
        images: false,
        audio: false
    };

    console.log(`[RouteDetection] Testing routes with model: ${modelId || 'test'}`);

    // Test toutes les routes en parallèle pour performance
    const routeTests = Object.entries(routeConfigs).map(async ([routeName, config]) => {
        const available = await testRoute(endpoint, config, modelId);
        return { routeName: routeName as keyof LMStudioRoutes, available };
    });

    const results = await Promise.all(routeTests);

    // Agréger résultats
    results.forEach(({ routeName, available }) => {
        routes[routeName] = available;
    });

    return routes;
}

// ============================================================================
// ADVANCED CAPABILITIES TESTING
// ============================================================================

/**
 * Test si le modèle supporte Function Calling (paramètre tools)
 * MIGRATION JALON 4: Passe par le backend proxy au lieu d'appeler LMStudio directement
 */
export async function testFunctionCalling(endpoint: string, modelName: string): Promise<boolean> {
    try {
        // Appeler le backend proxy au lieu de LMStudio directement
        const proxyUrl = buildLMStudioProxyUrl('chat', endpoint);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        console.log(`[RouteDetection] Testing function calling with model: ${modelName}`);

        const response = await fetch(proxyUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                messages: [{ role: 'user', content: 'test function calling' }],
                tools: [
                    {
                        type: 'function',
                        function: {
                            name: 'test_tool',
                            description: 'A test tool',
                            parameters: {
                                type: 'object',
                                properties: {
                                    param: { type: 'string' }
                                }
                            }
                        }
                    }
                ],
                max_tokens: 1,
                stream: false
            })
        });

        clearTimeout(timeoutId);

        // Si le serveur accepte le paramètre tools sans erreur 400 "unknown parameter"
        // on considère que la fonctionnalité est supportée
        return response.status !== 400 || !(await response.text()).includes('tools');

    } catch (error) {
        return false;
    }
}

/**
 * Test si le modèle supporte JSON Mode (paramètre response_format)
 * MIGRATION JALON 4: Passe par le backend proxy au lieu d'appeler LMStudio directement
 */
export async function testJsonMode(endpoint: string, modelName: string): Promise<boolean> {
    try {
        // Appeler le backend proxy au lieu de LMStudio directement
        const proxyUrl = buildLMStudioProxyUrl('chat', endpoint);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        console.log(`[RouteDetection] Testing JSON mode with model: ${modelName}`);

        const response = await fetch(proxyUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                messages: [{ role: 'user', content: 'return json' }],
                response_format: { type: 'json_object' },
                max_tokens: 1,
                stream: false
            })
        });

        clearTimeout(timeoutId);

        // Même logique: si pas d'erreur "unknown parameter", le mode est supporté
        return response.status !== 400 || !(await response.text()).includes('response_format');

    } catch (error) {
        return false;
    }
}

// ============================================================================
// ROUTE → CAPABILITY MAPPING
// ============================================================================

/**
 * Convertit les routes détectées en capacités A-IR-DD2
 */
export async function routesToCapabilities(
    routes: LMStudioRoutes,
    modelName: string,
    endpoint: string
): Promise<LLMCapability[]> {
    const capabilities: LLMCapability[] = [];

    // Chat + Streaming (route principale)
    if (routes.chatCompletions) {
        capabilities.push(LLMCapability.Chat);
        // LMStudio supporte streaming par défaut sur chat completions
        // (Note: pas de LLMCapability.Streaming dans l'enum actuel)
    }

    // Embeddings
    if (routes.embeddings) {
        capabilities.push(LLMCapability.Embedding);
    }

    // Image Generation
    if (routes.images) {
        capabilities.push(LLMCapability.ImageGeneration);
    }

    // Audio Transcription → OCR (approximation)
    if (routes.audio) {
        capabilities.push(LLMCapability.OCR);
    }

    // Tests capacités avancées (seulement si chat disponible)
    if (routes.chatCompletions) {
        const [hasFunctionCalling, hasJsonMode] = await Promise.all([
            testFunctionCalling(endpoint, modelName),
            testJsonMode(endpoint, modelName)
        ]);

        if (hasFunctionCalling) {
            capabilities.push(LLMCapability.FunctionCalling);
        }

        if (hasJsonMode) {
            capabilities.push(LLMCapability.OutputFormatting);
        }
    }

    // Local Deployment (toujours vrai pour LMStudio)
    capabilities.push(LLMCapability.LocalDeployment);

    return capabilities;
}

// ============================================================================
// MAIN DETECTION FUNCTION (avec cache)
// ============================================================================

/**
 * Détection complète d'un modèle LMStudio avec cache
 * Point d'entrée principal du service
 * MIGRATION JALON 4: Utilise le backend proxy /api/lmstudio/detect-endpoint
 */
export async function detectLMStudioModel(endpoint: string): Promise<LMStudioModelDetection> {
    // Vérifier cache
    const cached = detectionCache.get(endpoint);
    if (cached) {
        console.log(`[RouteDetection] Cache hit for ${endpoint}`);
        return cached;
    }

    console.log(`[RouteDetection] Starting detection via backend proxy for ${endpoint}`);

    try {
        // Appeler le backend proxy pour détecter l'endpoint LMStudio
        const proxyUrl = buildLMStudioProxyUrl('detectEndpoint');
        console.log(`[RouteDetection] Calling backend proxy: ${proxyUrl}`);

        const response = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(10000) // Augmenté à 10s pour détection multi-endpoints
        });

        console.log(`[RouteDetection] Backend response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw new Error(`Backend proxy returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('[RouteDetection] Backend response data:', data);

        if (!data.healthy) {
            throw new Error(data.error || 'LMStudio not available');
        }

        // Récupérer le premier modèle disponible
        const modelId = data.models && data.models.length > 0 ? data.models[0] : 'unknown';
        console.log(`[RouteDetection] Using detected model for route tests: ${modelId}`);

        // Détecter routes disponibles (via backend proxy) avec le vrai modèle
        const routes = await detectAvailableRoutes(endpoint, modelId);

        // Détecter capacités
        const capabilities = await routesToCapabilities(routes, modelId, endpoint);

        // Construire résultat
        const detection: LMStudioModelDetection = {
            modelId,
            routes,
            capabilities,
            detectedAt: new Date().toISOString()
        };

        // Mettre en cache
        detectionCache.set(endpoint, detection);

        console.log(`[RouteDetection] Detection complete via backend proxy for ${endpoint}:`, {
            modelId,
            routesCount: Object.values(routes).filter(Boolean).length,
            capabilitiesCount: capabilities.length
        });

        return detection;

    } catch (error) {
        console.error(`[RouteDetection] Detection failed for ${endpoint}:`, error);
        throw error;
    }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Invalide le cache pour un endpoint spécifique ou tous les endpoints
 */
export function invalidateCache(endpoint?: string): void {
    detectionCache.invalidate(endpoint);
    console.log(`[RouteDetection] Cache invalidated${endpoint ? ` for ${endpoint}` : ' (all)'}`);
}

/**
 * Retourne la taille actuelle du cache
 */
export function getCacheSize(): number {
    return detectionCache.size();
}
