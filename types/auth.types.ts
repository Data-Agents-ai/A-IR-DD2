/**
 * @file types/auth.types.ts
 * @description Authentication domain types (TypeScript interfaces)
 * @domain Design Domain - Authentication & Security
 */

/**
 * Représente un utilisateur authentifié
 */
export interface User {
    id: string;
    email: string;
    role: string;
    isActive?: boolean;
}

/**
 * Tokens JWT retournés par /api/auth/login ou /api/auth/register
 */
export interface JWTTokens {
    accessToken: string;
    refreshToken: string;
}

/**
 * Réponse d'authentification complète
 */
export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

/**
 * Données d'authentification persistées en localStorage
 */
export interface StoredAuthData {
    user: User;
    accessToken: string;
    refreshToken: string;
}

/**
 * Type du contexte d'authentification
 */
export interface AuthContextType {
    // État
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // LLM API Keys (J4.2) - Session-only storage
    llmApiKeys: LLMApiKey[] | null;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshAccessToken: () => Promise<void>;
    clearError: () => void;
}

/**
 * Énumération des états de chargement
 */
export enum AuthLoadingState {
    INITIALIZING = 'initializing',
    HYDRATING = 'hydrating',
    IDLE = 'idle',
    LOGGING_IN = 'logging-in',
    REGISTERING = 'registering',
    REFRESHING = 'refreshing'
}

/**
 * Credentials pour login
 */
export interface LoginCredentials {
    email: string;
    password: string;
}

/**
 * Credentials pour register
 */
export interface RegisterCredentials {
    email: string;
    password: string;
    confirmPassword?: string;
}

/**
 * Représente une clé API LLM déchiffrée du serveur
 * Stockée UNIQUEMENT en mémoire (pas localStorage)
 */
export interface LLMApiKey {
    provider: string;
    apiKey: string;
    capabilities?: {
        [key: string]: boolean;
    };
    enabled: boolean;
}

/**
 * Réponse du serveur pour les clés API LLM
 */
export interface LLMApiKeysResponse {
    keys: LLMApiKey[];
}
