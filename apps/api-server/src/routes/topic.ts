import express, { Router } from 'express';
import { body, param } from 'express-validator';
import { createTopicController } from '../controllers/topicController';
import { validate } from '../middlewares/validator';
import { Server } from 'socket.io';

export const createTopicRouter = (io: Server) => {
  const router: Router = express.Router();
  const topicController = createTopicController(io);

  router.post(
    '/',
    [
      body('name').notEmpty().withMessage('Topic name is required'),
    ],
    validate([
      body('name').notEmpty().withMessage('Topic name is required'),
    ]),
    topicController.createTopic
  );

  router.get('/', topicController.getTopics);

  router.get(
    '/:id',
    [
      param('id')
        .isMongoId().withMessage('Invalid Topic ID format'),
    ],
    validate([
      param('id')
        .isMongoId().withMessage('Invalid Topic ID format'),
    ]),
    topicController.getTopic
  );

  router.delete(
    '/:id',
    [
      param('id')
        .isMongoId().withMessage('Invalid Topic ID format'),
    ],
    validate([
      param('id')
        .isMongoId().withMessage('Invalid Topic ID format'),
    ]),
    topicController.deleteTopic
  );

  router.post(
    '/:topicId/subscribe',
    [
      param('topicId')
        .isMongoId().withMessage('Invalid Topic ID format'),
      body('queueId')
        .isMongoId().withMessage('Invalid Queue ID format'),
    ],
    validate([
      param('topicId')
        .isMongoId().withMessage('Invalid Topic ID format'),
      body('queueId')
        .isMongoId().withMessage('Invalid Queue ID format'),
    ]),
    topicController.subscribeTopic
  );

  router.post(
    '/:topicId/publish',
    [
      param('topicId')
        .isMongoId().withMessage('Invalid Topic ID format'),
      body('data').exists().withMessage('Topic message data is required'),
    ],
    validate([
      param('topicId')
        .isMongoId().withMessage('Invalid Topic ID format'),
      body('data').exists().withMessage('Topic message data is required'),
    ]),
    topicController.publishToTopic
  );

  return router;
};