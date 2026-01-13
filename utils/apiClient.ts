/**
 * @file utils/apiClient.ts
 * @description Axios HTTP client with authentication interceptors
 * @domain Design Domain - API Communication
 *
 * ARCHITECTURE:
 * - Singleton axios instance with default config
 * - Request interceptor: Attach Authorization Bearer token
 * - Response interceptor: Handle 401 Unauthorized (token refresh/logout)
 * - Error handling: Structured error responses
 *
 * NON-RÉGRESSION:
 * - Guest mode (no token) = requests without Authorization header
 * - Authenticated mode = automatic header injection
 * - No blocking on network errors (UI handles gracefully)
 */

import axios, {
    AxiosInstance,
    AxiosError,
    InternalAxiosRequestConfig,
    AxiosResponse,
} from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Create axios instance with base URL
 */
const axiosInstance: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000, // 10 seconds
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request Interceptor: Attach Authorization Bearer token if available
 */
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        try {
            // Get auth data from localStorage
            const authDataStr = localStorage.getItem('auth_data_v1');
            if (authDataStr) {
                const authData = JSON.parse(authDataStr);
                if (authData.accessToken) {
                    // Attach Bearer token to Authorization header
                    config.headers.Authorization = `Bearer ${authData.accessToken}`;
                }
            }
        } catch (err) {
            console.error('[apiClient] Error reading auth data:', err);
            // Continue without token (Guest mode)
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor: Handle 401 Unauthorized
 */
axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        // Success - return as-is
        return response;
    },
    (error: AxiosError) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            console.warn('[apiClient] 401 Unauthorized - clearing auth');

            // Clear auth from localStorage
            localStorage.removeItem('auth_data_v1');

            // Dispatch logout event (will be caught by AuthContext listener)
            // Note: We dispatch a custom event so AuthContext can react
            const logoutEvent = new CustomEvent('auth:logout', {
                detail: { reason: 'token_expired' },
            });
            window.dispatchEvent(logoutEvent);

            // Show user-friendly message
            console.error('Session expirée. Veuillez vous reconnecter.');
        }

        // Handle 403 Forbidden
        if (error.response?.status === 403) {
            console.warn('[apiClient] 403 Forbidden - insufficient permissions');
        }

        // Return error for caller to handle
        return Promise.reject(error);
    }
);

/**
 * API Client methods for common operations
 */
export const apiClient = {
    /**
     * GET request
     */
    get: <T = any>(url: string, config?: any) =>
        axiosInstance.get<T>(url, config),

    /**
     * POST request
     */
    post: <T = any>(url: string, data?: any, config?: any) =>
        axiosInstance.post<T>(url, data, config),

    /**
     * PUT request
     */
    put: <T = any>(url: string, data?: any, config?: any) =>
        axiosInstance.put<T>(url, data, config),

    /**
     * PATCH request
     */
    patch: <T = any>(url: string, data?: any, config?: any) =>
        axiosInstance.patch<T>(url, data, config),

    /**
     * DELETE request
     */
    delete: <T = any>(url: string, config?: any) =>
        axiosInstance.delete<T>(url, config),

    /**
     * Get raw axios instance for advanced usage
     */
    getInstance: () => axiosInstance,
};

export default apiClient;
