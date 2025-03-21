import mongoose, { Schema } from 'mongoose';
import { IServerMetrics, IQueueMetrics } from '@repo/types';

export interface ServerMetricsDocument extends IServerMetrics {}
export interface QueueMetricsDocument extends IQueueMetrics {}

const ServerMetricsSchema = new Schema<ServerMetricsDocument>(
  {
    startTime: {
      type: Date,
      default: Date.now,
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    activeConnections: {
      type: Number,
      default: 0,
    },
    messagesProcessed: {
      type: Number,
      default: 0,
    },
    errorCount: {
      type: Number,
      default: 0,
    },
    avgResponseTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const QueueMetricsSchema = new Schema<QueueMetricsDocument>(
  {
    queueId: {
      type: String,
      required: true,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    messagesSent: {
      type: Number,
      default: 0,
    },
    messagesReceived: {
      type: Number,
      default: 0,
    },
    avgWaitTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);


export const ServerMetrics = mongoose.model<ServerMetricsDocument>('ServerMetrics', ServerMetricsSchema);
export const QueueMetrics = mongoose.model<QueueMetricsDocument>('QueueMetrics', QueueMetricsSchema); 