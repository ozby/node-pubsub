import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { connectDatabase, disconnectDatabase } from '../../utils/db';

jest.mock('mongoose', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  connection: {
    on: jest.fn(),
    readyState: 1
  }
}));

jest.mock('@repo/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Database Connection Utility', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connectDatabase', () => {
    it('should connect to MongoDB successfully', async () => {
      const connectMock = mongoose.connect as jest.Mock;
      connectMock.mockImplementation(() => Promise.resolve());
      
      await connectDatabase();
      
      expect(mongoose.connect).toHaveBeenCalled();
      
      const connectArg = (mongoose.connect as jest.Mock).mock.calls[0][0];
      
      expect(typeof connectArg).toBe('string');
      
      expect(mongoose.connection.on).toHaveBeenCalledTimes(3);
      expect(mongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mongoose.connection.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(mongoose.connection.on).toHaveBeenCalledWith('reconnected', expect.any(Function));
    });

    it('should throw error when connection fails', async () => {
      const mockError = new Error('Connection failed');
      const connectMock = mongoose.connect as jest.Mock;
      connectMock.mockImplementation(() => Promise.reject(mockError));
      
      await expect(connectDatabase()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnectDatabase', () => {
    it('should disconnect from MongoDB successfully', async () => {
      const disconnectMock = mongoose.disconnect as jest.Mock;
      disconnectMock.mockImplementation(() => Promise.resolve());
      
      await disconnectDatabase();
      
      expect(mongoose.disconnect).toHaveBeenCalled();
    });

    it('should throw error when disconnection fails', async () => {
      const mockError = new Error('Disconnection failed');
      const disconnectMock = mongoose.disconnect as jest.Mock;
      disconnectMock.mockImplementation(() => Promise.reject(mockError));
      
      await expect(disconnectDatabase()).rejects.toThrow('Disconnection failed');
    });
  });
}); 