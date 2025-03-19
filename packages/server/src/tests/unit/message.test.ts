import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Message from '../../models/Message';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Message.deleteMany({});
});

describe('Message Model', () => {
  it('should create a message with required fields', async () => {
    const messageData = {
      data: { content: 'Test message content' },
      queueId: '507f1f77bcf86cd799439011',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const message = await Message.create(messageData);

    expect(message).toBeDefined();
    expect(message.data).toEqual(messageData.data);
    expect(message.queueId).toBe(messageData.queueId);
    expect(message.visible).toBe(true);
    expect(message.receivedCount).toBe(0);
  });

  it('should not create a message without required fields', async () => {
    const messageData = {
      data: { content: 'Test message content' },
    };

    await expect(Message.create(messageData)).rejects.toThrow();
  });

  it('should handle complex data objects', async () => {
    const complexData = {
      title: 'Test Message',
      content: 'This is a test message',
      priority: 1,
      metadata: {
        source: 'unit-test',
        tags: ['test', 'message', 'unit']
      },
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
    };

    const messageData = {
      data: complexData,
      queueId: '507f1f77bcf86cd799439011',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const message = await Message.create(messageData);
    expect(message.data).toEqual(complexData);
  });

  it('should set default values correctly', async () => {
    const messageData = {
      data: { content: 'Test message content' },
      queueId: '507f1f77bcf86cd799439011',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const message = await Message.create(messageData);
    
    expect(message.visible).toBe(true);
    expect(message.receivedCount).toBe(0);
    expect(message.visibleAt).toBeNull();
  });
}); 