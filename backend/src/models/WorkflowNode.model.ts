import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflowNode extends Document {
    ownerId: mongoose.Types.ObjectId; // FK → User
    nodeType: 'agent' | 'connection' | 'event' | 'file';
    nodeData: object;
    position: { x: number; y: number };
    metadata?: object;
    createdAt: Date;
    updatedAt: Date;
}

const WorkflowNodeSchema = new Schema<IWorkflowNode>({
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    nodeType: {
        type: String,
        enum: ['agent', 'connection', 'event', 'file'],
        required: true
    },
    nodeData: {
        type: Schema.Types.Mixed,
        required: true
    },
    position: {
        type: {
            x: { type: Number, required: true },
            y: { type: Number, required: true }
        },
        required: true
    },
    metadata: Schema.Types.Mixed
}, {
    timestamps: true,
    collection: 'workflow_nodes'
});

// Index pour queries utilisateur
WorkflowNodeSchema.index({ ownerId: 1, nodeType: 1 });
WorkflowNodeSchema.index({ ownerId: 1, createdAt: -1 });

export const WorkflowNode = mongoose.model<IWorkflowNode>('WorkflowNode', WorkflowNodeSchema);
