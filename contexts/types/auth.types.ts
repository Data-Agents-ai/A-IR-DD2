/**
 * @file auth.types.ts
 * @description Type definitions for Authentication Context
 * @domain Design Domain - Authentication
 */

/**
 * User data stored in auth context and localStorage
 */
export interface User {
    id: string;
    email: string;
    role?: 'user' | 'admin';
    isActive?: boolean;
}

/**
 * LLM API Key data structure (J4.2)
 */
export interface LLMApiKey {
    provider: string;
    enabled: boolean;
    capabilities?: Record<string, boolean>;
    hasApiKey?: boolean;
}

/**
 * Response from /api/llm/get-all-api-keys
 */
export interface LLMApiKeysResponse {
    keys: LLMApiKey[];
}

/**
 * Auth response from login/register endpoints
 */
export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

/**
 * Auth data stored in localStorage
 */
export interface StoredAuthData {
    user: User;
    accessToken: string;
    refreshToken: string;
}

/**
 * Auth loading state
 */
export interface AuthLoadingState {
    isLoading: boolean;
}

/**
 * Main Authentication Context Type
 */
export interface AuthContextType {
    // State
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    llmApiKeys: LLMApiKey[] | null; // J4.2: Session-only API keys

    // Methods
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshAccessToken: () => Promise<void>;
    clearError: () => void;
}
