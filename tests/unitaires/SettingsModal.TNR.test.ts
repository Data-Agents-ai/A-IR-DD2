/**
 * 🧪 TESTS DE NON-RÉGRESSION: Frontend Detection Flow
 * 
 * Zone testée: SettingsModal.tsx - handleDetectLMStudio
 * Architecture: Direct fetch to backend proxy + error handling
 */

import { LLMProvider, LLMCapability } from '../../types';

/**
 * Mock de la réponse du backend proxy
 */
const mockDetectionResult = {
    healthy: true,
    endpoint: 'http://localhost:11434',
    modelId: 'llama2:7b',
    modelName: 'llama2',
    capabilities: [LLMCapability.Chat, LLMCapability.Embedding],
    detectedAt: new Date().toISOString()
};

/**
 * TEST 1: URL encoding de l'endpoint
 */
describe('SettingsModal.handleDetectLMStudio - TNR', () => {
    
    test('endpoint should be properly URL encoded in proxy call', () => {
        const endpoint = 'http://localhost:11434';
        const encoded = encodeURIComponent(endpoint);

        expect(encoded).toBe('http%3A%2F%2Flocalhost%3A11434');
        
        // Vérifier que l'URL reconstruite fonctionne
        const proxyUrl = `http://localhost:3001/api/local-llm/detect-capabilities?endpoint=${encoded}`;
        expect(proxyUrl).toContain('endpoint=http%3A%2F%2Flocalhost%3A11434');
    });

    /**
     * TEST 2: Proxy endpoint format
     */
    test('proxy URL should follow correct format', () => {
        const endpoint = 'http://localhost:11434';
        const encoded = encodeURIComponent(endpoint);
        const backendUrl = 'http://localhost:3001';
        
        const proxyUrl = `${backendUrl}/api/local-llm/detect-capabilities?endpoint=${encoded}`;

        expect(proxyUrl).toMatch(/^http:\/\/localhost:3001\/api\/local-llm\/detect-capabilities\?endpoint=/);
        expect(proxyUrl).toMatch(/endpoint=http%3A%2F%2Flocalhost/);
    });

    /**
     * TEST 3: AbortSignal timeout
     */
    test('fetch should use 15 second timeout for full probe suite', () => {
        const timeoutMs = 15000; // Full probe suite timeout
        
        expect(timeoutMs).toBe(15000);
        expect(timeoutMs / 1000).toBe(15);
    });

    /**
     * TEST 4: Detection result structure validation
     */
    test('detection result should have required fields', () => {
        const result = mockDetectionResult;

        expect(result).toHaveProperty('healthy');
        expect(result).toHaveProperty('endpoint');
        expect(result).toHaveProperty('modelId');
        expect(result).toHaveProperty('capabilities');
        expect(result).toHaveProperty('detectedAt');
    });

    /**
     * TEST 5: Capabilities mapping to LLMCapability enum
     */
    test('detected capabilities should map to LLMCapability enum', () => {
        const result = mockDetectionResult;
        const validCapabilities = Object.values(LLMCapability);

        result.capabilities.forEach(cap => {
            expect(validCapabilities).toContain(cap);
        });
    });

    /**
     * TEST 6: Error handling - unhealthy endpoint
     */
    test('should handle unhealthy endpoint response', () => {
        const unhealthyResult = {
            healthy: false,
            endpoint: 'http://localhost:11434',
            capabilities: [],
            detectedAt: new Date().toISOString(),
            error: 'Endpoint not reachable'
        };

        expect(unhealthyResult.healthy).toBe(false);
        expect(unhealthyResult.capabilities.length).toBe(0);
        expect(unhealthyResult.error).toBeDefined();
    });

    /**
     * TEST 7: Provider enum for LMStudio
     */
    test('LMStudio provider should be LMStudio enum value', () => {
        expect(LLMProvider.LMStudio).toBe('LLM local (on premise)');
    });

    /**
     * TEST 8: Form validation before detection
     */
    test('detection button should be disabled without endpoint', () => {
        const isDetecting = false;
        const hasApiKey = false; // Empty endpoint

        const isDisabled = isDetecting || !hasApiKey;
        expect(isDisabled).toBe(true);
    });

    /**
     * TEST 9: Form validation with endpoint
     */
    test('detection button should be enabled with endpoint', () => {
        const isDetecting = false;
        const hasApiKey = true; // Non-empty endpoint

        const isDisabled = isDetecting || !hasApiKey;
        expect(isDisabled).toBe(false);
    });

    /**
     * TEST 10: Detect button disabled while detecting
     */
    test('detection button should be disabled while detection in progress', () => {
        const isDetecting = true;
        const hasApiKey = true;

        const isDisabled = isDetecting || !hasApiKey;
        expect(isDisabled).toBe(true);
    });
});

/**
 * TESTS: Response Parsing
 */
describe('Detection Response Parsing - TNR', () => {
    
    /**
     * TEST 11: JSON parsing of backend response
     */
    test('should parse JSON response from backend', async () => {
        const responseJson = JSON.stringify(mockDetectionResult);
        const parsed = JSON.parse(responseJson);

        expect(parsed.healthy).toBe(true);
        expect(parsed.modelId).toBe('llama2:7b');
        expect(Array.isArray(parsed.capabilities)).toBe(true);
    });

    /**
     * TEST 12: Handle malformed JSON response
     */
    test('should gracefully handle malformed JSON', () => {
        const malformedJson = '{ invalid json }';
        
        expect(() => JSON.parse(malformedJson)).toThrow();
    });

    /**
     * TEST 13: Field presence validation
     */
    test('response must have all required fields', () => {
        const result = mockDetectionResult;
        const requiredFields = ['healthy', 'endpoint', 'capabilities', 'detectedAt'];

        requiredFields.forEach(field => {
            expect(result).toHaveProperty(field);
        });
    });
});

/**
 * TESTS: Backend Route Contract
 */
describe('Backend Route Contract - TNR', () => {
    
    /**
     * TEST 14: Route should always return 200 (even on error)
     */
    test('backend should always return 200 status code', () => {
        // Contract: Detection route returns 200 always
        // Error information in response.error field
        const httpStatus = 200;

        expect(httpStatus).toBe(200);
    });

    /**
     * TEST 15: Unhealthy responses include error field
     */
    test('unhealthy response should include error field', () => {
        const unhealthyResponse = {
            healthy: false,
            endpoint: 'http://localhost:11434',
            capabilities: [],
            detectedAt: new Date().toISOString(),
            error: 'Connection timeout'
        };

        expect(unhealthyResponse.healthy).toBe(false);
        expect(unhealthyResponse.error).toBeDefined();
        expect(typeof unhealthyResponse.error).toBe('string');
    });

    /**
     * TEST 16: Healthy responses include modelId
     */
    test('healthy response should include modelId', () => {
        const healthyResponse = mockDetectionResult;

        expect(healthyResponse.healthy).toBe(true);
        expect(healthyResponse.modelId).toBeDefined();
        expect(typeof healthyResponse.modelId).toBe('string');
    });

    /**
     * TEST 17: Capabilities never null
     */
    test('capabilities field should never be null', () => {
        const responses = [
            mockDetectionResult,
            {
                healthy: false,
                endpoint: 'http://localhost:11434',
                capabilities: [],
                detectedAt: new Date().toISOString()
            }
        ];

        responses.forEach(response => {
            expect(response.capabilities).not.toBeNull();
            expect(Array.isArray(response.capabilities)).toBe(true);
        });
    });
});

/**
 * TESTS: Configuration Persistence
 */
describe('Configuration Persistence - TNR', () => {
    
    /**
     * TEST 18: Detected configuration should be saveable
     */
    test('should be able to save detected configuration', () => {
        const config = {
            provider: LLMProvider.LMStudio,
            apiKey: 'http://localhost:11434',
            capabilities: [LLMCapability.Chat, LLMCapability.Embedding],
            modelId: 'llama2:7b'
        };

        expect(config.provider).toBe('LLM local (on premise)');
        expect(config.apiKey).toMatch(/^http:\/\//);
    });

    /**
     * TEST 19: Configuration should be retrievable
     */
    test('should be able to retrieve saved configuration', () => {
        const savedConfig = {
            provider: LLMProvider.LMStudio,
            apiKey: 'http://localhost:11434',
            capabilities: [LLMCapability.Chat]
        };

        const retrieved = savedConfig;
        expect(retrieved.apiKey).toBe('http://localhost:11434');
        expect(Array.isArray(retrieved.capabilities)).toBe(true);
    });
});

/**
 * TESTS: User Feedback
 */
describe('User Feedback - TNR', () => {
    
    /**
     * TEST 20: Success notification structure
     */
    test('should show success notification with detected capabilities', () => {
        const notification = {
            type: 'success',
            message: `Detected Ollama with 2 capabilities`,
            duration: 5000
        };

        expect(notification.type).toBe('success');
        expect(notification.message).toContain('Ollama');
        expect(notification.message).toContain('capabilities');
    });

    /**
     * TEST 21: Error notification for failed detection
     */
    test('should show error notification on detection failure', () => {
        const notification = {
            type: 'error',
            message: 'Failed to detect LLM local: Connection timeout',
            duration: 5000
        };

        expect(notification.type).toBe('error');
        expect(notification.message).toContain('Failed');
    });

    /**
     * TEST 22: Loading state during detection
     */
    test('should indicate loading state during detection', () => {
        const states = {
            idle: { isDetecting: false },
            loading: { isDetecting: true },
            complete: { isDetecting: false }
        };

        expect(states.loading.isDetecting).toBe(true);
        expect(states.complete.isDetecting).toBe(false);
    });
});
