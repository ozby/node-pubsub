import mongoose, { Schema } from 'mongoose';
import { IMessage } from '../types';
import config from '../config';

export interface MessageDocument extends IMessage {}

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
    visible: {
      type: Boolean,
      default: true,
      index: true,
    },
    visibleAt: {
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


MessageSchema.pre('save', async function (next) {
  if (this.isNew) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + config.defaultRetentionPeriod);
    this.expiresAt = expirationDate;
  }
  next();
});

export default mongoose.model<MessageDocument>('Message', MessageSchema); 