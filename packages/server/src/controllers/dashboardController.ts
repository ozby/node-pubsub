import { Request, Response, NextFunction } from 'express';
import { ServerMetrics, QueueMetrics } from '../models/Metrics';
import Queue from '../models/Queue';
import Message from '../models/Message';
import { AppError } from '../middlewares/errorHandler';

export const getServerMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let serverMetrics = await ServerMetrics.findOne();
    if (!serverMetrics) {
      serverMetrics = await ServerMetrics.create({
        startTime: new Date(),
        totalRequests: 0,
        activeConnections: 0,
        messagesProcessed: 0,
        errorCount: 0,
        avgResponseTime: 0,
      });
    }

    const totalQueues = await Queue.countDocuments();
    const totalMessages = await Message.countDocuments();
    const activeMessages = await Message.countDocuments({ visible: true });

    res.status(200).json({
      status: 'success',
      data: {
        serverMetrics,
        stats: {
          totalQueues,
          totalMessages,
          activeMessages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getQueueMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { queueId } = req.params;

    const queue = await Queue.findById(queueId);
    if (!queue) {
      throw new AppError('Queue not found', 404);
    }

    const ownerId = req.user?.userId || 'anonymous';
    if (queue.ownerId !== ownerId) {
      throw new AppError('Not authorized to access this queue', 403);
    }

    let queueMetrics = await QueueMetrics.findOne({ queueId });
    if (!queueMetrics) {
      queueMetrics = await QueueMetrics.create({
        queueId,
        messageCount: 0,
        messagesSent: 0,
        messagesReceived: 0,
        avgWaitTime: 0,
      });
    }

    const totalMessages = await Message.countDocuments({ queueId });
    const activeMessages = await Message.countDocuments({ queueId, visible: true });
    const oldestMessage = await Message.findOne({ queueId, visible: true }).sort({ createdAt: 1 });
    const newestMessage = await Message.findOne({ queueId }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        queueMetrics,
        stats: {
          totalMessages,
          activeMessages,
          oldestMessageAge: oldestMessage ? Date.now() - oldestMessage.createdAt.getTime() : 0,
          newestMessageAge: newestMessage ? Date.now() - newestMessage.createdAt.getTime() : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllQueueMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = req.user?.userId || 'anonymous';
    
    const queues = await Queue.find({ ownerId });
    const queueIds = queues.map(queue => queue.id);
    
    const queueMetrics = await QueueMetrics.find({ queueId: { $in: queueIds } });
    
    res.status(200).json({
      status: 'success',
      results: queueMetrics.length,
      data: {
        queueMetrics,
      },
    });
  } catch (error) {
    next(error);
  }
}; 