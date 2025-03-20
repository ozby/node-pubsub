import mongoose, { Schema } from 'mongoose';
import { ITopic } from '@ozby-pubsub/types';

export interface TopicDocument extends ITopic {}

const TopicSchema = new Schema<TopicDocument>(
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
    subscribedQueues: {
      type: [String],
      default: [],
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


export default mongoose.model<TopicDocument>('Topic', TopicSchema); 