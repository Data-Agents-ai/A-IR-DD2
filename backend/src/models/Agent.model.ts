import mongoose, { Document, Schema } from 'mongoose';

export interface IAgent extends Document {
    name: string;
    role: string;
    systemPrompt: string;
    llmProvider: string;
    llmModel: string;
    capabilities: string[];
    historyConfig?: object;
    tools?: object[];
    outputConfig?: object;
    creatorId: string; // RobotId (e.g., 'AR_001')
    ownerId: mongoose.Types.ObjectId; // FK → User
    createdAt: Date;
    updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>({
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
    creatorId: {
        type: String,
        required: true,
        enum: {
            values: ['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001'],
            message: 'RobotId invalide. Seuls AR_001, BOS_001, COM_001, PHIL_001, TIM_001 sont autorisés'
        },
        index: true
    },
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Index composé pour queries optimisées
AgentSchema.index({ ownerId: 1, creatorId: 1 });
AgentSchema.index({ ownerId: 1, createdAt: -1 });

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);
