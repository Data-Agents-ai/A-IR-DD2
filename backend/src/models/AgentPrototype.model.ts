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
        required: true,
        index: true
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
        required: true,
        trim: true,
        maxlength: 200
    },
    systemPrompt: {
        type: String,
        required: true,
        minlength: 1
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
            values: ['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001'],
            message: 'RobotId invalide. Seuls AR_001, BOS_001, COM_001, PHIL_001, TIM_001 sont autorisés'
        },
        index: true
    },
    isPrototype: {
        type: Boolean,
        default: true,
        immutable: true
    }
}, {
    timestamps: true
});

// Index pour queries optimisées
AgentPrototypeSchema.index({ userId: 1, createdAt: -1 });
AgentPrototypeSchema.index({ userId: 1, robotId: 1 });

export const AgentPrototype = mongoose.model<IAgentPrototype>('AgentPrototype', AgentPrototypeSchema);
