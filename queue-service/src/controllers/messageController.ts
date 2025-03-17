import { Request, Response, NextFunction } from 'express';
import Message from '../models/Message';
import Queue from '../models/Queue';
import { AppError } from '../middlewares/errorHandler';
import { QueueMetrics } from '../models/Metrics';
import config from '../config';
import logger from '../utils/logger';
import { Server } from 'socket.io';

export const createMessageController = (io: Server) => {
  return {
    sendMessage: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { queueId } = req.params;
        const { data } = req.body;

        const queue = await Queue.findById(queueId);
        if (!queue) {
          throw new AppError('Queue not found', 404);
        }

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + queue.retentionPeriod);

        const message = await Message.create({
          data,
          queueId,
          expiresAt: expirationDate,
          visible: true,
          receivedCount: 0,
        });

        await QueueMetrics.findOneAndUpdate(
          { queueId },
          {
            $inc: {
              messageCount: 1,
              messagesSent: 1,
            },
          },
          { new: true }
        );

        logger.info(`Message sent to queue ${queueId}: ${message.id}`);

        if (queue.pushEndpoint) {
          io.to(queueId).emit('message', message);
        }

        res.status(201).json({
          status: 'success',
          data: {
            message,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    receiveMessages: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { queueId } = req.params;
        const { maxMessages = 10, visibilityTimeout = config.visibilityTimeout } = req.query;

        const queue = await Queue.findById(queueId);
        if (!queue) {
          throw new AppError('Queue not found', 404);
        }

        const messages = await Message.find({
          queueId,
          visible: true,
        }).limit(Number(maxMessages));

        if (messages.length === 0) {
          res.status(200).json({
            status: 'success',
            results: 0,
            data: {
              messages: [],
            },
          });
          return;
        }

        const visibleAt = new Date();
        visibleAt.setSeconds(visibleAt.getSeconds() + Number(visibilityTimeout));

        const messageIds = messages.map(message => message.id);
        await Message.updateMany(
          { _id: { $in: messageIds } },
          {
            visible: false,
            visibleAt,
            $inc: { receivedCount: 1 },
          }
        );

        await QueueMetrics.findOneAndUpdate(
          { queueId },
          {
            $inc: {
              messagesReceived: messages.length,
            },
          },
          { new: true }
        );

        logger.info(`${messages.length} messages received from queue ${queueId}`);

        res.status(200).json({
          status: 'success',
          results: messages.length,
          data: {
            messages,
            visibilityTimeout: Number(visibilityTimeout),
          },
        });
      } catch (error) {
        next(error);
      }
    },

    deleteMessage: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { queueId, messageId } = req.params;

        const queue = await Queue.findById(queueId);
        if (!queue) {
          throw new AppError('Queue not found', 404);
        }

        const message = await Message.findOne({ _id: messageId, queueId });
        if (!message) {
          throw new AppError('Message not found', 404);
        }

        await Message.findByIdAndDelete(messageId);

        await QueueMetrics.findOneAndUpdate(
          { queueId },
          {
            $inc: {
              messageCount: -1,
            },
          },
          { new: true }
        );

        logger.info(`Message ${messageId} deleted from queue ${queueId}`);

        res.status(204).json({
          status: 'success',
          data: null,
        });
      } catch (error) {
        next(error);
      }
    },

    getMessage: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { queueId, messageId } = req.params;
        const message = await Message.findOne({ _id: messageId, queueId });

        if (!message) {
          res.status(404).json({
            status: 'error',
            message: 'Message not found',
          });
          return;
        }

        res.json({
          status: 'success',
          data: message,
        });
      } catch (error) {
        next(error);
      }
    }
  };
};
