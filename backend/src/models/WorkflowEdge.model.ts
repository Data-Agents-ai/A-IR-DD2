import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflowEdge extends Document {
    workflowId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    sourceInstanceId: mongoose.Types.ObjectId;
    targetInstanceId: mongoose.Types.ObjectId;
    sourceHandle?: string;
    targetHandle?: string;
    edgeType: 'default' | 'step' | 'smoothstep' | 'straight';
    animated: boolean;
    label?: string;
    createdAt: Date;
    updatedAt: Date;
}

const WorkflowEdgeSchema = new Schema<IWorkflowEdge>({
    workflowId: {
        type: Schema.Types.ObjectId,
        ref: 'Workflow',
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sourceInstanceId: {
        type: Schema.Types.ObjectId,
        ref: 'AgentInstance',
        required: true
    },
    targetInstanceId: {
        type: Schema.Types.ObjectId,
        ref: 'AgentInstance',
        required: true
    },
    sourceHandle: String,
    targetHandle: String,
    edgeType: {
        type: String,
        enum: ['default', 'step', 'smoothstep', 'straight'],
        default: 'default'
    },
    animated: {
        type: Boolean,
        default: false
    },
    label: String
}, {
    timestamps: true
});

// Index pour queries optimisées
WorkflowEdgeSchema.index({ workflowId: 1 });
WorkflowEdgeSchema.index({ sourceInstanceId: 1 });
WorkflowEdgeSchema.index({ targetInstanceId: 1 });

export const WorkflowEdge = mongoose.model<IWorkflowEdge>('WorkflowEdge', WorkflowEdgeSchema);
