import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import Notification from '../../models/Notification';

// Mock the necessary modules
jest.mock('@repo/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  http: jest.fn()
}));

// Use a more complete mockConfig with all required properties
const mockConfig = {
  port: 4001,
  nodeEnv: 'test',
  logLevel: 'silent',
  mongodbUri: 'mongodb://localhost:27017/test',
  redisUri: 'redis://localhost:6379',
  jwt: {
    secret: 'test-secret',
  },
  changeStream: {
    batchSize: 100,
    fullDocument: 'updateLookup',
    maxAwaitTimeMS: 1000,
  },
  bull: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  }
};

jest.mock('../../config', () => ({
  default: mockConfig
}));

// Integration tests with MongoDB
describe('Notification Server Integration', () => {
  let mongoServer: MongoMemoryServer;
  
  beforeAll(async () => {
    // Set up MongoDB in-memory server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Directly update the mockConfig
    mockConfig.mongodbUri = mongoUri;
      
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // Clear the database before each test
    await Notification.deleteMany({});
  });
  
  // Test fixture - create a notification directly
  const createTestNotification = async (data = {}) => {
    const defaultData = {
      event: 'message.created',
      documentId: new mongoose.Types.ObjectId().toString(),
      collectionName: 'messages',
      operationType: 'insert',
      payload: { fullDocument: { content: 'Test message content' } },
      status: 'pending'
    };
    
    return await Notification.create({
      ...defaultData,
      ...data
    });
  };
  
  it('should correctly save a notification', async () => {
    const notification = await createTestNotification();
    
    // Verify the notification was created
    expect(notification._id).toBeDefined();
    expect(notification.event).toBe('message.created');
    expect(notification.status).toBe('pending');
    
    // Verify we can find it in the database
    const found = await Notification.findById(notification._id);
    expect(found).not.toBeNull();
    expect(found?.documentId).toBe(notification.documentId);
  });
  
  it('should correctly update a notification status', async () => {
    const notification = await createTestNotification();
    
    // Update the notification status
    await Notification.findByIdAndUpdate(notification._id, {
      status: 'completed',
      processedAt: new Date()
    });
    
    // Verify the update worked
    const updated = await Notification.findById(notification._id);
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('completed');
    expect(updated?.processedAt).toBeDefined();
  });
  
  // Custom assertions for integration tests
  it('should properly format notification for API responses', async () => {
    const notification = await createTestNotification();
    
    // Get the JSON representation (as it would be sent in an API response)
    const json = notification.toJSON();
    
    // Verify the transformation
    expect(json.id).toBeDefined();
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.payload).toEqual({ fullDocument: { content: 'Test message content' } });
  });
  
  // Note: We can't fully test change streams in this environment because
  // MongoMemoryServer doesn't support them properly. A full integration test
  // would require a real MongoDB replica set.
}); 