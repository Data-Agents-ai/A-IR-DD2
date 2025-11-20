// services/routeDetectionService.ts
// Jalon 1: Détection Dynamique des Routes LMStudio
// Architecture: Strategy Pattern + Cache Pattern

import { LMStudioRoutes, LMStudioModelDetection, LLMCapability } from '../types';

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
// HTTP ROUTE DETECTION
// ============================================================================

/**
 * Test si une route HTTP est disponible
 * Distinction: 404 (absent) vs 400/422/500 (présent mais mauvais params)
 */
async function testRoute(baseEndpoint: string, config: RouteTestConfig): Promise<boolean> {
    try {
        const url = `${baseEndpoint}${config.endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

        const options: RequestInit = {
            method: config.method,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (config.method === 'POST' && config.testPayload) {
            options.body = JSON.stringify(config.testPayload);
        }

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        // 404 = route n'existe pas
        // 400/422/500 = route existe mais erreur paramètres/serveur
        return response.status !== 404;

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
 */
export async function detectAvailableRoutes(endpoint: string): Promise<LMStudioRoutes> {
    const routes: LMStudioRoutes = {
        models: false,
        chatCompletions: false,
        completions: false,
        embeddings: false,
        images: false,
        audio: false
    };

    // Test toutes les routes en parallèle pour performance
    const routeTests = Object.entries(routeConfigs).map(async ([routeName, config]) => {
        const available = await testRoute(endpoint, config);
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
 */
export async function testFunctionCalling(endpoint: string, modelName: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${endpoint}/v1/chat/completions`, {
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
                max_tokens: 1
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
 */
export async function testJsonMode(endpoint: string, modelName: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${endpoint}/v1/chat/completions`, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                messages: [{ role: 'user', content: 'return json' }],
                response_format: { type: 'json_object' },
                max_tokens: 1
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
 */
export async function detectLMStudioModel(endpoint: string): Promise<LMStudioModelDetection> {
    // Vérifier cache
    const cached = detectionCache.get(endpoint);
    if (cached) {
        console.log(`[RouteDetection] Cache hit for ${endpoint}`);
        return cached;
    }

    console.log(`[RouteDetection] Starting detection for ${endpoint}`);

    // Récupérer liste des modèles
    let modelId = 'unknown';
    try {
        const modelsResponse = await fetch(`${endpoint}/v1/models`, {
            signal: AbortSignal.timeout(2000)
        });

        if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            if (modelsData.data && modelsData.data.length > 0) {
                modelId = modelsData.data[0].id;
            }
        }
    } catch (error) {
        console.warn('[RouteDetection] Failed to fetch model ID:', error);
    }

    // Détecter routes disponibles
    const routes = await detectAvailableRoutes(endpoint);

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

    console.log(`[RouteDetection] Detection complete for ${endpoint}:`, {
        modelId,
        routesCount: Object.values(routes).filter(Boolean).length,
        capabilitiesCount: capabilities.length
    });

    return detection;
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
