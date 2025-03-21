import mongoose, { Schema } from 'mongoose';
import { IQueue } from '@repo/types';
import config from '../config';

export interface QueueDocument extends IQueue {}

const QueueSchema = new Schema<IQueue>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    retentionPeriod: {
      type: Number,
      default: config.defaultRetentionPeriod,
      min: 1,
    },
    schema: {
      type: Schema.Types.Mixed,
      default: null,
    },
    pushEndpoint: {
      type: String,
      default: null,
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


export default mongoose.model<QueueDocument>('Queue', QueueSchema); 