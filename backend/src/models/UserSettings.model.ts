/**
 * @file UserSettings.model.ts
 * @description User settings persistence (J4.3)
 * @domain Design Domain - User Preferences
 * 
 * ARCHITECTURE:
 * - One document per user (userId is unique key)
 * - Stores LLM configurations + user preferences
 * - Encrypted API keys (inherited from LLMConfig)
 * - Extensible for future preference fields
 * 
 * SOLID PRINCIPLES:
 * - S: Single Responsibility (only user settings)
 * - O: Open/Closed (easy to add new preference fields)
 * - L: Liskov Substitution (swappable storage backends)
 * - D: Dependency Inversion (abstraction layer in frontend)
 */

import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

/**
 * LLM Provider Configuration (per provider per user)
 */
export interface LLMProviderConfig {
    enabled: boolean;
    apiKeyEncrypted?: string; // AES-256-GCM encrypted
    capabilities: {
        [capability: string]: boolean;
    };
    lastUpdated: Date;
}

/**
 * User Preferences (language, theme, etc.)
 */
export interface UserPreferences {
    language: 'fr' | 'en' | 'de' | 'es' | 'pt';
    theme?: 'dark' | 'light';
}

/**
 * Complete UserSettings document
 */
export interface IUserSettings extends Document {
    userId: mongoose.Types.ObjectId;

    // LLM Configurations (J4.2+J4.3)
    llmConfigs: {
        [provider: string]: LLMProviderConfig;
    };

    // User Preferences (J4.3)
    preferences: UserPreferences;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    version: number;

    // Methods
    getDecryptedConfig(provider: string): LLMProviderConfig & { apiKey?: string };
    setEncryptedApiKey(provider: string, plainApiKey: string): void;
}

const userSettingsSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true
        },

        // LLM Configurations: flexible object with provider names as keys
        llmConfigs: {
            type: Schema.Types.Mixed,
            default: {},
            validate: {
                validator: function (v: any) {
                    // Basic validation: all values should have enabled flag
                    if (typeof v !== 'object') return false;
                    return Object.values(v).every((cfg: any) =>
                        'enabled' in cfg && 'capabilities' in cfg
                    );
                },
                message: 'Invalid LLM config structure'
            }
        },

        // User Preferences
        preferences: {
            language: {
                type: String,
                enum: ['fr', 'en', 'de', 'es', 'pt'],
                default: 'fr'
            },
            theme: {
                type: String,
                enum: ['dark', 'light'],
                default: 'dark'
            }
        },

        // Versioning for conflict resolution
        version: {
            type: Number,
            default: 1
        }
    },
    {
        timestamps: true,
        collection: 'user_settings'
    }
);

/**
 * Get decrypted configuration for a provider
 * Server-side decryption only
 */
userSettingsSchema.methods.getDecryptedConfig = function (
    provider: string
): LLMProviderConfig & { apiKey?: string } {
    const config = this.llmConfigs[provider];

    if (!config || !config.apiKeyEncrypted) {
        return {
            enabled: config?.enabled ?? false,
            capabilities: config?.capabilities ?? {},
            lastUpdated: config?.lastUpdated ?? new Date()
        };
    }

    try {
        const decrypted = decrypt(config.apiKeyEncrypted, this.userId.toString());
        return {
            ...config,
            apiKey: decrypted
        };
    } catch (err) {
        console.error('[UserSettings] Failed to decrypt API key:', err);
        return {
            enabled: config.enabled,
            capabilities: config.capabilities,
            lastUpdated: config.lastUpdated
        };
    }
};

/**
 * Set encrypted API key for a provider
 * Automatically encrypts before storing
 */
userSettingsSchema.methods.setEncryptedApiKey = function (
    provider: string,
    plainApiKey: string
): void {
    const encrypted = encrypt(plainApiKey, this.userId.toString());

    if (!this.llmConfigs[provider]) {
        this.llmConfigs[provider] = {
            enabled: false,
            capabilities: {},
            lastUpdated: new Date()
        };
    }

    this.llmConfigs[provider].apiKeyEncrypted = encrypted;
    this.llmConfigs[provider].lastUpdated = new Date();
};

/**
 * Indices for performance
 */
userSettingsSchema.index({ userId: 1 }, { unique: true });
userSettingsSchema.index({ updatedAt: 1 });

export const UserSettings = mongoose.model<IUserSettings>(
    'UserSettings',
    userSettingsSchema
);

export default UserSettings;
