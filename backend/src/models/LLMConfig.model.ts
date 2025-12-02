import mongoose, { Document, Schema } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface ILLMConfig extends Document {
    userId: mongoose.Types.ObjectId;
    provider: string;
    enabled: boolean;
    apiKeyEncrypted: string;
    capabilities: Record<string, boolean>;
    createdAt: Date;
    updatedAt: Date;
    getDecryptedApiKey(): string;
    setApiKey(plainKey: string): void;
}

const LLMConfigSchema = new Schema<ILLMConfig>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    provider: {
        type: String,
        required: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    apiKeyEncrypted: {
        type: String,
        required: true
    },
    capabilities: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Unique constraint: 1 config par provider par user
LLMConfigSchema.index({ userId: 1, provider: 1 }, { unique: true });
// Index simple pour filtrage enabled (listing configs actives)
LLMConfigSchema.index({ enabled: 1 });

// Méthode: Déchiffrer API key
LLMConfigSchema.methods.getDecryptedApiKey = function (): string {
    return decrypt(this.apiKeyEncrypted, this.userId.toString());
};

// Méthode: Chiffrer et stocker API key
LLMConfigSchema.methods.setApiKey = function (plainKey: string): void {
    this.apiKeyEncrypted = encrypt(plainKey, this.userId.toString());
};

export const LLMConfig = mongoose.model<ILLMConfig>('LLMConfig', LLMConfigSchema);
