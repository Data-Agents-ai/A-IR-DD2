import { Router } from 'express';
import { z } from 'zod';
import { Workflow } from '../models/Workflow.model';
import { AgentInstance } from '../models/AgentInstance.model';
import { WorkflowEdge } from '../models/WorkflowEdge.model';
import { requireAuth, requireOwnershipAsync } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { IUser } from '../models/User.model';

const router = Router();

// Schema validation
const createWorkflowSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional()
});

const updateWorkflowSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional()
});

// GET /api/workflows - Liste des workflows de l'utilisateur
router.get('/', requireAuth, async (req, res) => {
    try {
        const user = req.user as IUser;
        const workflows = await Workflow.find({ userId: user.id }).sort({ updatedAt: -1 });

        // Enrichir avec nombre d'agents par workflow
        const workflowsWithCounts = await Promise.all(
            workflows.map(async (workflow) => {
                const agentCount = await AgentInstance.countDocuments({ workflowId: workflow.id });
                return {
                    ...workflow.toObject(),
                    agentCount
                };
            })
        );

        res.json(workflowsWithCounts);
    } catch (error) {
        console.error('[Workflows] GET error:', error);
        res.status(500).json({ error: 'Erreur récupération workflows' });
    }
});

// GET /api/workflows/:id - Workflow spécifique avec agents et edges
router.get('/:id',
    requireAuth,
    requireOwnershipAsync(async (req) => {
        const workflow = await Workflow.findById(req.params.id);
        return workflow ? workflow.userId.toString() : null;
    }),
    async (req, res) => {
        try {
            const workflow = await Workflow.findById(req.params.id);

            if (!workflow) {
                return res.status(404).json({ error: 'Workflow introuvable' });
            }

            // Charger agents et edges du workflow
            const [agents, edges] = await Promise.all([
                AgentInstance.find({ workflowId: workflow.id }),
                WorkflowEdge.find({ workflowId: workflow.id })
            ]);

            res.json({
                workflow,
                agents,
                edges
            });
        } catch (error) {
            console.error('[Workflows] GET/:id error:', error);
            res.status(500).json({ error: 'Erreur récupération workflow' });
        }
    }
);

// POST /api/workflows - Créer nouveau workflow
router.post('/', requireAuth, validateRequest(createWorkflowSchema), async (req, res) => {
    try {
        const user = req.user as IUser;

        // Si c'est le premier workflow, le marquer comme actif
        const existingCount = await Workflow.countDocuments({ userId: user.id });

        const workflow = new Workflow({
            userId: user.id,
            name: req.body.name,
            description: req.body.description,
            isActive: existingCount === 0,
            isDirty: false
        });

        await workflow.save();

        res.status(201).json(workflow);
    } catch (error) {
        console.error('[Workflows] POST error:', error);
        res.status(500).json({ error: 'Erreur création workflow' });
    }
});

// PUT /api/workflows/:id - Mettre à jour workflow
router.put('/:id',
    requireAuth,
    requireOwnershipAsync(async (req) => {
        const workflow = await Workflow.findById(req.params.id);
        return workflow ? workflow.userId.toString() : null;
    }),
    validateRequest(updateWorkflowSchema),
    async (req, res) => {
        try {
            const user = req.user as IUser;
            const workflow = await Workflow.findOne({ _id: req.params.id, userId: user.id });

            if (!workflow) {
                return res.status(404).json({ error: 'Workflow introuvable' });
            }

            // Si on active ce workflow, désactiver les autres
            if (req.body.isActive === true) {
                await Workflow.updateMany(
                    { userId: user.id, _id: { $ne: workflow.id } },
                    { isActive: false }
                );
            }

            Object.assign(workflow, req.body);
            workflow.lastSavedAt = new Date();
            workflow.isDirty = false;

            await workflow.save();

            res.json(workflow);
        } catch (error) {
            console.error('[Workflows] PUT error:', error);
            res.status(500).json({ error: 'Erreur mise à jour workflow' });
        }
    }
);

// DELETE /api/workflows/:id - Supprimer workflow (cascade)
router.delete('/:id',
    requireAuth,
    requireOwnershipAsync(async (req) => {
        const workflow = await Workflow.findById(req.params.id);
        return workflow ? workflow.userId.toString() : null;
    }),
    async (req, res) => {
        try {
            const user = req.user as IUser;
            const workflow = await Workflow.findOne({ _id: req.params.id, userId: user.id });

            if (!workflow) {
                return res.status(404).json({ error: 'Workflow introuvable' });
            }

            // Cascade delete: supprimer agents et edges
            const [agentsDeleted, edgesDeleted] = await Promise.all([
                AgentInstance.deleteMany({ workflowId: workflow.id }),
                WorkflowEdge.deleteMany({ workflowId: workflow.id })
            ]);

            await workflow.deleteOne();

            res.json({
                message: 'Workflow supprimé avec succès',
                agentsDeleted: agentsDeleted.deletedCount,
                edgesDeleted: edgesDeleted.deletedCount
            });
        } catch (error) {
            console.error('[Workflows] DELETE error:', error);
            res.status(500).json({ error: 'Erreur suppression workflow' });
        }
    }
);

// POST /api/workflows/:id/save - Sauvegarder état workflow (reset isDirty)
router.post('/:id/save',
    requireAuth,
    requireOwnershipAsync(async (req) => {
        const workflow = await Workflow.findById(req.params.id);
        return workflow ? workflow.userId.toString() : null;
    }),
    async (req, res) => {
        try {
            const user = req.user as IUser;
            const workflow = await Workflow.findOne({ _id: req.params.id, userId: user.id });

            if (!workflow) {
                return res.status(404).json({ error: 'Workflow introuvable' });
            }

            workflow.lastSavedAt = new Date();
            workflow.isDirty = false;
            await workflow.save();

            res.json({
                message: 'Workflow sauvegardé',
                lastSavedAt: workflow.lastSavedAt
            });
        } catch (error) {
            console.error('[Workflows] POST/:id/save error:', error);
            res.status(500).json({ error: 'Erreur sauvegarde workflow' });
        }
    }
);

// POST /api/workflows/:id/mark-dirty - Marquer workflow comme modifié
router.post('/:id/mark-dirty',
    requireAuth,
    requireOwnershipAsync(async (req) => {
        const workflow = await Workflow.findById(req.params.id);
        return workflow ? workflow.userId.toString() : null;
    }),
    async (req, res) => {
        try {
            const user = req.user as IUser;
            const workflow = await Workflow.findOne({ _id: req.params.id, userId: user.id });

            if (!workflow) {
                return res.status(404).json({ error: 'Workflow introuvable' });
            }

            workflow.isDirty = true;
            await workflow.save();

            res.json({ message: 'Workflow marqué comme modifié' });
        } catch (error) {
            console.error('[Workflows] POST/:id/mark-dirty error:', error);
            res.status(500).json({ error: 'Erreur marquage workflow' });
        }
    }
);

export default router;
