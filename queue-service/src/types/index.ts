export interface IMessage {
  id: string;
  data: unknown;
  createdAt: Date;
  queueId: string;
  visible: boolean;
  visibleAt?: Date;
  expiresAt: Date;
  receivedCount: number;
}

export interface IQueue {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  retentionPeriod: number;
  schema?: Record<string, unknown>;
  pushEndpoint?: string;
}

export interface ITopic {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  subscribedQueues: string[];
}

export interface IUser {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
}

export interface IServerMetrics {
  startTime: Date;
  totalRequests: number;
  activeConnections: number;
  messagesProcessed: number;
  errorCount: number;
  avgResponseTime: number;
}

export interface IQueueMetrics {
  queueId: string;
  messageCount: number;
  messagesSent: number;
  messagesReceived: number;
  avgWaitTime: number;
}

export interface IDecodedToken {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}