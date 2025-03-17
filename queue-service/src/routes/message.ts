import express from 'express';
import { body, query, param } from 'express-validator';
import { createMessageController } from '../controllers/messageController';
import { authenticate } from '../middlewares/auth';
import { validate, validateMessageSchema } from '../middlewares/validator';
import { Server } from 'socket.io';

export const createMessageRouter = (io: Server) => {
  const router = express.Router();
  const messageController = createMessageController(io);

  router.use(authenticate);

  router.post(
    '/:queueId',
    [
      param('queueId').isMongoId().withMessage('Invalid Queue ID format'),
      body('data').isObject().withMessage('Message data must be an object'),
    ],
    validate([
      param('queueId').isMongoId().withMessage('Invalid Queue ID format'),
      body('data').isObject().withMessage('Message data must be an object'),
    ]),
    validateMessageSchema,
    messageController.sendMessage
  );

  router.get(
    '/:queueId',
    [
      param('queueId').isMongoId().withMessage('Invalid Queue ID format'),
      query('maxMessages').optional().isInt({ min: 1, max: 10 }).withMessage('Max messages must be between 1 and 10'),
      query('visibilityTimeout').optional().isInt({ min: 0 }).withMessage('Visibility timeout must be a non-negative integer'),
    ],
    validate([
      param('queueId').isMongoId().withMessage('Invalid Queue ID format'),
      query('maxMessages').optional().isInt({ min: 1, max: 10 }).withMessage('Max messages must be between 1 and 10'),
      query('visibilityTimeout').optional().isInt({ min: 0 }).withMessage('Visibility timeout must be a non-negative integer'),
    ]),
    messageController.receiveMessages
  );

  router.get(
    '/:queueId/:messageId',
    [
      param('queueId').isMongoId().withMessage('Invalid Queue ID format'),
      param('messageId').isMongoId().withMessage('Invalid Message ID format'),
    ],
    validate([
      param('queueId').isMongoId().withMessage('Invalid Queue ID format'),
      param('messageId').isMongoId().withMessage('Invalid Message ID format'),
    ]),
    messageController.getMessage
  );

  router.delete(
    '/:queueId/:messageId',
    [
      param('queueId').isMongoId().withMessage('Invalid Queue ID format'),
      param('messageId').isMongoId().withMessage('Invalid Message ID format'),
    ],
    validate([
      param('queueId').isMongoId().withMessage('Invalid Queue ID format'),
      param('messageId').isMongoId().withMessage('Invalid Message ID format'),
    ]),
    messageController.deleteMessage
  );

  return router;
};