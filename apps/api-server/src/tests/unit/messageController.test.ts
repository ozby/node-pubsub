import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { createMessageController, MessageController } from '../../controllers/messageController';
import Message from '../../models/Message';
import Queue from '../../models/Queue';
import { IDecodedToken } from '@repo/types';

jest.mock('../../models/Message');
jest.mock('../../models/Queue');
jest.mock('../../models/Metrics');
jest.mock('socket.io');

describe('Message Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockIo: jest.Mocked<Server>;
  let messageController: MessageController;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock Express objects
    mockRequest = {
      params: { queueId: '507f1f77bcf86cd799439011' },
      body: { data: { content: 'Test message' } },
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
    
    // Setup mock Socket.io
    mockIo = new Server() as jest.Mocked<Server>;
    mockIo.to = jest.fn().mockReturnThis();
    mockIo.emit = jest.fn();
    
    // Mock the new updateReceivedMessages method
    (Message.updateReceivedMessages as jest.Mock) = jest.fn().mockResolvedValue({ modifiedCount: 2 });
    
    // Create controller with mock io
    messageController = createMessageController(mockIo);
  });

  describe('sendMessage', () => {
    it('should create a message successfully', async () => {
      // Mock Queue findById to return a queue
      const mockQueue = {
        id: '507f1f77bcf86cd799439011',
        retentionPeriod: 7,
        pushEndpoint: null
      };
      (Queue.findById as jest.Mock).mockResolvedValue(mockQueue);
      
      // Mock Message create to return a message
      const mockMessage = {
        id: 'message123',
        data: { content: 'Test message' },
        queueId: '507f1f77bcf86cd799439011'
      };
      (Message.create as jest.Mock).mockResolvedValue(mockMessage);
      
      
      // Call controller method
      await messageController.sendMessage(mockRequest as Request<{ queueId: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Message.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { message: mockMessage }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle queue not found error', async () => {
      // Mock Queue findById to return null (queue not found)
      (Queue.findById as jest.Mock).mockResolvedValue(null);
      
      // Call controller method
      await messageController.sendMessage(mockRequest as Request<{ queueId: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Message.create).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Queue not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('receiveMessages', () => {
    it('should receive messages successfully', async () => {
      // Mock Queue findById to return a queue
      const mockQueue = {
        id: '507f1f77bcf86cd799439011',
      };
      (Queue.findById as jest.Mock).mockResolvedValue(mockQueue);
      
      // Mock Message find to return messages
      const mockMessages = [
        { id: 'msg1', data: { content: 'Message 1' } },
        { id: 'msg2', data: { content: 'Message 2' } }
      ];
      const mockMessageFind = {
        limit: jest.fn().mockReturnValue(mockMessages)
      };
      (Message.find as jest.Mock).mockReturnValue(mockMessageFind);
      
      // Mock Message updateMany
      (Message.updateMany as jest.Mock).mockResolvedValue({});
      
      
      // Setup request query params
      mockRequest.query = { maxMessages: '2', visibilityTimeout: '30' };
      
      // Call controller method
      await messageController.receiveMessages(mockRequest as Request<{ queueId: string }>, mockResponse as Response, nextFunction);
      
      // Assertions
      expect(Queue.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Message.find).toHaveBeenCalledWith({
        queueId: '507f1f77bcf86cd799439011',
        received: false
      });
      expect(mockMessageFind.limit).toHaveBeenCalledWith(2);
      expect(Message.updateReceivedMessages).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: 2,
        data: {
          messages: mockMessages,
          visibilityTimeout: 30
        }
      });
    });
  });
}); 