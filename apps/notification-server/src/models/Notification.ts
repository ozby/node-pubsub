import mongoose, { Schema, Document } from 'mongoose';

// Define the specific types for payload contents
interface UpdateDescription {
  updatedFields?: Record<string, unknown>;
  removedFields?: string[];
}

export interface INotification extends Omit<Document, 'collection'> {
  event: string;
  documentId: string;
  collection: string;
  operationType: string;
  payload: {
    fullDocument?: Record<string, unknown>;
    updateDescription?: UpdateDescription;
    resumeToken?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    event: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    collection: {
      type: String,
      required: true,
      index: true,
    },
    operationType: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    error: String,
    processedAt: Date,
  },
  { timestamps: true }
);

// Create compound indices for efficient querying
NotificationSchema.index({ collection: 1, status: 1 });
NotificationSchema.index({ event: 1, status: 1 });
NotificationSchema.index({ createdAt: 1 });

// Transform the document when converting to JSON
NotificationSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model<INotification>('Notification', NotificationSchema); 