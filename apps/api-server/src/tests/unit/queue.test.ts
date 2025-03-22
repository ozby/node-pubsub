import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Queue from '../../models/Queue';
import config from '../../config';

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
  await Queue.deleteMany({});
});

describe('Queue Model', () => {
  it('should create a queue with default values', async () => {
    const queueData = {
      name: 'Test Queue',
      ownerId: 'test-user',
    };

    const queue = await Queue.create(queueData);

    expect(queue).toBeDefined();
    expect(queue.name).toBe(queueData.name);
    expect(queue.ownerId).toBe(queueData.ownerId);
    expect(queue.retentionPeriod).toBe(config.defaultRetentionPeriod);
    expect(queue.schema).toBeNull();
    expect(queue.pushEndpoint).toBeNull();
  });

  it('should create a queue with custom values', async () => {
    const queueData = {
      name: 'Test Queue',
      ownerId: 'test-user',
      retentionPeriod: 7,
      schema: { type: 'object', properties: { name: { type: 'string' } } },
      pushEndpoint: '',
    };

    const queue = await Queue.create(queueData);

    expect(queue).toBeDefined();
    expect(queue.name).toBe(queueData.name);
    expect(queue.ownerId).toBe(queueData.ownerId);
    expect(queue.retentionPeriod).toBe(queueData.retentionPeriod);
    expect(queue.schema).toEqual(queueData.schema);
    expect(queue.pushEndpoint).toBe(queueData.pushEndpoint);
  });

  it('should not create a queue without required fields', async () => {
    const queueData = {
      ownerId: 'test-user',
    };

    await expect(Queue.create(queueData)).rejects.toThrow();
  });

  it('should enforce minimum retention period', async () => {
    const queueData = {
      name: 'Test Queue',
      ownerId: 'test-user',
      retentionPeriod: 0, // Invalid value
    };

    await expect(Queue.create(queueData)).rejects.toThrow();
  });
}); 