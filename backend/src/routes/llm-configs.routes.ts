import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { LLMConfig } from '../models/LLMConfig.model.js';
import { requireAuth, requireOwnershipAsync } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';

const router = Router();

/**
 * Schema validation pour upsert config LLM
 */
const upsertConfigSchema = z.object({
    provider: z.enum([
        'OpenAI',
        'Anthropic',
        'Gemini',
        'Mistral',
        'DeepSeek',
        'Grok',
        'Perplexity',
        'Qwen',
        'Kimi',
        'LMStudio'
    ]),
    enabled: z.boolean(),
    apiKey: z.string().min(1, 'API key requise'), // En clair, sera chiffrée
    capabilities: z.record(z.boolean()).optional().default({})
});

/**
 * GET /api/llm-configs
 * Liste configs LLM utilisateur (API keys JAMAIS retournées)
 * 
 * Query params:
 * - enabled: true/false (optionnel) - filtrer par statut
 * 
 * Response:
 * [
 *   {
 *     id: string,
 *     provider: string,
 *     enabled: boolean,
 *     capabilities: object,
 *     hasApiKey: boolean,
 *     updatedAt: Date
 *   }
 * ]
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { enabled } = req.query;

        // Build query
        const query: any = { userId: user.id };
        if (enabled !== undefined) {
            query.enabled = enabled === 'true';
        }

        const configs = await LLMConfig.find(query).sort({ provider: 1 });

        // SÉCURITÉ CRITIQUE: Ne JAMAIS retourner les API keys
        const safeConfigs = configs.map(c => ({
            id: c._id.toString(),
            provider: c.provider,
            enabled: c.enabled,
            capabilities: c.capabilities,
            hasApiKey: !!c.apiKeyEncrypted,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        }));

        res.json(safeConfigs);
    } catch (error) {
        console.error('[LLMConfig] GET error:', error);
        res.status(500).json({ error: 'Erreur récupération configs LLM' });
    }
});

/**
 * GET /api/llm-configs/:provider
 * Config LLM spécifique par provider (API key JAMAIS retournée)
 * 
 * Response:
 * {
 *   id: string,
 *   provider: string,
 *   enabled: boolean,
 *   capabilities: object,
 *   hasApiKey: boolean,
 *   updatedAt: Date
 * }
 */
router.get('/:provider', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { provider } = req.params;

        const config = await LLMConfig.findOne({ userId: user.id, provider });

        if (!config) {
            return res.status(404).json({ error: 'Config LLM introuvable' });
        }

        // SÉCURITÉ: Ne JAMAIS retourner l'API key
        res.json({
            id: config._id.toString(),
            provider: config.provider,
            enabled: config.enabled,
            capabilities: config.capabilities,
            hasApiKey: !!config.apiKeyEncrypted,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt
        });
    } catch (error) {
        console.error('[LLMConfig] GET :provider error:', error);
        res.status(500).json({ error: 'Erreur récupération config LLM' });
    }
});

/**
 * POST /api/llm-configs
 * Créer ou mettre à jour config LLM (upsert)
 * 
 * Body:
 * {
 *   provider: string,
 *   enabled: boolean,
 *   apiKey: string (en clair, sera chiffrée),
 *   capabilities: object
 * }
 * 
 * Response:
 * {
 *   id: string,
 *   provider: string,
 *   enabled: boolean,
 *   capabilities: object,
 *   hasApiKey: true,
 *   updatedAt: Date
 * }
 */
router.post('/', requireAuth, validateRequest(upsertConfigSchema), async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { provider, apiKey, enabled, capabilities } = req.body;

        // Upsert: chercher config existante
        let config = await LLMConfig.findOne({ userId: user.id, provider });

        if (config) {
            // Update existant
            config.enabled = enabled;
            config.capabilities = capabilities;
            config.setApiKey(apiKey); // Chiffrement automatique
            await config.save();

            console.log(`[LLMConfig] Updated config for user ${user.id}, provider ${provider}`);
        } else {
            // Nouveau
            config = new LLMConfig({
                userId: user.id,
                provider,
                enabled,
                capabilities
            });
            config.setApiKey(apiKey); // Chiffrement automatique
            await config.save();

            console.log(`[LLMConfig] Created config for user ${user.id}, provider ${provider}`);
        }

        // Response sécurisée (sans API key)
        res.json({
            id: config._id.toString(),
            provider: config.provider,
            enabled: config.enabled,
            capabilities: config.capabilities,
            hasApiKey: true,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt
        });
    } catch (error) {
        console.error('[LLMConfig] POST error:', error);

        // Erreur unique constraint
        if ((error as any).code === 11000) {
            return res.status(409).json({ error: 'Config déjà existante pour ce provider' });
        }

        res.status(500).json({ error: 'Erreur sauvegarde config LLM' });
    }
});

/**
 * DELETE /api/llm-configs/:provider
 * Supprimer config LLM par provider
 * 
 * Response:
 * {
 *   message: string
 * }
 */
router.delete('/:provider', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const { provider } = req.params;

        const result = await LLMConfig.deleteOne({ userId: user.id, provider });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Config LLM introuvable' });
        }

        console.log(`[LLMConfig] Deleted config for user ${user.id}, provider ${provider}`);
        res.json({ message: 'Config LLM supprimée' });
    } catch (error) {
        console.error('[LLMConfig] DELETE error:', error);
        res.status(500).json({ error: 'Erreur suppression config LLM' });
    }
});

export default router;
