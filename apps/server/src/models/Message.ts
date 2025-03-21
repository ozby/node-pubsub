import mongoose, { Schema } from 'mongoose';
import { IMessage } from '@repo/types';
import { QueueMetrics } from './Metrics';

export interface MessageDocument extends IMessage { }

const MessageSchema = new Schema<IMessage>(
  {
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    queueId: {
      type: String,
      required: true,
      index: true,
    },
    received: {
      type: Boolean,
      default: false,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    receivedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

MessageSchema.post('save', async function (doc: MessageDocument) {
  const isNew = doc.createdAt === doc.updatedAt;
  if (isNew) {
    await QueueMetrics.findOneAndUpdate(
      { queueId: doc.queueId },
      {
        $inc: {
          messageCount: 1,
          messagesSent: 1,
        },
      },
      { upsert: true, new: true }
    );
  }
});

MessageSchema.post('findOneAndUpdate', async function (doc) {
  if (doc && doc.received && doc.receivedCount === 1) {
    await QueueMetrics.findOneAndUpdate(
      { queueId: doc.queueId },
      {
        $inc: {
          messagesReceived: 1,
        },
      },
      { new: true }
    );
  }
});

MessageSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await QueueMetrics.findOneAndUpdate(
      { queueId: doc.queueId },
      {
        $inc: {
          messageCount: -1,
        },
      },
      { new: true }
    );
  }
});

export default mongoose.model<MessageDocument>('Message', MessageSchema); 