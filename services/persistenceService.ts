/**
 * @file persistenceService.ts
 * @description Service unifié pour la persistance des workflows et agents
 * @domain Design Domain - Persistence Layer
 * 
 * ⭐ ÉTAPE 2.4: Sauvegarde unifiée (Guest vs Authenticated)
 * 
 * ARCHITECTURE:
 * - Dual-mode: localStorage pour guest, API pour authenticated
 * - Auto-save pour agents et instances (immédiat)
 * - Manual save pour workflow structure (bouton 💾)
 * 
 * ENDPOINTS UTILISÉS:
 * - PUT /api/workflows/:id - Save workflow (structure + canvasState)
 * - PUT /api/agent-instances/:id - Save agent instance (auto-save)
 * - POST /api/agent-instances/:id/content - Add content (chat/image/video/error)
 * 
 * SOLID PRINCIPLES:
 * - S: Single responsibility (persistence only)
 * - O: Open for extension (add new entity types)
 * - D: Dependency inversion (abstracts storage backend)
 */

import { GUEST_STORAGE_KEYS } from '../utils/guestDataUtils';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ============================================
// TYPES
// ============================================

export interface PersistenceOptions {
    isAuthenticated: boolean;
    accessToken?: string;
}

export interface CanvasState {
    zoom: number;
    panX: number;
    panY: number;
}

export interface WorkflowSaveData {
    id: string;
    name?: string;
    description?: string;
    canvasState?: CanvasState;
    nodes?: Array<{
        id: string;
        type: string;
        position: { x: number; y: number };
        data: Record<string, any>;
    }>;
    edges?: Array<{
        id: string;
        source: string;
        target: string;
        type?: string;
    }>;
}

export interface AgentInstanceSaveData {
    id: string;
    position?: { x: number; y: number };
    status?: 'running' | 'completed' | 'failed' | 'stopped';
    userNotes?: string;
    tags?: string[];
}

export interface AgentInstanceContent {
    type: 'chat' | 'image' | 'video' | 'error';
    role?: string;
    message?: string;
    mediaId?: string;
    prompt?: string;
    url?: string;
    duration?: number;
    subType?: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
}

// ============================================
// WORKFLOW PERSISTENCE
// ============================================

/**
 * Save workflow structure (MANUAL SAVE - Bouton 💾)
 * 
 * Mode Guest: localStorage
 * Mode Auth: PUT /api/workflows/:id
 */
export async function saveWorkflow(
    data: WorkflowSaveData,
    options: PersistenceOptions
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!options.isAuthenticated) {
            // Guest mode: localStorage
            const existing = localStorage.getItem(GUEST_STORAGE_KEYS.WORKFLOW);
            const workflow = existing ? JSON.parse(existing) : {};
            
            const updated = {
                ...workflow,
                ...data,
                updatedAt: new Date().toISOString()
            };
            
            localStorage.setItem(GUEST_STORAGE_KEYS.WORKFLOW, JSON.stringify(updated));
            
            // Also save nodes and edges separately for compatibility
            if (data.nodes) {
                localStorage.setItem(GUEST_STORAGE_KEYS.WORKFLOW_NODES, JSON.stringify(data.nodes));
            }
            if (data.edges) {
                localStorage.setItem(GUEST_STORAGE_KEYS.WORKFLOW_EDGES, JSON.stringify(data.edges));
            }
            
            console.log('[PersistenceService] Workflow saved to localStorage');
            return { success: true };
        }

        // Authenticated mode: API
        if (!options.accessToken) {
            return { success: false, error: 'No access token provided' };
        }

        const response = await fetch(`${API_BASE_URL}/api/workflows/${data.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${options.accessToken}`
            },
            body: JSON.stringify({
                name: data.name,
                description: data.description,
                canvasState: data.canvasState,
                // Note: nodes and edges are saved via agent-instances
                isDirty: false,
                lastSavedAt: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { 
                success: false, 
                error: errorData.message || `HTTP ${response.status}` 
            };
        }

        console.log('[PersistenceService] Workflow saved to API');
        return { success: true };
        
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PersistenceService] saveWorkflow error:', errorMsg);
        return { success: false, error: errorMsg };
    }
}

/**
 * Save canvas state only (optimized for frequent updates)
 */
export async function saveCanvasState(
    workflowId: string,
    canvasState: CanvasState,
    options: PersistenceOptions
): Promise<{ success: boolean; error?: string }> {
    return saveWorkflow({ id: workflowId, canvasState }, options);
}

// ============================================
// AGENT INSTANCE PERSISTENCE (AUTO-SAVE)
// ============================================

/**
 * Save agent instance position/config (AUTO-SAVE)
 * Called on drag, resize, config change
 */
export async function saveAgentInstance(
    data: AgentInstanceSaveData,
    options: PersistenceOptions
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!options.isAuthenticated) {
            // Guest mode: localStorage
            const existing = localStorage.getItem(GUEST_STORAGE_KEYS.AGENT_INSTANCES);
            const instances = existing ? JSON.parse(existing) : [];
            
            const index = instances.findIndex((i: any) => i.id === data.id);
            if (index >= 0) {
                instances[index] = { ...instances[index], ...data, updatedAt: new Date().toISOString() };
            } else {
                instances.push({ ...data, updatedAt: new Date().toISOString() });
            }
            
            localStorage.setItem(GUEST_STORAGE_KEYS.AGENT_INSTANCES, JSON.stringify(instances));
            console.log('[PersistenceService] Agent instance saved to localStorage');
            return { success: true };
        }

        // Authenticated mode: API
        if (!options.accessToken) {
            return { success: false, error: 'No access token provided' };
        }

        const response = await fetch(`${API_BASE_URL}/api/agent-instances/${data.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${options.accessToken}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { 
                success: false, 
                error: errorData.message || `HTTP ${response.status}` 
            };
        }

        console.log('[PersistenceService] Agent instance saved to API');
        return { success: true };
        
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PersistenceService] saveAgentInstance error:', errorMsg);
        return { success: false, error: errorMsg };
    }
}

/**
 * Add content to agent instance (AUTO-SAVE)
 * Called after each chat message, image generation, error
 * 
 * ⭐ ÉTAPE 1.6: Contenu polymorphe (chat/image/video/error)
 */
export async function addAgentInstanceContent(
    instanceId: string,
    content: AgentInstanceContent,
    options: PersistenceOptions
): Promise<{ success: boolean; error?: string }> {
    try {
        // Add timestamp if not provided
        const contentWithTimestamp = {
            ...content,
            timestamp: content.timestamp || new Date()
        };

        if (!options.isAuthenticated) {
            // Guest mode: localStorage
            const existing = localStorage.getItem(GUEST_STORAGE_KEYS.AGENT_INSTANCES);
            const instances = existing ? JSON.parse(existing) : [];
            
            const index = instances.findIndex((i: any) => i.id === instanceId);
            if (index >= 0) {
                if (!instances[index].content) {
                    instances[index].content = [];
                }
                instances[index].content.push(contentWithTimestamp);
                instances[index].updatedAt = new Date().toISOString();
                
                // Update metrics
                if (!instances[index].metrics) {
                    instances[index].metrics = { totalTokens: 0, totalErrors: 0, totalMediaGenerated: 0, callCount: 0 };
                }
                if (content.type === 'chat') {
                    instances[index].metrics.callCount++;
                    if (content.metadata?.tokensUsed) {
                        instances[index].metrics.totalTokens += content.metadata.tokensUsed;
                    }
                } else if (content.type === 'error') {
                    instances[index].metrics.totalErrors++;
                } else if (content.type === 'image' || content.type === 'video') {
                    instances[index].metrics.totalMediaGenerated++;
                }
            }
            
            localStorage.setItem(GUEST_STORAGE_KEYS.AGENT_INSTANCES, JSON.stringify(instances));
            console.log('[PersistenceService] Content added to localStorage');
            return { success: true };
        }

        // Authenticated mode: API
        if (!options.accessToken) {
            return { success: false, error: 'No access token provided' };
        }

        const response = await fetch(`${API_BASE_URL}/api/agent-instances/${instanceId}/content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${options.accessToken}`
            },
            body: JSON.stringify({ content: contentWithTimestamp })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { 
                success: false, 
                error: errorData.message || `HTTP ${response.status}` 
            };
        }

        console.log('[PersistenceService] Content added via API');
        return { success: true };
        
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PersistenceService] addAgentInstanceContent error:', errorMsg);
        return { success: false, error: errorMsg };
    }
}

// ============================================
// HELPER: Create content helpers
// ============================================

/**
 * Create chat content object
 */
export function createChatContent(
    role: 'user' | 'agent' | 'tool',
    message: string,
    metadata?: { llmProvider?: string; modelUsed?: string; tokensUsed?: number }
): AgentInstanceContent {
    return {
        type: 'chat',
        role,
        message,
        timestamp: new Date(),
        metadata
    };
}

/**
 * Create error content object
 */
export function createErrorContent(
    subType: string,
    message: string,
    source: 'llm_service' | 'tool_executor' | 'frontend',
    retryable: boolean = false,
    attempts: number = 1,
    errorCode?: string
): AgentInstanceContent {
    return {
        type: 'error',
        subType,
        message,
        timestamp: new Date(),
        metadata: {
            source,
            retryable,
            attempts,
            errorCode
        }
    };
}

/**
 * Create image content object
 */
export function createImageContent(
    mediaId: string,
    prompt: string,
    url: string,
    model: string,
    size: string
): AgentInstanceContent {
    return {
        type: 'image',
        mediaId,
        prompt,
        url,
        timestamp: new Date(),
        metadata: { model, size }
    };
}

// ============================================
// EXPORT SERVICE OBJECT
// ============================================

export const PersistenceService = {
    saveWorkflow,
    saveCanvasState,
    saveAgentInstance,
    addAgentInstanceContent,
    createChatContent,
    createErrorContent,
    createImageContent
};

export default PersistenceService;
