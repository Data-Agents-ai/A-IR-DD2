import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { LLMConfig } from '../models/LLMConfig.model';
// NOTE J4.4: UserSettings import REMOVED - llmConfigs field no longer exists
import { requireAuth, requireOwnershipAsync } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

/**
 * Schema validation pour upsert config LLM
 */
const upsertConfigSchema = z.object({
    provider: z.enum([
        'Gemini',
        'OpenAI',
        'Mistral',
        'Anthropic',
        'Grok',
        'Perplexity',
        'Qwen',
        'Kimi K2',
        'DeepSeek',
        'LLM local (on premise)',
        'Arc-LLM'
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
        // ⭐ J4.4: Return masked apiKey string (points) if key exists, to preserve length info
        const safeConfigs = configs.map(c => {
            // If encrypted key exists, create a masked string of same length
            // This allows frontend to show password field with correct visual length
            let maskedApiKey = '';
            if (c.apiKeyEncrypted) {
                // Decrypt to get real length, then mask
                try {
                    const decrypted = c.getDecryptedApiKey();
                    maskedApiKey = '•'.repeat(decrypted.length);
                } catch (err) {
                    // Fallback if decryption fails
                    maskedApiKey = '••••••••••••••••••••'; // 20 points default
                }
            }

            return {
                id: c._id.toString(),
                provider: c.provider,
                enabled: c.enabled,
                apiKey: maskedApiKey, // ⭐ J4.4: Empty if no key, masked if key exists
                capabilities: c.capabilities,
                hasApiKey: !!c.apiKeyEncrypted,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt
            };
        });

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
        const userId = user.id || user._id;
        const { provider, apiKey, enabled, capabilities } = req.body;

        // ⭐ J4.5 FIX: Detect masked API key (•••) and skip update if masked
        // When frontend loads settings, it receives masked keys for display
        // If user saves without changing the key, we receive the masked string
        // We must NOT store the masked string - keep the original encrypted key
        const isMaskedKey = apiKey && apiKey.includes('•');

        // Upsert: chercher config existante
        let config = await LLMConfig.findOne({ userId, provider });

        if (config) {
            // Update existant
            config.enabled = enabled;
            config.capabilities = capabilities;
            
            // ⭐ J4.5 FIX: Only update API key if it's a real key, not masked
            if (!isMaskedKey) {
                config.setApiKey(apiKey); // Chiffrement automatique
                console.log(`[LLMConfig] Updated config for user ${userId}, provider ${provider} (with new API key)`);
            } else {
                console.log(`[LLMConfig] Updated config for user ${userId}, provider ${provider} (API key unchanged - masked)`);
            }
            
            await config.save();
        } else {
            // Nouveau - masked key not allowed for new configs
            if (isMaskedKey) {
                return res.status(400).json({ error: 'API key invalide (clé masquée détectée)' });
            }
            
            config = new LLMConfig({
                userId,
                provider,
                enabled,
                capabilities
            });
            config.setApiKey(apiKey); // Chiffrement automatique
            await config.save();

            console.log(`[LLMConfig] Created config for user ${userId}, provider ${provider}`);
        }

        // NOTE J4.4: UserSettings.llmConfigs sync REMOVED 
        // llm_configs collection is now the SINGLE source of truth
        // UserSettings only contains preferences (language, theme)

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
        const userId = user.id || user._id;
        const { provider } = req.params;

        const result = await LLMConfig.deleteOne({ userId, provider });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Config LLM introuvable' });
        }

        // NOTE J4.4: UserSettings.llmConfigs sync REMOVED
        // llm_configs collection is now the SINGLE source of truth

        console.log(`[LLMConfig] Deleted config for user ${userId}, provider ${provider}`);
        res.json({ message: 'Config LLM supprimée' });
    } catch (error) {
        console.error('[LLMConfig] DELETE error:', error);
        res.status(500).json({ error: 'Erreur suppression config LLM' });
    }
});

export default router;
