import { Request, Response, NextFunction } from 'express';
import Topic from '../models/Topic';
import Queue from '../models/Queue';
import Message from '../models/Message';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';
import { Server } from 'socket.io';

export const createTopicController = (io: Server) => {
  return {
    createTopic: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { name } = req.body;
        const ownerId = req.user?.userId || 'anonymous';

        const topic = await Topic.create({
          name,
          ownerId,
          subscribedQueues: [],
        });

        logger.info(`Topic created: ${topic.id}`);

        res.status(201).json({
          status: 'success',
          data: {
            topic,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    getTopics: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ownerId = req.user?.userId || 'anonymous';
        const topics = await Topic.find({ ownerId });

        res.status(200).json({
          status: 'success',
          results: topics.length,
          data: {
            topics,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    getTopic: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { id } = req.params;
        
        const topic = await Topic.findById(id);

        if (!topic) {
          throw new AppError('Topic not found', 404);
        }

        const ownerId = req.user?.userId || 'anonymous';
        if (topic.ownerId !== ownerId) {
          throw new AppError('Not authorized to access this topic', 403);
        }

        res.status(200).json({
          status: 'success',
          data: {
            topic,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    subscribeTopic: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { topicId } = req.params;
        const { queueId } = req.body;
        
        const topic = await Topic.findById(topicId);
        if (!topic) {
          throw new AppError('Topic not found', 404);
        }

        const queue = await Queue.findById(queueId);
        if (!queue) {
          throw new AppError('Queue not found', 404);
        }

        const ownerId = req.user?.userId || 'anonymous';
        if (topic.ownerId !== ownerId) {
          throw new AppError('Not authorized to modify this topic', 403);
        }

        if (topic.subscribedQueues.includes(queueId)) {
          throw new AppError('Queue is already subscribed to this topic', 400);
        }

        topic.subscribedQueues.push(queueId);
        await topic.save();

        logger.info(`Queue ${queueId} subscribed to topic ${topicId}`);

        res.status(200).json({
          status: 'success',
          data: {
            topic,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    publishToTopic: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { topicId } = req.params;
        const { data } = req.body;
        
        const topic = await Topic.findById(topicId);
        if (!topic) {
          throw new AppError('Topic not found', 404);
        }

        const ownerId = req.user?.userId || 'anonymous';
        if (topic.ownerId !== ownerId) {
          throw new AppError('Not authorized to publish to this topic', 403);
        }

        if (topic.subscribedQueues.length === 0) {
          throw new AppError('Topic has no subscribers', 400);
        }

        const queues = await Queue.find({ _id: { $in: topic.subscribedQueues } });

        const messages = [];
        for (const queue of queues) {
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + queue.retentionPeriod);

          const message = await Message.create({
            data,
            queueId: queue.id,
            expiresAt: expirationDate,
            visible: true,
            receivedCount: 0,
          });

          messages.push(message);

          if (queue.pushEndpoint) {
            io.to(queue.id).emit('message', message);
          }
        }

        logger.info(`Message published to topic ${topicId}, delivered to ${messages.length} queues`);

        res.status(201).json({
          status: 'success',
          results: messages.length,
          data: {
            messages,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  };
};
