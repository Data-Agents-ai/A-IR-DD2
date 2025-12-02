import mongoose, { Document, Schema } from 'mongoose';

export interface IAgentInstance extends Document {
    prototypeId: mongoose.Types.ObjectId; // FK → Agent
    ownerId: mongoose.Types.ObjectId; // FK → User (pour queries)
    name: string;
    position: { x: number; y: number };
    isMinimized: boolean;
    isMaximized: boolean;
    configurationJson: object; // Deep clone du prototype
    createdAt: Date;
    updatedAt: Date;
}

const AgentInstanceSchema = new Schema<IAgentInstance>({
    prototypeId: {
        type: Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true
    },
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
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
    configurationJson: {
        type: Schema.Types.Mixed,
        required: true
    }
}, {
    timestamps: true
});

// Index pour cascade delete et queries utilisateur
AgentInstanceSchema.index({ prototypeId: 1 });
AgentInstanceSchema.index({ ownerId: 1, createdAt: -1 });

export const AgentInstance = mongoose.model<IAgentInstance>('AgentInstance', AgentInstanceSchema);
