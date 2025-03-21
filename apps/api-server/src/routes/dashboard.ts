import express, { Router } from 'express';
import { param } from 'express-validator';
import * as dashboardController from '../controllers/dashboardController';
import { validate } from '../middlewares/validator';

const router: Router = express.Router();

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