import { Request, Response } from 'express';
import { body } from 'express-validator';
import { validate, validateMessageSchema } from '../../middlewares/validator';

describe('Validator Middleware', () => {
  // Mock Express objects
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  describe('validate function', () => {
    it('should pass validation if data is valid', async () => {
      // Setup validation rules
      const validations = [
        body('name').notEmpty().withMessage('Name is required')
      ];
      
      // Setup mock request with valid data
      mockRequest.body = { name: 'Test Name' };
      
      // Create validation middleware
      const middleware = validate(validations);
      
      // Execute middleware
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Check that next() was called without errors
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should fail validation if data is invalid', async () => {
      // Setup validation rules
      const validations = [
        body('name').notEmpty().withMessage('Name is required')
      ];
      
      // Setup mock request with invalid data (missing name)
      mockRequest.body = {};
      
      // Create validation middleware
      const middleware = validate(validations);
      
      // Execute middleware
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Check that next() was called with an error
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(400);
    });
  });

  describe('validateMessageSchema function', () => {
    it('should pass validation for valid message schema', () => {
      // Setup mock request with valid message data
      mockRequest.body = {
        data: { content: 'Test message' }
      };
      
      // Execute middleware
      validateMessageSchema(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Check that next() was called without errors
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should fail validation for invalid message schema', () => {
      // Setup mock request with invalid message data (missing data field)
      mockRequest.body = {
        content: 'Test message'
      };
      
      // Execute middleware
      validateMessageSchema(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Check that next() was called with an error
      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain("data");
    });
  });
}); 