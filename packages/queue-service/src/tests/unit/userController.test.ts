import { Request, Response } from 'express';
import * as authController from '../../controllers/authController';
import User from '../../models/User';
import jwt from 'jsonwebtoken';
import config from '../../config';

jest.mock('../../models/User');
jest.mock('jsonwebtoken');

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      body: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn()
    };
    
    nextFunction = jest.fn();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        toJSON: jest.fn().mockReturnValue({
          id: '507f1f77bcf86cd799439011',
          username: 'testuser',
          email: 'test@example.com'
        })
      };
      (User.create as jest.Mock).mockResolvedValue(mockUser);
      
      const mockToken = 'mock-jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      
      await authController.register(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(User.findOne).toHaveBeenCalledWith({ 
        $or: [
          { username: 'testuser' },
          { email: 'test@example.com' }
        ]
      });
      expect(User.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: '507f1f77bcf86cd799439011', username: 'testuser' },
        config.jwt.secret,
        { expiresIn: expect.any(String) }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: expect.objectContaining({
            id: '507f1f77bcf86cd799439011',
            username: 'testuser',
            email: 'test@example.com'
          }),
          token: mockToken
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 if user already exists', async () => {
      const existingUser = {
        id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com'
      };
      (User.findOne as jest.Mock).mockResolvedValue(existingUser);
      
      await authController.register(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(User.findOne).toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toContain('exists');
      expect(error.statusCode).toBe(400);
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockRejectedValue(error);
      
      await authController.register(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(User.findOne).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        comparePassword: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({
          id: '507f1f77bcf86cd799439011',
          username: 'testuser',
          email: 'test@example.com'
        })
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      
      const mockToken = 'mock-jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      
      mockRequest.body = {
        username: 'testuser',
        password: 'password123'
      };
      
      await authController.login(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: '507f1f77bcf86cd799439011', username: 'testuser' },
        config.jwt.secret,
        { expiresIn: expect.any(String) }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: expect.objectContaining({
            id: '507f1f77bcf86cd799439011',
            username: 'testuser',
            email: 'test@example.com'
          }),
          token: mockToken
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      mockRequest.body = {
        username: 'testuser',
        password: 'password123'
      };
      
      await authController.login(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
    });

    it('should return 401 if password is incorrect', async () => {
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        comparePassword: jest.fn().mockResolvedValue(false)
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      
      mockRequest.body = {
        username: 'testuser',
        password: 'wrong-password'
      };
      
      await authController.login(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('wrong-password');
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockRejectedValue(error);
      
      mockRequest.body = {
        username: 'testuser',
        password: 'password123'
      };
      
      await authController.login(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(User.findOne).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});