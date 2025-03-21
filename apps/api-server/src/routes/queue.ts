import express, { Router } from 'express';
import { body, param } from 'express-validator';
import * as queueController from '../controllers/queueController';
import { validate } from '../middlewares/validator';

const router: Router = express.Router();

router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Queue name is required'),
    body('retentionPeriod').optional().isInt({ min: 1 }).withMessage('Retention period must be a positive integer'),
    body('schema').optional().isObject().withMessage('Schema must be an object'),
    body('pushEndpoint').optional().isURL().withMessage('Push endpoint must be a valid URL'),
  ],
  validate([
    body('name').notEmpty().withMessage('Queue name is required'),
    body('retentionPeriod').optional().isInt({ min: 1 }).withMessage('Retention period must be a positive integer'),
    body('schema').optional().isObject().withMessage('Schema must be an object'),
    body('pushEndpoint').optional().isURL().withMessage('Push endpoint must be a valid URL'),
  ]),
  queueController.createQueue
);

router.get('/', queueController.getQueues);

router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid Queue ID format'),
  ],
  validate([
    param('id').isMongoId().withMessage('Invalid Queue ID format'),
  ]),
  queueController.getQueue
);

router.delete(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid Queue ID format'),
  ],
  validate([
    param('id').isMongoId().withMessage('Invalid Queue ID format'),
  ]),
  queueController.deleteQueue
);

export default router; 