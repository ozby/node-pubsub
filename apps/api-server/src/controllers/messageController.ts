import { Request, Response, NextFunction } from 'express';
import Message from '../models/Message';
import Queue from '../models/Queue';
import { AppError } from '../middlewares/errorHandler';
import config from '../config';
import logger from '../utils/logger';
import { Server } from 'socket.io';
import { SendMessageRequest } from '@repo/types';


export interface MessageController {
  sendMessage: (req: Request<{ queueId: string }>, res: Response, next: NextFunction) => Promise<void>;
  receiveMessages: (req: Request<{ queueId: string }, object, object, { maxMessages?: number, visibilityTimeout?: number }>, res: Response, next: NextFunction) => Promise<void>;
  deleteMessage: (req: Request<{ queueId: string, messageId: string }>, res: Response, next: NextFunction) => Promise<void>;
  getMessage: (req: Request<{ queueId: string, messageId: string }>, res: Response, next: NextFunction) => Promise<void>;
}

export const createMessageController = (io: Server): MessageController => {
  return {
    sendMessage: async (req: Request<{ queueId: string }, object, SendMessageRequest>, res: Response, next: NextFunction): Promise<void> => {
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
          received: false,
          receivedCount: 0,
        });

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

    receiveMessages: async (req: Request<{ queueId: string }, object, object, { maxMessages?: number, visibilityTimeout?: number }>, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { queueId } = req.params;
        const maxMessagesParam = req.query.maxMessages ? parseInt(req.query.maxMessages.toString(), 10) : 10;
        const visibilityTimeoutParam = req.query.visibilityTimeout ? parseInt(req.query.visibilityTimeout.toString(), 10) : config.visibilityTimeout;

        const queue = await Queue.findById(queueId);
        if (!queue) {
          throw new AppError('Queue not found', 404);
        }

        const messages = await Message.find({
          queueId,
          received: false,
        }).limit(maxMessagesParam);

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

        const receivedAt = new Date();
        receivedAt.setSeconds(receivedAt.getSeconds() + Number(visibilityTimeoutParam));

        const messageIds = messages.map(message => message.id);
        await Message.updateReceivedMessages(messageIds, queueId);

        logger.info(`${messages.length} messages received from queue ${queueId}`);

        res.status(200).json({
          status: 'success',
          results: messages.length,
          data: {
            messages,
            visibilityTimeout: Number(visibilityTimeoutParam),
          },
        });
      } catch (error) {
        next(error);
      }
    },

    deleteMessage: async (req: Request<{ queueId: string, messageId: string }>, res: Response, next: NextFunction): Promise<void> => {
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

        logger.info(`Message ${messageId} deleted from queue ${queueId}`);

        res.status(204).json({
          status: 'success',
          data: null,
        });
      } catch (error) {
        next(error);
      }
    },

    getMessage: async (req: Request<{ queueId: string, messageId: string }>, res: Response, next: NextFunction): Promise<void> => {
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
