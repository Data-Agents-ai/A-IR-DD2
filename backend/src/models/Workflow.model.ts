import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflow extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  lastSavedAt?: Date;
  isDirty: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>({
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
  description: {
    type: String,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: false
  },
  lastSavedAt: Date,
  isDirty: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index: Un seul workflow actif par user
WorkflowSchema.index({ userId: 1, isActive: 1 });
WorkflowSchema.index({ userId: 1, updatedAt: -1 });

export const Workflow = mongoose.model<IWorkflow>('Workflow', WorkflowSchema);
