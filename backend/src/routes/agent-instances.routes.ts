import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { AgentInstance } from '../models/AgentInstance.model';
import { AgentPrototype } from '../models/AgentPrototype.model';
import { Workflow } from '../models/Workflow.model';
import { requireAuth, requireOwnershipAsync } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { IUser } from '../models/User.model';

// CORRECTION SOLID: mergeParams: true pour hériter des paramètres du parent (:workflowId)
const router = Router({ mergeParams: true });

// Schema validation
const createAgentInstanceSchema = z.object({
    workflowId: z.string(),
    prototypeId: z.string().optional(),

    // Snapshot config
    name: z.string().min(1).max(100),
    role: z.string().min(1).max(200),
    systemPrompt: z.string().min(1),
    llmProvider: z.string(),
    llmModel: z.string(),
    capabilities: z.array(z.string()).default([]),
    historyConfig: z.object({}).passthrough().optional(),
    tools: z.array(z.object({}).passthrough()).optional(),
    outputConfig: z.object({}).passthrough().optional(),
    robotId: z.enum(['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001']),

    // Canvas properties
    position: z.object({
        x: z.number(),
        y: z.number()
    }),
    isMinimized: z.boolean().default(false),
    isMaximized: z.boolean().default(false),
    zIndex: z.number().default(0)
});

const updateAgentInstanceSchema = createAgentInstanceSchema.partial();

// GET /api/workflows/:workflowId/instances - Liste des instances
router.get('/', requireAuth, async (req, res) => {
    try {
        const user = req.user as IUser;
        const { workflowId } = req.params;

        if (!workflowId || !mongoose.Types.ObjectId.isValid(workflowId)) {
            return res.status(400).json({ error: 'workflowId invalide' });
        }

        // Vérifier que workflow appartient à user
        const workflow = await Workflow.findOne({ _id: workflowId, userId: user.id });
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow introuvable' });
        }

        const instances = await AgentInstance.find({ workflowId });
        res.json(instances);
    } catch (error) {
        console.error('[AgentInstances] GET error:', error);
        res.status(500).json({ error: 'Erreur récupération instances' });
    }
});

// GET /api/agent-instances/:id - Instance spécifique
router.get('/:id',
    requireAuth,
    requireOwnershipAsync(async (req) => {
        const instance = await AgentInstance.findById(req.params.id);
        return instance ? instance.userId.toString() : null;
    }),
    async (req, res) => {
        try {
            const instance = await AgentInstance.findById(req.params.id);

            if (!instance) {
                return res.status(404).json({ error: 'Instance introuvable' });
            }

            res.json(instance);
        } catch (error) {
            console.error('[AgentInstances] GET/:id error:', error);
            res.status(500).json({ error: 'Erreur récupération instance' });
        }
    }
);

// POST /api/workflows/:workflowId/instances - Créer instance sur workflow
router.post('/',
    requireAuth,
    validateRequest(createAgentInstanceSchema),
    async (req, res) => {
        try {
            const user = req.user as IUser;
            const { workflowId } = req.params;
            const { prototypeId, ...instanceData } = req.body;
            
            if (!workflowId || !mongoose.Types.ObjectId.isValid(workflowId)) {
                return res.status(400).json({ error: 'workflowId invalide' });
            }

            // Vérifier que workflow appartient à user
            const workflow = await Workflow.findOne({ _id: workflowId, userId: user.id });
            if (!workflow) {
                return res.status(404).json({ error: 'Workflow introuvable' });
            }

            // Si prototypeId fourni, vérifier qu'il appartient à user
            if (prototypeId) {
                const prototype = await AgentPrototype.findOne({ _id: prototypeId, userId: user.id });
                if (!prototype) {
                    return res.status(404).json({ error: 'Prototype introuvable' });
                }
            }

            const instance = new AgentInstance({
                workflowId,
                userId: user.id,
                prototypeId: prototypeId || undefined,
                ...instanceData
            });

            await instance.save();

            // Marquer workflow comme dirty
            workflow.isDirty = true;
            await workflow.save();

            res.status(201).json(instance);
        } catch (error) {
            console.error('[AgentInstances] POST error:', error);
            res.status(500).json({ error: 'Erreur création instance' });
        }
    }
);

// POST /api/workflows/:workflowId/instances/from-prototype - Créer instance depuis prototype
router.post('/from-prototype', requireAuth, async (req, res) => {
    try {
        const user = req.user as IUser;
        const { workflowId } = req.params;
        const { prototypeId, position } = req.body;

        if (!workflowId || !mongoose.Types.ObjectId.isValid(workflowId)) {
            return res.status(400).json({ error: 'workflowId invalide' });
        }
        
        if (!prototypeId || !position) {
            return res.status(400).json({
                error: 'prototypeId et position requis'
            });
        }

        // Vérifier ownership prototype
        const prototype = await AgentPrototype.findOne({ _id: prototypeId, userId: user.id });
        if (!prototype) {
            return res.status(404).json({ error: 'Prototype introuvable' });
        }

        // Vérifier ownership workflow
        const workflow = await Workflow.findOne({ _id: workflowId, userId: user.id });
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow introuvable' });
        }

        // Créer instance avec snapshot du prototype
        const instance = new AgentInstance({
            workflowId,
            userId: user.id,
            prototypeId: prototype.id,

            // Snapshot config
            name: prototype.name,
            role: prototype.role,
            systemPrompt: prototype.systemPrompt,
            llmProvider: prototype.llmProvider,
            llmModel: prototype.llmModel,
            capabilities: prototype.capabilities,
            historyConfig: prototype.historyConfig,
            tools: prototype.tools,
            outputConfig: prototype.outputConfig,
            robotId: prototype.robotId,

            // Canvas properties
            position,
            isMinimized: false,
            isMaximized: false,
            zIndex: 0
        });

        await instance.save();

        // Marquer workflow comme dirty
        workflow.isDirty = true;
        await workflow.save();

        res.status(201).json(instance);
    } catch (error) {
        console.error('[AgentInstances] POST/from-prototype error:', error);
        res.status(500).json({ error: 'Erreur création instance depuis prototype' });
    }
});

// PUT /api/agent-instances/:id - Mettre à jour instance
router.put('/:id',
    requireAuth,
    requireOwnershipAsync(async (req) => {
        const instance = await AgentInstance.findById(req.params.id);
        return instance ? instance.userId.toString() : null;
    }),
    validateRequest(updateAgentInstanceSchema),
    async (req, res) => {
        try {
            const user = req.user as IUser;
            const instance = await AgentInstance.findOne({ _id: req.params.id, userId: user.id });

            if (!instance) {
                return res.status(404).json({ error: 'Instance introuvable' });
            }

            // Empêcher modification workflowId, userId
            delete req.body.workflowId;
            delete req.body.userId;

            Object.assign(instance, req.body);
            await instance.save();

            // Marquer workflow comme dirty
            const workflow = await Workflow.findById(instance.workflowId);
            if (workflow) {
                workflow.isDirty = true;
                await workflow.save();
            }

            res.json(instance);
        } catch (error) {
            console.error('[AgentInstances] PUT error:', error);
            res.status(500).json({ error: 'Erreur mise à jour instance' });
        }
    }
);

// DELETE /api/agent-instances/:id - Supprimer instance
router.delete('/:id',
    requireAuth,
    requireOwnershipAsync(async (req) => {
        const instance = await AgentInstance.findById(req.params.id);
        return instance ? instance.userId.toString() : null;
    }),
    async (req, res) => {
        try {
            const user = req.user as IUser;
            const instance = await AgentInstance.findOne({ _id: req.params.id, userId: user.id });

            if (!instance) {
                return res.status(404).json({ error: 'Instance introuvable' });
            }

            const workflowId = instance.workflowId;
            await instance.deleteOne();

            // Marquer workflow comme dirty
            const workflow = await Workflow.findById(workflowId);
            if (workflow) {
                workflow.isDirty = true;
                await workflow.save();
            }

            res.json({ message: 'Instance supprimée' });
        } catch (error) {
            console.error('[AgentInstances] DELETE error:', error);
            res.status(500).json({ error: 'Erreur suppression instance' });
        }
    }
);

export default router;
