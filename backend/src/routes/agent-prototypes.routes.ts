import { Router } from 'express';
import { z } from 'zod';
import { AgentPrototype } from '../models/AgentPrototype.model';
import { requireAuth, requireOwnershipAsync } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { IUser } from '../models/User.model';

const router = Router();

// Schema validation
const createAgentPrototypeSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(200),
  systemPrompt: z.string().min(1),
  llmProvider: z.string(),
  llmModel: z.string(),
  capabilities: z.array(z.string()).default([]),
  historyConfig: z.object({}).passthrough().optional(),
  tools: z.array(z.object({}).passthrough()).optional(),
  outputConfig: z.object({}).passthrough().optional(),
  robotId: z.enum(['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001'])
});

const updateAgentPrototypeSchema = createAgentPrototypeSchema.partial();

// GET /api/agent-prototypes - Liste des prototypes (GLOBAL à tous workflows)
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user as IUser;
    const { robotId } = req.query;
    
    const query: any = { userId: user.id };
    if (robotId) {
      query.robotId = robotId;
    }
    
    const prototypes = await AgentPrototype.find(query).sort({ createdAt: -1 });
    res.json(prototypes);
  } catch (error) {
    console.error('[AgentPrototypes] GET error:', error);
    res.status(500).json({ error: 'Erreur récupération prototypes' });
  }
});

// GET /api/agent-prototypes/:id - Prototype spécifique
router.get('/:id',
  requireAuth,
  requireOwnershipAsync(async (req) => {
    const prototype = await AgentPrototype.findById(req.params.id);
    return prototype ? prototype.userId.toString() : null;
  }),
  async (req, res) => {
    try {
      const prototype = await AgentPrototype.findById(req.params.id);
      
      if (!prototype) {
        return res.status(404).json({ error: 'Prototype introuvable' });
      }
      
      res.json(prototype);
    } catch (error) {
      console.error('[AgentPrototypes] GET/:id error:', error);
      res.status(500).json({ error: 'Erreur récupération prototype' });
    }
  }
);

// POST /api/agent-prototypes - Créer prototype (gouvernance minimale : ownership-based)
router.post('/', 
  requireAuth, 
  validateRequest(createAgentPrototypeSchema), 
  async (req, res) => {
    try {
      const user = req.user as IUser;
      
      const prototype = new AgentPrototype({
        userId: user.id,
        ...req.body
      });
      
      await prototype.save();
      
      res.status(201).json(prototype);
    } catch (error) {
      console.error('[AgentPrototypes] POST error:', error);
      res.status(500).json({ error: 'Erreur création prototype' });
    }
  }
);

// PUT /api/agent-prototypes/:id - Mettre à jour prototype
router.put('/:id',
  requireAuth,
  requireOwnershipAsync(async (req) => {
    const prototype = await AgentPrototype.findById(req.params.id);
    return prototype ? prototype.userId.toString() : null;
  }),
  validateRequest(updateAgentPrototypeSchema),
  async (req, res) => {
    try {
      const user = req.user as IUser;
      const prototype = await AgentPrototype.findOne({ _id: req.params.id, userId: user.id });
      
      if (!prototype) {
        return res.status(404).json({ error: 'Prototype introuvable' });
      }
      
      // Empêcher modification userId
      delete req.body.userId;
      
      Object.assign(prototype, req.body);
      await prototype.save();
      
      res.json(prototype);
    } catch (error) {
      console.error('[AgentPrototypes] PUT error:', error);
      res.status(500).json({ error: 'Erreur mise à jour prototype' });
    }
  }
);

// DELETE /api/agent-prototypes/:id - Supprimer prototype
// Note: Les AgentInstances gardent leur snapshot, pas de cascade delete
router.delete('/:id',
  requireAuth,
  requireOwnershipAsync(async (req) => {
    const prototype = await AgentPrototype.findById(req.params.id);
    return prototype ? prototype.userId.toString() : null;
  }),
  async (req, res) => {
    try {
      const user = req.user as IUser;
      const prototype = await AgentPrototype.findOne({ _id: req.params.id, userId: user.id });
      
      if (!prototype) {
        return res.status(404).json({ error: 'Prototype introuvable' });
      }
      
      await prototype.deleteOne();
      
      res.json({ message: 'Prototype supprimé' });
    } catch (error) {
      console.error('[AgentPrototypes] DELETE error:', error);
      res.status(500).json({ error: 'Erreur suppression prototype' });
    }
  }
);

export default router;
