import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import User from '../../../models/User';
import Queue from '../../../models/Queue';
import Topic from '../../../models/Topic';
import Message from '../../../models/Message';
import dashboardRoutes from '../../../routes/dashboard';
import queueRoutes from '../../../routes/queue';
import { createTopicRouter } from '../../../routes/topic';
import { createMessageRouter } from '../../../routes/message';
import { errorHandler } from '../../../middlewares/errorHandler';
import config from '../../../config';
import logger from '../../../utils/logger';

export interface IntegrationTestEnv {
  mongoServer: MongoMemoryServer;
  app: express.Application;
  server: http.Server;
  io: SocketIOServer;
  authToken: string;
  userId: string;
}

export const setupIntegrationTestEnv = async (): Promise<IntegrationTestEnv> => {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const app = express();
  const server = http.createServer(app);
  
  const io = new SocketIOServer(server, {
    transports: ['polling'],
    cors: {
      origin: '*',
    }
  });
  
  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  logger.transports.forEach((t) => (t.silent = true));

  const user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  });

  const userId = user.id;

  const authToken = jwt.sign(
    { userId, username: 'testuser' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );

  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/queues', queueRoutes);
  app.use('/api/topics', createTopicRouter(io));
  app.use('/api/messages', createMessageRouter(io));

  app.use(errorHandler);

  return {
    mongoServer,
    app,
    server,
    io,
    authToken,
    userId
  };
};

export const teardownTestEnv = async (testEnv: IntegrationTestEnv): Promise<void> => {
  const { mongoServer, server, io } = testEnv;
  
  if (io) {
    io.close();
  }
  
  if (server) {
    server.close();
  }
  
  await mongoose.disconnect();
  await mongoServer.stop();
};

export const cleanupDatabase = async (): Promise<void> => {
  await Queue.deleteMany({});
  await Topic.deleteMany({});
  await Message.deleteMany({});
};

export const createTestUser = async (): Promise<{ userId: string; authToken: string }> => {
  const user = await User.create({
    username: `user_${Date.now()}`,
    email: `user_${Date.now()}@example.com`,
    password: 'password123',
  });

  const userId = user.id;
  const authToken = jwt.sign(
    { userId, username: user.username },
    config.jwt.secret,
    { expiresIn: '1h' }
  );

  return { userId, authToken };
};