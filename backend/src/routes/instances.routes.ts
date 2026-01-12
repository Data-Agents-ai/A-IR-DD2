/**
 * @fileoverview Routes API pour les instances d'agents V2 (Lazy Loading)
 * 
 * Ces routes implémentent le pattern de chargement à la demande :
 * - GET /:id → Détails complets d'une instance (au clic sur un nœud)
 * - PATCH /:id → Mise à jour état/config runtime
 * - GET /:id/journals → Historique paginé (chat, erreurs, média)
 * - POST /:id/journals → Ajout d'entrée journal (runtime)
 * 
 * @see Guides/WIP/PERSISTANCES_ROUTES.md
 * @see backend/src/controllers/instance.controller.ts
 */

import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.middleware';
import {
    getInstance,
    updateInstance,
    getJournals,
    addJournalEntry,
    logChatMessage,
    logError,
    updateStatus
} from '../controllers/instance.controller';
import { IUser } from '../models/User.model';

const router = Router();

// ============================================
// MIDDLEWARE DE VALIDATION D'ID
// ============================================

/**
 * Middleware pour valider le format ObjectId
 */
const validateInstanceId = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            error: 'Invalid instance ID',
            message: 'The provided ID is not a valid MongoDB ObjectId',
            code: 'INVALID_INSTANCE_ID'
        });
    }
    
    next();
};

// ============================================
// ROUTES INSTANCES V2
// ============================================

/**
 * GET /api/instances/:id
 * 
 * Charge la configuration et l'état complet d'une instance d'agent.
 * Endpoint de lazy loading - appelé au clic sur un nœud du canvas.
 * 
 * Response: {
 *   _id, workflowId, prototypeId, name, role, robotId,
 *   configuration, persistenceConfig, state, status,
 *   createdAt, updatedAt
 * }
 */
router.get('/:id',
    requireAuth,
    validateInstanceId,
    (req: Request, res: Response) => getInstance(req as Request & { user: IUser }, res)
);

/**
 * PATCH /api/instances/:id
 * 
 * Met à jour l'état runtime ou la configuration d'une instance.
 * Utilisé pour :
 * - Changer le statut (idle → running, etc.)
 * - Sauvegarder la mémoire/variables courantes
 * - Modifier la configuration de persistance
 * 
 * Body: {
 *   state?: { memory?, variables?, currentTask? },
 *   status?: 'idle' | 'running' | 'error' | 'paused' | 'completed',
 *   persistenceConfig?: { saveChatHistory?, saveErrors?, ... }
 * }
 */
router.patch('/:id',
    requireAuth,
    validateInstanceId,
    (req: Request, res: Response) => updateInstance(req as Request & { user: IUser }, res)
);

/**
 * GET /api/instances/:id/journals
 * 
 * Récupère l'historique paginé d'une instance.
 * Supporte le filtrage par type et sévérité.
 * 
 * Query params:
 * - type: 'chat' | 'error' | 'media' | 'task' | 'system'
 * - severity: 'info' | 'warn' | 'error'
 * - page: number (défaut: 1)
 * - limit: number (défaut: 50, max: 100)
 * - startDate: ISO date string
 * - endDate: ISO date string
 * 
 * Response: {
 *   data: JournalEntry[],
 *   meta: { total, page, pages, limit }
 * }
 */
router.get('/:id/journals',
    requireAuth,
    validateInstanceId,
    (req: Request, res: Response) => getJournals(req as Request & { user: IUser }, res)
);

/**
 * POST /api/instances/:id/journals
 * 
 * Ajoute une entrée au journal d'une instance.
 * Respecte la configuration de persistance (peut être ignoré si désactivé).
 * 
 * Body: {
 *   type: 'chat' | 'error' | 'media' | 'task' | 'system',
 *   severity?: 'info' | 'warn' | 'error',
 *   payload: { ... },
 *   sessionId?: string
 * }
 * 
 * Response: {
 *   success: true,
 *   saved: boolean,
 *   entry?: { _id, type, timestamp }
 * }
 */
router.post('/:id/journals',
    requireAuth,
    validateInstanceId,
    (req: Request, res: Response) => addJournalEntry(req as Request & { user: IUser }, res)
);

// ============================================
// ROUTES SPÉCIALISÉES (Jalon 4)
// ============================================

/**
 * POST /api/instances/:id/chat
 * 
 * Endpoint optimisé pour journaliser un message de chat.
 * Utilise le JournalService avec logique conditionnelle.
 * 
 * Body: {
 *   role: 'user' | 'assistant' | 'system' | 'tool',
 *   content: string,
 *   model?: string,
 *   tokensUsed?: number,
 *   toolCalls?: Array<{ name, arguments, result? }>,
 *   sessionId?: string
 * }
 */
router.post('/:id/chat',
    requireAuth,
    validateInstanceId,
    (req: Request, res: Response) => logChatMessage(req as Request & { user: IUser }, res)
);

/**
 * POST /api/instances/:id/error
 * 
 * Endpoint optimisé pour journaliser une erreur.
 * Respecte la configuration saveErrors.
 * 
 * Body: {
 *   code: string,
 *   message: string,
 *   stack?: string,
 *   context?: object,
 *   recoverable?: boolean
 * }
 */
router.post('/:id/error',
    requireAuth,
    validateInstanceId,
    (req: Request, res: Response) => logError(req as Request & { user: IUser }, res)
);

/**
 * PATCH /api/instances/:id/status
 * 
 * Endpoint simplifié pour mettre à jour le statut d'une instance.
 * Utilisé pour marquer le début/fin d'une interaction.
 * 
 * Body: {
 *   status: 'idle' | 'running' | 'error' | 'paused' | 'completed'
 * }
 */
router.patch('/:id/status',
    requireAuth,
    validateInstanceId,
    (req: Request, res: Response) => updateStatus(req as Request & { user: IUser }, res)
);

export default router;
