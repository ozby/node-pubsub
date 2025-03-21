import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { connectToDatabase } from './utils/database';
import config from './config';
import logger from './utils/logger';
import queueRoutes from './routes/queue';
import { createMessageRouter } from './routes/message';
import { createTopicRouter } from './routes/topic';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { IDecodedToken } from '@repo/types';

declare module 'express' {
  interface Request {
    user?: IDecodedToken;
    id?: string;
    topicId?: string;
    queueId?: string;
  }
}

const app = express();

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/api/queues', queueRoutes);
app.use('/api/messages', createMessageRouter(io));
app.use('/api/topics', createTopicRouter(io));
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('subscribe', (queueId: string) => {
    socket.join(queueId);
    logger.info(`Socket ${socket.id} subscribed to queue ${queueId}`);
  });

  socket.on('unsubscribe', (queueId: string) => {
    socket.leave(queueId);
    logger.info(`Socket ${socket.id} unsubscribed from queue ${queueId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

export { io };

const startServer = async () => {
  try {
    await connectToDatabase();

    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err}`);
  process.exit(1);
});

startServer(); 