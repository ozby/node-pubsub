import { Request, Response } from 'express';
import * as queueController from '../../controllers/queueController';
import Queue from '../../models/Queue';
import { QueueMetrics } from '../../models/Metrics';
import { IDecodedToken } from '@repo/types';

// Mock dependencies
jest.mock('../../models/Queue');
jest.mock('../../models/Metrics');

describe('Queue Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { 
        name: 'Test Queue',
        retentionPeriod: 7,
        schema: null,
        pushEndpoint: null
      },
      user: {
        userId: 'test-user',
        username: 'testuser',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      } as IDecodedToken,
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:3000')
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    nextFunction = jest.fn();
  });

  describe('createQueue', () => {
    it('should create a queue successfully', async () => {
      // Mock Queue create to return a queue
      const mockQueue = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Queue',
        retentionPeriod: 7,
        ownerId: 'test-user',
        save: jest.fn().mockResolvedValue(true)
      };
      (Queue.create as jest.Mock).mockResolvedValue(mockQueue);
      
      // Mock QueueMetrics create
      (QueueMetrics.create as jest.Mock).mockResolvedValue({});
      
      // Call controller method
      await queueController.createQueue(mockRequest as Request<{ id: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.create).toHaveBeenCalledWith({
        name: 'Test Queue',
        ownerId: 'test-user',
        retentionPeriod: 7,
        schema: null,
        pushEndpoint: null
      });
      expect(QueueMetrics.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { queue: mockQueue }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Mock Queue create to throw an error
      const error = new Error('Database error');
      (Queue.create as jest.Mock).mockRejectedValue(error);
      
      // Call controller method
      await queueController.createQueue(mockRequest as Request<{ id: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.create).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('getQueues', () => {
    it('should get all queues for the authenticated user', async () => {
      // Mock Query filter conditions
      mockRequest.query = {};
      
      // Mock Queue find to return queues
      const mockQueues = [
        { id: 'queue1', name: 'Queue 1', ownerId: 'test-user' },
        { id: 'queue2', name: 'Queue 2', ownerId: 'test-user' }
      ];
      (Queue.find as jest.Mock).mockResolvedValue(mockQueues);
      
      // Call controller method
      await queueController.getQueues(mockRequest as Request<{ id: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.find).toHaveBeenCalledWith({ ownerId: 'test-user' });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: 2,
        data: { queues: mockQueues }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should filter queues by name if provided', async () => {
      // Mock query parameter
      mockRequest.query = { name: 'Test' };
      
      // Mock Queue find to return queues
      const mockQueues = [
        { id: 'queue1', name: 'Test Queue', ownerId: 'test-user' }
      ];
      (Queue.find as jest.Mock).mockResolvedValue(mockQueues);
      
      // Call controller method
      await queueController.getQueues(mockRequest as Request<{ id: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.find).toHaveBeenCalledWith({ 
        ownerId: 'test-user',
        name: 'Test'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        data: { queues: mockQueues }
      });
    });
  });

  describe('getQueue', () => {
    it('should get a queue by id', async () => {
      // Mock Queue findById to return a queue
      const mockQueue = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Queue',
        ownerId: 'test-user'
      };
      (Queue.findById as jest.Mock).mockResolvedValue(mockQueue);
      
      // Call controller method
      await queueController.getQueue(mockRequest as Request<{ id: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { queue: mockQueue }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 404 if queue not found', async () => {
      // Mock Queue findById to return null
      (Queue.findById as jest.Mock).mockResolvedValue(null);
      
      // Call controller method
      await queueController.getQueue(mockRequest as Request<{ id: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Queue not found with ID: 507f1f77bcf86cd799439011');
      expect(error.statusCode).toBe(404);
    });

    it('should return 403 if user does not own the queue', async () => {
      // Mock Queue findById to return a queue owned by another user
      const mockQueue = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Queue',
        ownerId: 'another-user'
      };
      (Queue.findById as jest.Mock).mockResolvedValue(mockQueue);
      
      // Call controller method
      await queueController.getQueue(mockRequest as Request<{ id: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('You do not have permission to access this queue');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('deleteQueue', () => {
    it('should delete a queue', async () => {
      // Mock Queue findById to return a queue
      const mockQueue = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Queue',
        ownerId: 'test-user'
      };
      (Queue.findById as jest.Mock).mockResolvedValue(mockQueue);
      
      // Mock Queue findByIdAndDelete
      (Queue.findByIdAndDelete as jest.Mock).mockResolvedValue({});
      
      // Call controller method
      await queueController.deleteQueue(mockRequest as Request<{ id: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Queue.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: null
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 404 if queue not found', async () => {
      // Mock Queue findById to return null
      (Queue.findById as jest.Mock).mockResolvedValue(null);
      
      // Call controller method
      await queueController.deleteQueue(mockRequest as Request<{ id: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Queue.findByIdAndDelete).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Queue not found with ID: 507f1f77bcf86cd799439011');
      expect(error.statusCode).toBe(404);
    });

    it('should return 403 if user does not own the queue', async () => {
      // Mock Queue findById to return a queue owned by another user
      const mockQueue = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Queue',
        ownerId: 'another-user'
      };
      (Queue.findById as jest.Mock).mockResolvedValue(mockQueue);
      
      // Call controller method
      await queueController.deleteQueue(mockRequest as Request<{ id: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Queue.findByIdAndDelete).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('You do not have permission to delete this queue');
      expect(error.statusCode).toBe(403);
    });
  });
}); 