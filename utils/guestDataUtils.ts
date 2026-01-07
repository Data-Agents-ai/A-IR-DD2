/**
 * @file guestDataUtils.ts
 * @description Utilities for managing guest mode volatile data
 * @domain Design Domain - Data Lifecycle Management
 * 
 * ARCHITECTURE:
 * - Centralized guest localStorage key management
 * - Wipe function for login transition
 * - Safe operations with error handling
 * 
 * SOLID PRINCIPLES:
 * - S: Single responsibility (guest data cleanup only)
 * - O: Open for extension (add new keys easily)
 * - D: Dependency inversion (no external dependencies)
 * 
 * NON-RÉGRESSION:
 * - Guest mode still works (keys untouched until login)
 * - Only clears guest-specific keys
 * - Auth keys preserved
 */

/**
 * Guest mode localStorage keys
 * All keys that should be cleared on login
 */
export const GUEST_STORAGE_KEYS = {
    // Workflow data
    WORKFLOW: 'guest_workflow_v1',
    WORKFLOW_NODES: 'guest_workflow_nodes_v1',
    WORKFLOW_EDGES: 'guest_workflow_edges_v1',
    
    // Agent data
    AGENT_INSTANCES: 'guest_agent_instances_v1',
    
    // LLM configs (API keys in plain text for guest)
    LLM_CONFIGS: 'llm_configs_guest',
    LLM_CONFIGS_LEGACY: 'llmAgentWorkflow_configs', // ← J4.4: Old key from App.tsx - must also be wiped!
    
    // User settings
    USER_SETTINGS: 'user_settings_guest',
    
    // Legacy keys (for backward compatibility cleanup)
    LEGACY_SETTINGS: 'settings',
    LEGACY_WORKFLOW: 'workflow',
} as const;

/**
 * Get all guest storage keys as array
 */
export const getAllGuestKeys = (): string[] => {
    return Object.values(GUEST_STORAGE_KEYS);
};

/**
 * Wipe all guest mode volatile data from localStorage
 * Called on login to prevent data leak from guest to auth session
 * 
 * @returns Object with cleanup statistics
 */
export const wipeGuestData = (): { 
    keysCleared: string[]; 
    errors: string[];
    success: boolean;
} => {
    const keysCleared: string[] = [];
    const errors: string[] = [];

    const keysToWipe = getAllGuestKeys();

    console.log('[GuestDataUtils] Starting guest data wipe...');

    for (const key of keysToWipe) {
        try {
            if (localStorage.getItem(key) !== null) {
                localStorage.removeItem(key);
                keysCleared.push(key);
                console.log(`[GuestDataUtils] Cleared: ${key}`);
            }
        } catch (err) {
            const errorMsg = `Failed to clear ${key}: ${err instanceof Error ? err.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`[GuestDataUtils] ${errorMsg}`);
        }
    }

    const success = errors.length === 0;

    console.log('[GuestDataUtils] Wipe complete:', {
        keysCleared: keysCleared.length,
        errors: errors.length,
        success
    });

    return { keysCleared, errors, success };
};

/**
 * Check if guest data exists in localStorage
 * Useful for prompting user before login (optional migration)
 * 
 * @returns Object describing what guest data exists
 */
export const checkGuestDataExists = (): {
    hasWorkflow: boolean;
    hasLLMConfigs: boolean;
    hasSettings: boolean;
    totalKeys: number;
} => {
    const hasWorkflow = localStorage.getItem(GUEST_STORAGE_KEYS.WORKFLOW) !== null ||
                       localStorage.getItem(GUEST_STORAGE_KEYS.WORKFLOW_NODES) !== null;
    
    const hasLLMConfigs = localStorage.getItem(GUEST_STORAGE_KEYS.LLM_CONFIGS) !== null;
    
    const hasSettings = localStorage.getItem(GUEST_STORAGE_KEYS.USER_SETTINGS) !== null;

    let totalKeys = 0;
    for (const key of getAllGuestKeys()) {
        if (localStorage.getItem(key) !== null) {
            totalKeys++;
        }
    }

    return {
        hasWorkflow,
        hasLLMConfigs,
        hasSettings,
        totalKeys
    };
};

/**
 * Get guest LLM configs (for potential migration to auth)
 * Returns null if no guest configs exist
 * 
 * @returns Parsed guest LLM configs or null
 */
export const getGuestLLMConfigs = (): Record<string, any> | null => {
    try {
        const stored = localStorage.getItem(GUEST_STORAGE_KEYS.LLM_CONFIGS);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (err) {
        console.error('[GuestDataUtils] Failed to parse guest LLM configs:', err);
        return null;
    }
};

export default {
    GUEST_STORAGE_KEYS,
    getAllGuestKeys,
    wipeGuestData,
    checkGuestDataExists,
    getGuestLLMConfigs
};
