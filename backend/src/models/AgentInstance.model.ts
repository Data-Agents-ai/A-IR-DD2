import mongoose, { Document, Schema } from 'mongoose';

export interface IAgentInstance extends Document {
    workflowId: mongoose.Types.ObjectId; // FK → Workflow (LOCAL)
    userId: mongoose.Types.ObjectId; // FK → User (dénormalisé pour queries)
    prototypeId?: mongoose.Types.ObjectId; // FK → AgentPrototype (optionnel)

    // Snapshot config (copie indépendante du prototype)
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

    // Canvas properties
    position: { x: number; y: number };
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;

    createdAt: Date;
    updatedAt: Date;
}

const AgentInstanceSchema = new Schema<IAgentInstance>({
    workflowId: {
        type: Schema.Types.ObjectId,
        ref: 'Workflow',
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    prototypeId: {
        type: Schema.Types.ObjectId,
        ref: 'AgentPrototype'
    },

    // Snapshot config
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true
    },
    systemPrompt: {
        type: String,
        required: true
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
        enum: ['AR_001', 'BOS_001', 'COM_001', 'PHIL_001', 'TIM_001']
    },

    // Canvas properties
    position: {
        type: {
            x: { type: Number, required: true },
            y: { type: Number, required: true }
        },
        required: true
    },
    isMinimized: {
        type: Boolean,
        default: false
    },
    isMaximized: {
        type: Boolean,
        default: false
    },
    zIndex: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index composés pour queries optimisées
AgentInstanceSchema.index({ workflowId: 1, createdAt: -1 });
AgentInstanceSchema.index({ userId: 1, workflowId: 1 });
AgentInstanceSchema.index({ prototypeId: 1 });

export const AgentInstance = mongoose.model<IAgentInstance>('AgentInstance', AgentInstanceSchema);
