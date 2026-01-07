/**
 * @file user-workspace.routes.ts
 * @description Composite endpoint for user workspace hydration (J4.4)
 * @domain Design Domain - Workspace Persistence & Hydration
 * 
 * ARCHITECTURE:
 * - Single endpoint to fetch entire user workspace state
 * - Eliminates waterfall API calls on frontend
 * - Supports hydration after F5 refresh
 * 
 * ENDPOINTS:
 * - GET /api/user/workspace - Full workspace state (workflow, agents, configs)
 * - GET /api/user/workspace/default - Get or create default workflow
 * 
 * SECURITY:
 * - Requires Bearer token (JWT)
 * - All resources filtered by userId
 * - API keys NEVER exposed in response
 * 
 * SOLID PRINCIPLES:
 * - S: Single responsibility (workspace aggregation only)
 * - O: Open for extension (add new domains easily)
 * - L: Liskov substitution (standard REST interface)
 * - I: Interface segregation (minimal response per use-case)
 * - D: Dependency inversion (uses models via interfaces)
 */

import { Router, Request, Response } from 'express';
import { Workflow } from '../models/Workflow.model';
import { AgentInstance } from '../models/AgentInstance.model';
import { AgentPrototype } from '../models/AgentPrototype.model';
import { WorkflowEdge } from '../models/WorkflowEdge.model';
import { LLMConfig } from '../models/LLMConfig.model';
import UserSettings from '../models/UserSettings.model';
import { requireAuth } from '../middleware/auth.middleware';
import { IUser } from '../models/User.model';

const router = Router();

/**
 * Response interface for workspace endpoint
 * Defines contract between backend and frontend hydration
 */
interface WorkspaceResponse {
    workflow: {
        id: string;
        name: string;
        description?: string;
        isActive: boolean;
        isDirty: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastSavedAt?: Date;
    } | null;
    nodes: Array<{
        id: string;
        agentId: string;
        agentName: string;
        position: { x: number; y: number };
        provider: string;
        model: string;
        createdAt: Date;
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
        createdAt: Date;
    }>;
    agentPrototypes: Array<{
        id: string;
        name: string;
        provider: string;
        model: string;
        description?: string;
    }>;
    llmConfigs: Array<{
        id: string;
        provider: string;
        enabled: boolean;
        hasApiKey: boolean;
        capabilities: Record<string, boolean>;
        updatedAt: Date;
    }>;
    userSettings: {
        language: string;
        theme: string;
    };
    metadata: {
        loadedAt: Date;
        userId: string;
        hasWorkflow: boolean;
    };
}

/**
 * GET /api/user/workspace
 * Fetch complete workspace state for hydration
 * 
 * Use cases:
 * - App mount (initial load)
 * - Page refresh (F5)
 * - Login success → hydrate user data
 * 
 * Response: WorkspaceResponse
 */
router.get('/workspace', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as IUser;
        const userId = user.id || user._id;

        console.log('[Workspace] GET - userId:', userId);

        // Parallel fetch all user resources for performance
        const [
            activeWorkflow,
            agentPrototypes,
            llmConfigs,
            userSettings
        ] = await Promise.all([
            // Get active workflow (or most recent)
            Workflow.findOne({ userId, isActive: true }).sort({ updatedAt: -1 }),
            // Get all agent prototypes for user
            AgentPrototype.find({ userId }).sort({ name: 1 }),
            // Get all LLM configs (without API keys)
            LLMConfig.find({ userId }),
            // Get user settings
            UserSettings.findOne({ userId })
        ]);

        // If no active workflow, get most recent
        let workflow = activeWorkflow;
        if (!workflow) {
            workflow = await Workflow.findOne({ userId }).sort({ updatedAt: -1 });
        }

        // Fetch workflow-specific data if workflow exists
        let agentInstances: any[] = [];
        let edges: any[] = [];

        if (workflow) {
            [agentInstances, edges] = await Promise.all([
                AgentInstance.find({ workflowId: workflow.id }),
                WorkflowEdge.find({ workflowId: workflow.id })
            ]);
        }

        // Build response (SECURITY: never expose apiKeyEncrypted)
        const response: WorkspaceResponse = {
            workflow: workflow ? {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                isActive: workflow.isActive,
                isDirty: workflow.isDirty,
                createdAt: workflow.createdAt,
                updatedAt: workflow.updatedAt,
                lastSavedAt: workflow.lastSavedAt
            } : null,

            nodes: agentInstances.map(agent => ({
                id: agent.id,
                agentId: agent.id,
                agentName: agent.name,
                position: agent.position || { x: 0, y: 0 },
                provider: agent.provider,
                model: agent.model,
                createdAt: agent.createdAt
            })),

            edges: edges.map(edge => ({
                id: edge.id,
                sourceId: edge.sourceNodeId || edge.sourceId,
                targetId: edge.targetNodeId || edge.targetId,
                type: edge.type || 'default'
            })),

            agentInstances: agentInstances.map(agent => ({
                id: agent.id,
                name: agent.name,
                provider: agent.provider,
                model: agent.model,
                position: agent.position || { x: 0, y: 0 },
                systemInstruction: agent.systemInstruction,
                createdAt: agent.createdAt
            })),

            agentPrototypes: agentPrototypes.map(proto => ({
                id: proto.id,
                name: proto.name,
                provider: proto.llmProvider,
                model: proto.llmModel,
                description: proto.role // Use role as description for prototypes
            })),

            // SECURITY: Only expose hasApiKey boolean, never the encrypted key
            llmConfigs: llmConfigs.map(config => ({
                id: config.id,
                provider: config.provider,
                enabled: config.enabled,
                hasApiKey: !!config.apiKeyEncrypted,
                capabilities: config.capabilities || {},
                updatedAt: config.updatedAt
            })),

            userSettings: {
                language: userSettings?.preferences?.language || 'fr',
                theme: userSettings?.preferences?.theme || 'dark'
            },

            metadata: {
                loadedAt: new Date(),
                userId: userId.toString(),
                hasWorkflow: !!workflow
            }
        };

        console.log('[Workspace] GET - response summary:', {
            hasWorkflow: !!workflow,
            nodesCount: response.nodes.length,
            edgesCount: response.edges.length,
            llmConfigsCount: response.llmConfigs.length
        });

        res.json(response);

    } catch (error) {
        console.error('[Workspace] GET error:', error);
        res.status(500).json({
            error: 'Failed to fetch workspace',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/user/workspace/default
 * Get or create default workflow for user
 * 
 * Use cases:
 * - New user first login (create default workspace)
 * - User deleted all workflows (recreate default)
 * 
 * Response: { workflow: IWorkflow, isNewlyCreated: boolean }
 */
router.get('/workspace/default', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as IUser;
        const userId = user.id || user._id;

        // Check for existing workflow
        let workflow = await Workflow.findOne({ userId, isActive: true });

        if (!workflow) {
            // Check for any workflow
            workflow = await Workflow.findOne({ userId }).sort({ updatedAt: -1 });
        }

        let isNewlyCreated = false;

        if (!workflow) {
            // Create default workflow for new user
            workflow = new Workflow({
                userId,
                name: 'Mon Workflow',
                description: 'Workflow par défaut',
                isActive: true,
                isDirty: false
            });
            await workflow.save();
            isNewlyCreated = true;

            console.log('[Workspace] Created default workflow for user:', userId);
        }

        res.json({
            workflow: {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                isActive: workflow.isActive,
                isDirty: workflow.isDirty,
                createdAt: workflow.createdAt,
                updatedAt: workflow.updatedAt
            },
            isNewlyCreated
        });

    } catch (error) {
        console.error('[Workspace] GET default error:', error);
        res.status(500).json({
            error: 'Failed to get default workspace',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
