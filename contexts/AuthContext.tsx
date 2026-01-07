/**
 * @file AuthContext.tsx
 * @description Authentication context provider with localStorage persistence
 * @domain Design Domain - Authentication
 *
 * ARCHITECTURE:
 * - Custom React Context for authentication state
 * - localStorage persistence (key: auth_data_v1)
 * - Safe hydration on app boot (no blocking)
 * - Guest mode fallback (isAuthenticated = false)
 *
 * NON-RÉGRESSION: Guest mode unchanged if user is null
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useCallback
} from 'react';
import { User, AuthContextType, StoredAuthData, AuthResponse, AuthLoadingState, LLMApiKey } from './types/auth.types';
import { wipeGuestData, checkGuestDataExists } from '../utils/guestDataUtils';

const AUTH_STORAGE_KEY = 'auth_data_v1';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * AuthContext - Singleton context for authentication state
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * AuthProvider component
 * Wraps application with authentication context
 *
 * Lifecycle:
 * 1. Mount: isLoading=true
 * 2. useEffect: Hydrate from localStorage
 * 3. Render: isLoading=false (or false from start if no stored auth)
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    // Estado
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start true to avoid FOUC
    const [error, setError] = useState<string | null>(null);
    const [llmApiKeys, setLlmApiKeys] = useState<LLMApiKey[] | null>(null); // J4.2: Session-only storage
    const [isMounted, setIsMounted] = useState(false); // ⭐ J4.4: Prevent async cleanup errors

    /**
     * ⭐ J4.4: Track mount state to prevent async state updates after unmount
     * This prevents the "message channel closed before response" error
     */
    useEffect(() => {
        setIsMounted(true);
        return () => {
            setIsMounted(false);
        };
    }, []);

    /**
     * Hydrate auth from localStorage on mount
     * SAFE: Try-catch prevents app crash if localStorage corrupted
     */
    useEffect(() => {
        const hydrateFromStorage = () => {
            try {
                const stored = localStorage.getItem(AUTH_STORAGE_KEY);
                if (stored) {
                    const { user, accessToken, refreshToken }: StoredAuthData = JSON.parse(stored);

                    // Validate structure
                    if (user && user.id && user.email && accessToken && refreshToken) {
                        if (isMounted) {
                            setUser(user);
                            setAccessToken(accessToken);
                            setRefreshToken(refreshToken);
                        }
                    } else {
                        // Malformed data - clear
                        localStorage.removeItem(AUTH_STORAGE_KEY);
                    }
                }
            } catch (err) {
                console.error('[AuthContext] Hydration error:', err);
                localStorage.removeItem(AUTH_STORAGE_KEY);
            } finally {
                // Always finish loading (fallback to guest mode)
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        hydrateFromStorage();
    }, [isMounted]);

    /**
     * Listen for logout event from API interceptor (e.g., 401 response)
     */
    useEffect(() => {
        const handleLogoutEvent = (event: Event) => {
            const customEvent = event as CustomEvent;
            console.warn('[AuthContext] Logout event received:', customEvent.detail?.reason);

            // Clear auth state
            setUser(null);
            setAccessToken(null);
            setRefreshToken(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
            setError('Session expirée. Veuillez vous reconnecter.');
        };

        window.addEventListener('auth:logout', handleLogoutEvent);

        return () => {
            window.removeEventListener('auth:logout', handleLogoutEvent);
        };
    }, []);

    /**
     * Save auth data to localStorage and state
     */
    const saveAuthData = useCallback((userData: User, accessToken: string, refreshToken: string) => {
        const authData: StoredAuthData = { user: userData, accessToken, refreshToken };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        setUser(userData);
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        setError(null);
    }, []);

    /**
     * J4.2: Fetch decrypted LLM API keys from server
     * POST /api/llm/get-all-api-keys
     * Called after successful login/register
     * Keys stored ONLY in memory (session), NOT in localStorage
     * 
     * ⭐ J4.4: Added timeout & mount check to prevent async errors
     */
    const fetchLLMApiKeys = useCallback(async (token: string) => {
        // ⭐ J4.4: Check mount state before async operation
        if (!isMounted) {
            console.warn('[AuthContext] fetchLLMApiKeys: Component not mounted, skipping');
            return;
        }

        // ⭐ J4.4: Add 5-second timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(`${API_BASE_URL}/api/llm/get-all-api-keys`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({}),
                signal: controller.signal // ⭐ J4.4: Allow timeout to abort
            });

            if (!response.ok) {
                console.warn('[AuthContext] Failed to fetch LLM API keys:', response.status);
                // Non-blocking: continue without keys
                if (isMounted) {
                    setLlmApiKeys([]);
                }
                return;
            }

            const keys: LLMApiKey[] = await response.json();
            
            // ⭐ J4.4: Only update state if component still mounted
            if (isMounted) {
                setLlmApiKeys(keys);
                console.log('[AuthContext] LLM API keys fetched successfully:', keys.length, 'keys');
            }
        } catch (err: any) {
            // ⭐ J4.4: Ignore abort errors (timeout) and unmount errors
            if (err.name === 'AbortError') {
                console.warn('[AuthContext] fetchLLMApiKeys: Timeout (5s) reached');
            } else {
                console.warn('[AuthContext] Error fetching LLM API keys:', err.message);
            }
            
            // Only update state if component still mounted
            if (isMounted) {
                setLlmApiKeys([]);
            }
        } finally {
            clearTimeout(timeoutId);
        }
    }, [isMounted]);

    /**
     * Login with email & password
     * POST /api/auth/login
     * 
     * CRITICAL: Wipes guest data before setting auth state
     * This prevents data leak from guest session to authenticated session
     */
    const login = useCallback(async (email: string, password: string) => {
        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'omit' // No cookies for now
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed');
            }

            const { user: userData, accessToken, refreshToken }: AuthResponse = await response.json();

            // ⭐ CRITICAL: Wipe guest data BEFORE setting auth state
            // This prevents guest session data from bleeding into auth session
            const guestCheck = checkGuestDataExists();
            if (guestCheck.totalKeys > 0) {
                console.log('[AuthContext] Wiping guest data before login:', guestCheck);
                const wipeResult = wipeGuestData();
                console.log('[AuthContext] Guest data wipe result:', wipeResult);
            }

            saveAuthData(userData, accessToken, refreshToken);

            // J4.2: Fetch LLM API keys after successful login
            await fetchLLMApiKeys(accessToken);
        } catch (err: any) {
            const errorMsg = err.message || 'Connection error';
            setError(errorMsg);
            throw err; // Re-throw for modal/UI handling
        } finally {
            setIsLoading(false);
        }
    }, [saveAuthData, fetchLLMApiKeys]);

    /**
     * Register with email & password
     * POST /api/auth/register
     * 
     * CRITICAL: Wipes guest data before setting auth state
     */
    const register = useCallback(async (email: string, password: string) => {
        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Registration failed');
            }

            const { user: userData, accessToken, refreshToken }: AuthResponse = await response.json();

            // ⭐ CRITICAL: Wipe guest data BEFORE setting auth state
            const guestCheck = checkGuestDataExists();
            if (guestCheck.totalKeys > 0) {
                console.log('[AuthContext] Wiping guest data before register:', guestCheck);
                const wipeResult = wipeGuestData();
                console.log('[AuthContext] Guest data wipe result:', wipeResult);
            }

            saveAuthData(userData, accessToken, refreshToken);

            // J4.2: Fetch LLM API keys after successful registration
            await fetchLLMApiKeys(accessToken);
        } catch (err: any) {
            const errorMsg = err.message || 'Connection error';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [saveAuthData, fetchLLMApiKeys]);

    /**
     * Logout - Clear all auth data and guest data
     * ⭐ CRITICAL: Also wipes guest data to ensure clean state
     * Prevents authenticated user data from leaking to guest mode
     */
    const logout = useCallback(() => {
        // ⭐ CRITICAL: Wipe guest data on logout
        // Prevents authenticated user state from contaminating guest mode
        const guestCheck = checkGuestDataExists();
        if (guestCheck.totalKeys > 0) {
            console.log('[AuthContext] Wiping guest data on logout:', guestCheck);
            const wipeResult = wipeGuestData();
            console.log('[AuthContext] Guest data wipe result:', wipeResult);
        }

        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        setError(null);
        setLlmApiKeys(null); // J4.2: Clear LLM API keys on logout
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }, []);

    /**
     * Refresh access token using refresh token
     * POST /api/auth/refresh
     * (Backend endpoint will be added in Phase 2)
     */
    const refreshAccessToken = useCallback(async () => {
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                logout(); // Token expired, logout user
                throw new Error('Token refresh failed');
            }

            const { accessToken: newAccessToken }: { accessToken: string } = await response.json();
            setAccessToken(newAccessToken);
        } catch (err: any) {
            logout();
            throw err;
        }
    }, [refreshToken, logout]);

    /**
     * Clear error message
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Context value
    const value: AuthContextType = {
        user,
        accessToken,
        refreshToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        error,
        llmApiKeys, // J4.2: Expose LLM API keys to components
        login,
        register,
        logout,
        refreshAccessToken,
        clearError
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook: useAuth
 * Access authentication context
 *
 * USAGE:
 * ```tsx
 * const { user, isAuthenticated, login } = useAuth();
 * ```
 *
 * ERROR:
 * Will throw if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export default AuthContext;
