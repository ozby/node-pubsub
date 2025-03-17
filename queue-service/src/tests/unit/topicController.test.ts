import { Request, Response } from 'express';
import { createTopicController } from '../../controllers/topicController';
import Topic from '../../models/Topic';
import Queue from '../../models/Queue';
import Message from '../../models/Message';
import { IDecodedToken } from '../../types';
import { Server } from 'socket.io';

jest.mock('../../models/Topic');
jest.mock('../../models/Queue');
jest.mock('../../models/Message');

describe('Topic Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockIo: Partial<Server>;
  let topicController: ReturnType<typeof createTopicController>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      params: { id: '507f1f77bcf86cd799439011', topicId: '507f1f77bcf86cd799439011' },
      body: { 
        name: 'Test Topic',
        queueId: '507f1f77bcf86cd799439012',
        data: { content: 'Test message' }
      },
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
    
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis()
    };

    topicController = createTopicController(mockIo as Server);
  });

  describe('createTopic', () => {
    it('should create a topic successfully', async () => {
      const mockTopic = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Topic',
        ownerId: 'test-user',
        subscribedQueues: [],
        toObject: jest.fn().mockReturnThis()
      };
      (Topic.create as jest.Mock).mockResolvedValue(mockTopic);
      
      await topicController.createTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.create).toHaveBeenCalledWith({
        name: 'Test Topic',
        ownerId: 'test-user',
        subscribedQueues: []
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { topic: mockTopic }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (Topic.create as jest.Mock).mockRejectedValue(error);
      
      await topicController.createTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.create).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('getTopics', () => {
    it('should get all topics for the authenticated user', async () => {
      const mockTopics = [
        { id: 'topic1', name: 'Topic 1', ownerId: 'test-user' },
        { id: 'topic2', name: 'Topic 2', ownerId: 'test-user' }
      ];
      (Topic.find as jest.Mock).mockResolvedValue(mockTopics);
      
      await topicController.getTopics(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.find).toHaveBeenCalledWith({ ownerId: 'test-user' });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: 2,
        data: { topics: mockTopics }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (Topic.find as jest.Mock).mockRejectedValue(error);
      
      await topicController.getTopics(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.find).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('getTopic', () => {
    it('should get a topic by id', async () => {
      const mockTopic = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Topic',
        ownerId: 'test-user',
        subscribedQueues: []
      };
      (Topic.findById as jest.Mock).mockResolvedValue(mockTopic);
      
      await topicController.getTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { topic: mockTopic }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 404 if topic not found', async () => {
      (Topic.findById as jest.Mock).mockResolvedValue(null);
      
      await topicController.getTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Topic not found');
      expect(error.statusCode).toBe(404);
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (Topic.findById as jest.Mock).mockRejectedValue(error);
      
      await topicController.getTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.findById).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('subscribeTopic', () => {
    it('should subscribe a queue to a topic', async () => {
      const mockTopic = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Topic',
        ownerId: 'test-user',
        subscribedQueues: [],
        save: jest.fn().mockResolvedValue(true)
      };
      (Topic.findById as jest.Mock).mockResolvedValue(mockTopic);
      
      const mockQueue = {
        id: '507f1f77bcf86cd799439012',
        name: 'Test Queue',
        ownerId: 'test-user'
      };
      (Queue.findById as jest.Mock).mockResolvedValue(mockQueue);
      
      await topicController.subscribeTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Queue.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
      expect(mockTopic.subscribedQueues).toContain('507f1f77bcf86cd799439012');
      expect(mockTopic.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { topic: mockTopic }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 404 if topic not found', async () => {
      (Topic.findById as jest.Mock).mockResolvedValue(null);
      
      await topicController.subscribeTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Queue.findById).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Topic not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('publishToTopic', () => {
    it('should publish messages to all subscribed queues', async () => {
      const mockTopic = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Topic',
        ownerId: 'test-user',
        subscribedQueues: ['queue1', 'queue2']
      };
      (Topic.findById as jest.Mock).mockResolvedValue(mockTopic);
      
      const mockQueues = [
        { id: 'queue1', retentionPeriod: 7, pushEndpoint: true },
        { id: 'queue2', retentionPeriod: 7, pushEndpoint: false }
      ];
      (Queue.find as jest.Mock).mockResolvedValue(mockQueues);
      
      const mockMessages = [
        { id: 'message1', queueId: 'queue1', data: { content: 'Test message' } },
        { id: 'message2', queueId: 'queue2', data: { content: 'Test message' } }
      ];
      (Message.create as jest.Mock).mockResolvedValueOnce(mockMessages[0]).mockResolvedValueOnce(mockMessages[1]);
      
      await topicController.publishToTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Queue.find).toHaveBeenCalledWith({ _id: { $in: ['queue1', 'queue2'] } });
      expect(Message.create).toHaveBeenCalledTimes(2);
      expect(mockIo.to).toHaveBeenCalledWith('queue1');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: expect.any(Number),
        data: { messages: expect.any(Array) }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 404 if topic not found', async () => {
      (Topic.findById as jest.Mock).mockResolvedValue(null);
      
      await topicController.publishToTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Message.create).not.toHaveBeenCalled();
      expect(mockIo.emit).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Topic not found');
      expect(error.statusCode).toBe(404);
    });

    it('should return 403 if user does not own the topic', async () => {
      const mockTopic = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Topic',
        ownerId: 'another-user',
        subscribedQueues: ['queue1', 'queue2']
      };
      (Topic.findById as jest.Mock).mockResolvedValue(mockTopic);
      
      await topicController.publishToTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Message.create).not.toHaveBeenCalled();
      expect(mockIo.emit).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Not authorized to publish to this topic');
      expect(error.statusCode).toBe(403);
    });

    it('should return 400 if topic has no subscribers', async () => {
      const mockTopic = {
        id: '507f1f77bcf86cd799439011',
        name: 'Test Topic',
        ownerId: 'test-user',
        subscribedQueues: []
      };
      (Topic.findById as jest.Mock).mockResolvedValue(mockTopic);
      
      await topicController.publishToTopic(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(Topic.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Message.create).not.toHaveBeenCalled();
      expect(mockIo.emit).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Topic has no subscribers');
      expect(error.statusCode).toBe(400);
    });
  });
}); 