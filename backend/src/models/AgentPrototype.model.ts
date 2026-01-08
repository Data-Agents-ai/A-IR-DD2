import mongoose, { Document, Schema } from 'mongoose';

export interface IAgentPrototype extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    role: string;
    systemPrompt: string;
    llmProvider: string;
    llmModel: string;
    capabilities: string[];
    historyConfig?: object;
    tools?: object[];
    outputConfig?: object;
    robotId: string;
    isPrototype: true;
    createdAt: Date;
    updatedAt: Date;
}

const AgentPrototypeSchema = new Schema<IAgentPrototype>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
        // Removed: index: true (conflicts with composite indexes below)
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },
    role: {
        type: String,
        required: false,  // ⭐ J4.5: Allow empty role
        trim: true,
        maxlength: 200,
        default: ''
    },
    systemPrompt: {
        type: String,
        required: false,  // ⭐ J4.5: Allow empty systemPrompt
        default: ''
    },
    llmProvider: {
        type: String,
        required: true
    },
    llmModel: {
        type: String,
        required: true
    },
    capabilities: [{
        type: String
    }],
    historyConfig: Schema.Types.Mixed,
    tools: [Schema.Types.Mixed],
    outputConfig: Schema.Types.Mixed,
    robotId: {
        type: String,
        required: true,
        enum: {
            // ⭐ J4.5: Must match frontend RobotId enum in types.ts
            values: ['AR_001', 'BO_002', 'CO_003', 'PH_004', 'TI_005'],
            message: 'RobotId invalide. Seuls AR_001, BO_002, CO_003, PH_004, TI_005 sont autorisés'
        }
        // Removed: index: true (used in composite index with userId)
    },
    isPrototype: {
        type: Boolean,
        default: true,
        immutable: true
    }
}, {
    timestamps: true,
    collection: 'agent_prototypes'
});

// Index pour queries optimisées
AgentPrototypeSchema.index({ userId: 1, createdAt: -1 });
AgentPrototypeSchema.index({ userId: 1, robotId: 1 });

export const AgentPrototype = mongoose.model<IAgentPrototype>('AgentPrototype', AgentPrototypeSchema);
