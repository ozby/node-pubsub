import express from 'express';
import { param } from 'express-validator';
import * as dashboardController from '../controllers/dashboardController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validator';

const router = express.Router();

router.use(authenticate);

router.get('/server', dashboardController.getServerMetrics);

router.get('/queues', dashboardController.getAllQueueMetrics);

router.get(
  '/queues/:queueId',
  [
    param('queueId').isMongoId().withMessage('Invalid Queue ID format'),
  ],
  validate([
    param('queueId').isMongoId().withMessage('Invalid Queue ID format'),
  ]),
  dashboardController.getQueueMetrics
);

export default router; 