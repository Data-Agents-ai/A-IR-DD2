/**
 * @file tests/unitaires/apiClient.test.ts
 * @description Unit tests for apiClient interceptors
 * @coverage:
 * - Request interceptor (Authorization header injection)
 * - Response interceptor (401 handling)
 * - Guest mode (no token)
 * - Authenticated mode (Bearer token)
 */

import axios, { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';

// We'll test the interceptor logic in isolation
const createTestApiClient = (): AxiosInstance => {
    const instance = axios.create({
        baseURL: 'http://localhost:3001',
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor
    instance.interceptors.request.use(
        (config) => {
            try {
                const authDataStr = localStorage.getItem('auth_data_v1');
                if (authDataStr) {
                    const authData = JSON.parse(authDataStr);
                    if (authData.accessToken) {
                        config.headers.Authorization = `Bearer ${authData.accessToken}`;
                    }
                }
            } catch (err) {
                console.error('[apiClient] Error reading auth data:', err);
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor
    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                localStorage.removeItem('auth_data_v1');
                const logoutEvent = new CustomEvent('auth:logout', {
                    detail: { reason: 'token_expired' },
                });
                window.dispatchEvent(logoutEvent);
            }
            return Promise.reject(error);
        }
    );

    return instance;
};

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('apiClient Interceptors', () => {
    let apiClient: AxiosInstance;
    let mock: MockAdapter;

    beforeEach(() => {
        localStorage.clear();
        apiClient = createTestApiClient();
        mock = new MockAdapter(apiClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        mock.reset();
    });

    describe('Request Interceptor', () => {
        test('should attach Bearer token when auth data exists', async () => {
            const mockAuthData = {
                user: { id: '123', email: 'test@example.com', role: 'user' },
                accessToken: 'test-access-token-12345',
                refreshToken: 'test-refresh-token',
            };

            localStorage.setItem('auth_data_v1', JSON.stringify(mockAuthData));

            mock.onGet('/api/test').reply(200, { success: true });

            await apiClient.get('/api/test');

            expect(mock.history.get[0].headers.Authorization).toBe('Bearer test-access-token-12345');
        });

        test('should NOT attach header in guest mode (no token)', async () => {
            // localStorage is empty (guest mode)
            mock.onGet('/api/test').reply(200, { success: true });

            await apiClient.get('/api/test');

            expect(mock.history.get[0].headers.Authorization).toBeUndefined();
        });

        test('should handle corrupted localStorage gracefully', async () => {
            localStorage.setItem('auth_data_v1', 'invalid-json');

            mock.onGet('/api/test').reply(200, { success: true });

            // Should not throw
            await apiClient.get('/api/test');

            expect(mock.history.get[0].headers.Authorization).toBeUndefined();
        });
    });

    describe('Response Interceptor', () => {
        test('should handle 401 Unauthorized and clear auth', async () => {
            const mockAuthData = {
                user: { id: '123', email: 'test@example.com', role: 'user' },
                accessToken: 'expired-token',
                refreshToken: 'test-refresh-token',
            };

            localStorage.setItem('auth_data_v1', JSON.stringify(mockAuthData));

            mock.onGet('/api/protected').reply(401, { error: 'Unauthorized' });

            const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

            try {
                await apiClient.get('/api/protected');
            } catch (error) {
                // Expected to throw
            }

            // Verify localStorage was cleared
            expect(localStorage.getItem('auth_data_v1')).toBeNull();

            // Verify logout event was dispatched
            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'auth:logout',
                })
            );

            dispatchSpy.mockRestore();
        });

        test('should handle 403 Forbidden', async () => {
            mock.onGet('/api/admin').reply(403, { error: 'Forbidden' });

            try {
                await apiClient.get('/api/admin');
            } catch (error: any) {
                expect(error.response.status).toBe(403);
            }
        });

        test('should pass through successful responses', async () => {
            mock.onGet('/api/test').reply(200, { data: 'success' });

            const response = await apiClient.get('/api/test');

            expect(response.status).toBe(200);
            expect(response.data).toEqual({ data: 'success' });
        });
    });

    describe('Guest Mode (Non-Régression)', () => {
        test('should allow requests without auth in guest mode', async () => {
            mock.onGet('/api/public').reply(200, { public: 'data' });

            const response = await apiClient.get('/api/public');

            expect(response.status).toBe(200);
            expect(response.data).toEqual({ public: 'data' });
            expect(mock.history.get[0].headers.Authorization).toBeUndefined();
        });

        test('should not interfere with POST requests in guest mode', async () => {
            mock.onPost('/api/public-action').reply(201, { created: true });

            const response = await apiClient.post('/api/public-action', { data: 'test' });

            expect(response.status).toBe(201);
            expect(mock.history.post[0].headers.Authorization).toBeUndefined();
        });
    });

    describe('Error Scenarios', () => {
        test('should handle network errors', async () => {
            mock.onGet('/api/test').networkError();

            try {
                await apiClient.get('/api/test');
            } catch (error: any) {
                expect(error.message).toMatch(/Network Error/);
            }
        });

        test('should handle timeout errors', async () => {
            mock.onGet('/api/test').timeoutOnce();

            try {
                await apiClient.get('/api/test');
            } catch (error: any) {
                expect(error.code).toBe('ECONNABORTED');
            }
        });
    });
});
