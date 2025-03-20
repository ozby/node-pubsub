import { Request, Response } from 'express';
import * as dashboardController from '../../controllers/dashboardController';
import Queue from '../../models/Queue';
import Message from '../../models/Message';
import { ServerMetrics } from '../../models/Metrics';
import { IDecodedToken } from '@ozby-pubsub/types';

jest.mock('../../models/Queue');
jest.mock('../../models/Message');
jest.mock('../../models/Topic');
jest.mock('../../models/Metrics');

describe('Dashboard Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock Express objects
    mockRequest = {
      user: {
        userId: 'test-user',
        username: 'testuser',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      } as IDecodedToken
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    nextFunction = jest.fn();
  });

  describe('getServerMetrics', () => {
    it('should return server metrics and statistics', async () => {
      // Mock counts
      (Queue.countDocuments as jest.Mock).mockResolvedValue(5);
      (Message.countDocuments as jest.Mock).mockResolvedValueOnce(100).mockResolvedValueOnce(50);
      
      // Mock server metrics
      const mockServerMetrics = {
        startTime: new Date('2023-01-01T00:00:00.000Z'),
        totalRequests: 1000,
        activeConnections: 10,
        messagesProcessed: 500,
        errorCount: 5,
        avgResponseTime: 150
      };
      (ServerMetrics.findOne as jest.Mock).mockResolvedValue(mockServerMetrics);
      
      // Call controller method
      await dashboardController.getServerMetrics(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.countDocuments).toHaveBeenCalled();
      expect(Message.countDocuments).toHaveBeenCalledTimes(2);
      expect(ServerMetrics.findOne).toHaveBeenCalled();
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          serverMetrics: mockServerMetrics,
          stats: {
            totalQueues: 5,
            totalMessages: 100,
            activeMessages: 50
          }
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should create server metrics if not found', async () => {
      // Mock counts
      (Queue.countDocuments as jest.Mock).mockResolvedValue(5);
      (Message.countDocuments as jest.Mock).mockResolvedValueOnce(100).mockResolvedValueOnce(50);
      
      // Mock server metrics not found, then created
      const mockServerMetrics = {
        startTime: expect.any(Date),
        totalRequests: 0,
        activeConnections: 0,
        messagesProcessed: 0,
        errorCount: 0,
        avgResponseTime: 0
      };
      (ServerMetrics.findOne as jest.Mock).mockResolvedValue(null);
      (ServerMetrics.create as jest.Mock).mockResolvedValue(mockServerMetrics);
      
      // Call controller method
      await dashboardController.getServerMetrics(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(ServerMetrics.findOne).toHaveBeenCalled();
      expect(ServerMetrics.create).toHaveBeenCalledWith(expect.objectContaining({
        startTime: expect.any(Date),
        totalRequests: 0,
        activeConnections: 0
      }));
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          serverMetrics: mockServerMetrics,
          stats: expect.any(Object)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Mock ServerMetrics.findOne to throw an error
      const error = new Error('Database error');
      (ServerMetrics.findOne as jest.Mock).mockRejectedValue(error);
      
      // Call controller method
      await dashboardController.getServerMetrics(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(ServerMetrics.findOne).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('getAllQueueMetrics', () => {
    it('should return metrics for all user queues', async () => {
      // Mock queues
      const mockQueues = [
        { id: 'queue1', name: 'Queue 1' },
        { id: 'queue2', name: 'Queue 2' }
      ];
      (Queue.find as jest.Mock).mockResolvedValue(mockQueues);
      
      // Mock queue metrics
      const mockQueueMetrics = [
        { queueId: 'queue1', messageCount: 10, messagesSent: 15, messagesReceived: 5 },
        { queueId: 'queue2', messageCount: 20, messagesSent: 25, messagesReceived: 5 }
      ];
      (Queue.find as jest.Mock).mockResolvedValue(mockQueues);
      (ServerMetrics.find as jest.Mock).mockResolvedValue(mockQueueMetrics);
      
      // Call controller method
      await dashboardController.getAllQueueMetrics(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.find).toHaveBeenCalledWith({ ownerId: 'test-user' });
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: mockQueueMetrics.length,
        data: {
          queueMetrics: mockQueueMetrics
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
}); 