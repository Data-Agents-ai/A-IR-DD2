/**
 * @file useWorkspaceHydration.ts
 * @description Hook for hydrating workspace state from backend or localStorage
 * @domain Design Domain - State Hydration & Persistence
 * 
 * ARCHITECTURE:
 * - Automatic hydration on mount and auth state changes
 * - Dual-mode: API for authenticated, localStorage for guest
 * - Non-blocking with loading states
 * 
 * SOLID PRINCIPLES:
 * - S: Single responsibility (workspace hydration only)
 * - O: Open for extension (add new domains easily)
 * - D: Dependency inversion (abstracts storage backend)
 * 
 * USE CASES:
 * - App mount: Load workspace state
 * - Login success: Hydrate from MongoDB
 * - F5 refresh: Restore context without data loss
 * - Logout: Reset to guest mode (localStorage)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { GUEST_STORAGE_KEYS } from '../utils/guestDataUtils';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Workspace data structure (mirrors backend response)
 */
export interface WorkspaceData {
    workflow: {
        id: string;
        name: string;
        description?: string;
        isActive: boolean;
        isDirty: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null;
    nodes: Array<{
        id: string;
        agentId: string;
        agentName: string;
        position: { x: number; y: number };
        provider: string;
        model: string;
    }>;
    edges: Array<{
        id: string;
        sourceId: string;
        targetId: string;
        type: string;
    }>;
    agentInstances: Array<{
        id: string;
        name: string;
        provider: string;
        model: string;
        position: { x: number; y: number };
        systemInstruction?: string;
    }>;
    llmConfigs: Array<{
        id: string;
        provider: string;
        enabled: boolean;
        hasApiKey: boolean;
        capabilities: Record<string, boolean>;
    }>;
    userSettings: {
        language: string;
        theme: string;
    };
    metadata: {
        loadedAt: Date;
        userId: string;
        hasWorkflow: boolean;
        source: 'api' | 'localStorage';
    };
}

/**
 * Hook return type
 */
export interface UseWorkspaceHydrationResult {
    workspace: WorkspaceData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    source: 'api' | 'localStorage' | 'none';
}

/**
 * Fetch workspace from API (authenticated mode)
 */
const fetchWorkspaceFromAPI = async (accessToken: string): Promise<WorkspaceData> => {
    const response = await fetch(`${API_BASE_URL}/api/user/workspace`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
        ...data,
        metadata: {
            ...data.metadata,
            source: 'api' as const
        }
    };
};

/**
 * Load workspace from localStorage (guest mode)
 */
const loadWorkspaceFromLocalStorage = (): WorkspaceData => {
    try {
        // Load workflow
        const workflowJson = localStorage.getItem(GUEST_STORAGE_KEYS.WORKFLOW);
        const workflow = workflowJson ? JSON.parse(workflowJson) : null;

        // Load nodes
        const nodesJson = localStorage.getItem(GUEST_STORAGE_KEYS.WORKFLOW_NODES);
        const nodes = nodesJson ? JSON.parse(nodesJson) : [];

        // Load edges
        const edgesJson = localStorage.getItem(GUEST_STORAGE_KEYS.WORKFLOW_EDGES);
        const edges = edgesJson ? JSON.parse(edgesJson) : [];

        // Load agent instances
        const instancesJson = localStorage.getItem(GUEST_STORAGE_KEYS.AGENT_INSTANCES);
        const agentInstances = instancesJson ? JSON.parse(instancesJson) : [];

        // Load LLM configs
        const configsJson = localStorage.getItem(GUEST_STORAGE_KEYS.LLM_CONFIGS);
        const llmConfigs = configsJson ? JSON.parse(configsJson) : [];

        // Load user settings
        const settingsJson = localStorage.getItem(GUEST_STORAGE_KEYS.USER_SETTINGS);
        const userSettings = settingsJson 
            ? JSON.parse(settingsJson) 
            : { language: 'fr', theme: 'dark' };

        return {
            workflow,
            nodes,
            edges,
            agentInstances,
            llmConfigs: Array.isArray(llmConfigs) 
                ? llmConfigs.map((c: any) => ({
                    id: c.id || c.provider,
                    provider: c.provider,
                    enabled: c.enabled ?? true,
                    hasApiKey: !!(c.apiKey || c.apiKeyPlaintext),
                    capabilities: c.capabilities || {}
                }))
                : [],
            userSettings: {
                language: userSettings.language || 'fr',
                theme: userSettings.theme || 'dark'
            },
            metadata: {
                loadedAt: new Date(),
                userId: 'guest',
                hasWorkflow: !!workflow,
                source: 'localStorage' as const
            }
        };
    } catch (err) {
        console.error('[useWorkspaceHydration] localStorage parse error:', err);
        // Return empty workspace on error
        return {
            workflow: null,
            nodes: [],
            edges: [],
            agentInstances: [],
            llmConfigs: [],
            userSettings: { language: 'fr', theme: 'dark' },
            metadata: {
                loadedAt: new Date(),
                userId: 'guest',
                hasWorkflow: false,
                source: 'localStorage' as const
            }
        };
    }
};

/**
 * Hook: useWorkspaceHydration
 * 
 * Automatically hydrates workspace state based on authentication status.
 * - Authenticated: Fetches from /api/user/workspace
 * - Guest: Loads from localStorage
 * 
 * Triggers on:
 * - Initial mount
 * - isAuthenticated change (login/logout)
 * - accessToken change (refresh)
 * 
 * @returns Workspace data, loading state, error, and refetch function
 */
export const useWorkspaceHydration = (): UseWorkspaceHydrationResult => {
    const { isAuthenticated, accessToken, isLoading: authLoading } = useAuth();
    
    const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [source, setSource] = useState<'api' | 'localStorage' | 'none'>('none');

    /**
     * Hydrate workspace based on auth state
     */
    const hydrate = useCallback(async () => {
        // Wait for auth to finish loading
        if (authLoading) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (isAuthenticated && accessToken) {
                // Authenticated mode: fetch from API
                console.log('[useWorkspaceHydration] Hydrating from API...');
                const data = await fetchWorkspaceFromAPI(accessToken);
                setWorkspace(data);
                setSource('api');
                console.log('[useWorkspaceHydration] API hydration complete:', {
                    hasWorkflow: !!data.workflow,
                    nodesCount: data.nodes.length,
                    llmConfigsCount: data.llmConfigs.length
                });
            } else {
                // Guest mode: load from localStorage
                console.log('[useWorkspaceHydration] Hydrating from localStorage...');
                const data = loadWorkspaceFromLocalStorage();
                setWorkspace(data);
                setSource('localStorage');
                console.log('[useWorkspaceHydration] localStorage hydration complete:', {
                    hasWorkflow: !!data.workflow,
                    nodesCount: data.nodes.length
                });
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Hydration failed';
            console.error('[useWorkspaceHydration] Error:', errorMsg);
            setError(errorMsg);
            
            // Fallback to empty workspace
            setWorkspace({
                workflow: null,
                nodes: [],
                edges: [],
                agentInstances: [],
                llmConfigs: [],
                userSettings: { language: 'fr', theme: 'dark' },
                metadata: {
                    loadedAt: new Date(),
                    userId: isAuthenticated ? 'error' : 'guest',
                    hasWorkflow: false,
                    source: isAuthenticated ? 'api' : 'localStorage'
                }
            });
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, accessToken, authLoading]);

    /**
     * Auto-hydrate on mount and auth changes
     */
    useEffect(() => {
        hydrate();
    }, [hydrate]);

    /**
     * Manual refetch function
     */
    const refetch = useCallback(async () => {
        await hydrate();
    }, [hydrate]);

    return {
        workspace,
        isLoading: isLoading || authLoading,
        error,
        refetch,
        source
    };
};

export default useWorkspaceHydration;
