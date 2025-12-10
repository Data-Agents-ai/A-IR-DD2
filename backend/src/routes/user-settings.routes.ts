/**
 * @file user-settings.routes.ts
 * @description User settings persistence endpoints (J4.3)
 * @domain Design Domain - Bounded Context: Settings Management
 * 
 * ENDPOINTS:
 * - GET /api/user-settings (fetch user settings)
 * - POST /api/user-settings (save user settings atomically)
 * 
 * SECURITY:
 * - Requires Bearer token (JWT)
 * - userId from token validated
 * - API keys encrypted server-side
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import UserSettings, { IUserSettings } from '../models/UserSettings.model';
import { User } from '../models/User.model';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/user-settings
 * Fetch user settings (llmConfigs + preferences)
 * 
 * Response: {
 *   llmConfigs: { [provider]: { enabled, capabilities, lastUpdated } },
 *   preferences: { language, theme },
 *   updatedAt: Date
 * }
 */
router.get('/api/user-settings', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const userId = user.id || user._id;

        let settings = await UserSettings.findOne({ userId });

        // Initialize if doesn't exist
        if (!settings) {
            settings = new UserSettings({
                userId,
                llmConfigs: {},
                preferences: {
                    language: 'fr',
                    theme: 'dark'
                }
            });
            await settings.save();
        }

        // Return public view (no encrypted keys)
        res.json({
            llmConfigs: Object.entries(settings.llmConfigs).reduce(
                (acc, [provider, config]: [string, any]) => {
                    acc[provider] = {
                        enabled: config.enabled,
                        capabilities: config.capabilities,
                        lastUpdated: config.lastUpdated
                    };
                    return acc;
                },
                {} as Record<string, any>
            ),
            preferences: settings.preferences,
            updatedAt: settings.updatedAt
        });
    } catch (error) {
        console.error('[GET /api/user-settings] Error:', error);
        res.status(500).json({
            error: 'Failed to fetch user settings',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/user-settings
 * Save user settings atomically
 * 
 * Request body: {
 *   llmConfigs?: { [provider]: { enabled, apiKey?, capabilities } },
 *   preferences?: { language?, theme? }
 * }
 * 
 * Note: If apiKey provided, it will be encrypted before storage
 */
router.post('/api/user-settings', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const userId = user.id || user._id;
        const { llmConfigs, preferences } = req.body;

        let settings = await UserSettings.findOne({ userId });

        // Initialize if doesn't exist
        if (!settings) {
            settings = new UserSettings({
                userId,
                llmConfigs: {},
                preferences: {
                    language: 'fr',
                    theme: 'dark'
                }
            });
        }

        // Update LLM configs if provided
        if (llmConfigs && typeof llmConfigs === 'object') {
            Object.entries(llmConfigs).forEach(([provider, config]: [string, any]) => {
                if (config && typeof config === 'object') {
                    // Initialize provider config if new
                    if (!settings!.llmConfigs[provider]) {
                        settings!.llmConfigs[provider] = {
                            enabled: false,
                            capabilities: {},
                            lastUpdated: new Date()
                        };
                    }

                    // Update enabled flag
                    if ('enabled' in config) {
                        settings!.llmConfigs[provider].enabled = config.enabled;
                    }

                    // Handle API key encryption
                    if (config.apiKey) {
                        settings!.setEncryptedApiKey(provider, config.apiKey);
                    }

                    // Update capabilities
                    if (config.capabilities && typeof config.capabilities === 'object') {
                        settings!.llmConfigs[provider].capabilities = config.capabilities;
                    }

                    // Update timestamp
                    settings!.llmConfigs[provider].lastUpdated = new Date();
                }
            });
        }

        // Update preferences if provided
        if (preferences && typeof preferences === 'object') {
            if ('language' in preferences && preferences.language) {
                settings.preferences.language = preferences.language;
            }
            if ('theme' in preferences && preferences.theme) {
                settings.preferences.theme = preferences.theme;
            }
        }

        // Increment version for conflict detection
        settings.version = (settings.version || 0) + 1;

        // Save atomically
        await settings.save();

        // Return public view (no encrypted keys)
        res.json({
            llmConfigs: Object.entries(settings.llmConfigs).reduce(
                (acc, [provider, config]: [string, any]) => {
                    acc[provider] = {
                        enabled: config.enabled,
                        capabilities: config.capabilities,
                        lastUpdated: config.lastUpdated
                    };
                    return acc;
                },
                {} as Record<string, any>
            ),
            preferences: settings.preferences,
            updatedAt: settings.updatedAt
        });
    } catch (error) {
        console.error('[POST /api/user-settings] Error:', error);
        res.status(500).json({
            error: 'Failed to save user settings',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
