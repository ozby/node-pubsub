import { Request, Response, NextFunction } from 'express';
import Queue, { QueueDocument } from '../models/Queue';
import { AppError } from '../middlewares/errorHandler';
import { QueueMetrics } from '../models/Metrics';
import logger from '../utils/logger';
import { CreateQueueRequest } from '@repo/types';
import { FilterQuery } from 'mongoose';

export const createQueue = async (req: Request<object, object, CreateQueueRequest>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, retentionPeriod, schema, pushEndpoint } = req.body;
    const ownerId = req.user?.userId;

    const queue = await Queue.create({
      name,
      ownerId,
      retentionPeriod,
      schema,
      pushEndpoint,
    });

    await QueueMetrics.create({
      queueId: queue.id,
      messageCount: 0,
      messagesSent: 0,
      messagesReceived: 0,
      avgWaitTime: 0,
    });

    logger.info(`Queue created: ${queue.id}`);

    res.status(201).json({
      status: 'success',
      data: {
        queue,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getQueues = async (req: Request<object, object, object, { name?: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.query;
    const filter: FilterQuery<QueueDocument> = {};
    
    if (req.user?.userId) {
      filter.ownerId = req.user.userId;
    }

    if (name) {
      filter.name = name;
    }

    const queues = await Queue.find(filter);

    res.status(200).json({
      status: 'success',
      results: queues.length,
      data: {
        queues,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getQueue = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const queue = await Queue.findById(id);
    if (!queue) {
      throw new AppError(`Queue not found with ID: ${id}`, 404);
    }
    
    if (req.user?.userId && queue.ownerId !== req.user.userId) {
      throw new AppError('You do not have permission to access this queue', 403);
    }

    res.status(200).json({
      status: 'success',
      data: {
        queue,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQueue = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const queue = await Queue.findById(id);
    
    if (!queue) {
      throw new AppError(`Queue not found with ID: ${id}`, 404);
    }
    
    if (req.user?.userId && queue.ownerId !== req.user.userId) {
      throw new AppError('You do not have permission to delete this queue', 403);
    }

    await Queue.findByIdAndDelete(id);
    
    logger.info(`Queue deleted: ${id}`);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}; 