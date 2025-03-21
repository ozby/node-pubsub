import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { jest } from '@jest/globals';
import Notification from '../../models/Notification';
import changeStreamService from '../../services/ChangeStreamService';

// Mock the logger
jest.mock('@repo/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// This is a complex service to test since it relies on MongoDB change streams.
// We need to do a bit of setup and mocking

describe('ChangeStreamService', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let mockDb: any;
  let originalDb: any;

  beforeAll(async () => {
    // Set up MongoDB memory server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect mongoose
    await mongoose.connect(mongoUri);
    
    // Also connect a raw MongoDB client for testing
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    mockDb = mongoClient.db();
    
    // We need to create watched collections
    await mockDb.createCollection('messages');
    await mockDb.createCollection('queues');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    
    // Save the original db and mock it for testing
    originalDb = (changeStreamService as any).db;
    
    // Mock the change stream functionality
    const mockStream = {
      on: jest.fn(),
      close: jest.fn().mockImplementation(() => Promise.resolve())
    };
    
    const mockCollection = {
      watch: jest.fn().mockReturnValue(mockStream)
    };
    
    // Mock the connection
    (changeStreamService as any).db = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };
    
    // Reset initialization flag
    (changeStreamService as any).isInitialized = false;
  });

  afterEach(() => {
    // Restore the original database connection
    (changeStreamService as any).db = originalDb;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should initialize the change stream service', async () => {
    await changeStreamService.initialize();
    
    // The service should be initialized
    expect((changeStreamService as any).isInitialized).toBe(true);
    
    // It should have tried to watch the configured collections
    expect((changeStreamService as any).db.collection).toHaveBeenCalledWith('messages');
    expect((changeStreamService as any).db.collection).toHaveBeenCalledWith('queues');
    
    // The watch method should have been called for each collection
    const mockCollection = (changeStreamService as any).db.collection();
    expect(mockCollection.watch).toHaveBeenCalledTimes(2);
  });

  it('should close all change streams', async () => {
    // Add some mock change streams
    const mockStream1 = {
      close: jest.fn().mockImplementation(() => Promise.resolve())
    };
    const mockStream2 = {
      close: jest.fn().mockImplementation(() => Promise.resolve())
    };
    
    (changeStreamService as any).changeStreams.set('messages', mockStream1);
    (changeStreamService as any).changeStreams.set('queues', mockStream2);
    (changeStreamService as any).isInitialized = true;
    
    // Close change streams
    await changeStreamService.close();
    
    // Should close all streams
    expect(mockStream1.close).toHaveBeenCalled();
    expect(mockStream2.close).toHaveBeenCalled();
    
    // Should clear the streams
    expect((changeStreamService as any).changeStreams.size).toBe(0);
    
    // Should reset initialization flag
    expect((changeStreamService as any).isInitialized).toBe(false);
  });

  // Testing the actual change handling logic is more complex and would require
  // integration tests with a real MongoDB instance configured for change streams.
  // For this example, we're focusing on unit testing the initialization and shutdown.
}); 