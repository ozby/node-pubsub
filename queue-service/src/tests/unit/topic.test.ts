import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Topic from '../../models/Topic';

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
  await Topic.deleteMany({});
});

describe('Topic Model', () => {
  it('should create a topic with required fields', async () => {
    const topicData = {
      name: 'Test Topic',
      ownerId: 'user123',
    };

    const topic = await Topic.create(topicData);

    expect(topic).toBeDefined();
    expect(topic.name).toBe(topicData.name);
    expect(topic.ownerId).toBe(topicData.ownerId);
    expect(topic.subscribedQueues).toEqual([]); // Default value
  });

  it('should not create a topic without required fields', async () => {
    const topicData = {
      // Missing name
      ownerId: 'user123',
    };

    await expect(Topic.create(topicData)).rejects.toThrow();
  });

  it('should add queue subscriptions correctly', async () => {
    const topicData = {
      name: 'Test Topic',
      ownerId: 'user123',
      subscribedQueues: ['queue1', 'queue2'],
    };

    const topic = await Topic.create(topicData);
    
    expect(topic.subscribedQueues).toHaveLength(2);
    expect(topic.subscribedQueues).toContain('queue1');
    expect(topic.subscribedQueues).toContain('queue2');
  });

  it('should update queue subscriptions', async () => {
    // Create a topic
    const topic = await Topic.create({
      name: 'Test Topic',
      ownerId: 'user123',
    });

    // Update subscriptions
    topic.subscribedQueues = ['queue1', 'queue2', 'queue3'];
    await topic.save();

    // Fetch updated topic
    const updatedTopic = await Topic.findById(topic.id);
    
    expect(updatedTopic).toBeDefined();
    expect(updatedTopic!.subscribedQueues).toHaveLength(3);
    expect(updatedTopic!.subscribedQueues).toContain('queue3');
  });
}); 