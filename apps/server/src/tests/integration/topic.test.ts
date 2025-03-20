import request from 'supertest';

import Topic from '../../models/Topic';
import User from '../../models/User';
import { setupIntegrationTestEnv, teardownTestEnv, cleanupDatabase, IntegrationTestEnv } from './helpers/setup';
import { createTestQueue, createTestTopic, expectSuccessResponse, expectErrorResponse, testUnauthorizedAccess } from './helpers/test-utils';

let testEnv: IntegrationTestEnv;

beforeAll(async () => {
  testEnv = await setupIntegrationTestEnv();
}, 60000);

afterAll(async () => {
  await teardownTestEnv(testEnv);
});

beforeEach(async () => {
  await cleanupDatabase();
});

describe('Topic API', () => {
  describe('POST /api/topics', () => {
    it('should create a new topic', async () => {
      const response = await request(testEnv.app)
        .post('/api/topics')
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          name: 'Test Topic'
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data.topic).toBeDefined();
      expect(response.body.data.topic.name).toBe('Test Topic');
      expect(response.body.data.topic.id).toBeDefined();
      expect(response.body.data.topic.createdAt).toBeDefined();

      // Check if the topic was actually created in the database
      const topic = await Topic.findById(response.body.data.topic.id);
      expect(topic).toBeDefined();
      expect(topic!.name).toBe('Test Topic');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(testEnv.app)
        .post('/api/topics')
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({});

      expectErrorResponse(response, 400);
    });

    it('should return 401 if not authenticated', async () => {
      await testUnauthorizedAccess(testEnv, 'post', '/api/topics', {
        name: 'Test Topic'
      });
    });
  });

  describe('GET /api/topics', () => {
    it('should get all topics owned by the user', async () => {
      // Create some topics
      const topic1 = await createTestTopic(testEnv, 'Topic 1');
      const topic2 = await createTestTopic(testEnv, 'Topic 2');
      const topic3 = await createTestTopic(testEnv, 'Topic 3');

      const response = await request(testEnv.app)
        .get('/api/topics')
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectSuccessResponse(response);
      expect(response.body.results).toBe(3);
      expect(response.body.data.topics).toHaveLength(3);
      
      // Check if the topics are correctly returned
      const topicIds = response.body.data.topics.map((t: any) => t.id);
      expect(topicIds).toContain(topic1.id);
      expect(topicIds).toContain(topic2.id);
      expect(topicIds).toContain(topic3.id);
    });

    it('should return 401 if not authenticated', async () => {
      await testUnauthorizedAccess(testEnv, 'get', '/api/topics');
    });
  });

  describe('GET /api/topics/:id', () => {
    it('should get a single topic by ID', async () => {
      // Create a topic
      const topic = await createTestTopic(testEnv);

      const response = await request(testEnv.app)
        .get(`/api/topics/${topic.id}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.topic).toBeDefined();
      expect(response.body.data.topic.id).toBe(topic.id);
      expect(response.body.data.topic.name).toBe('TestTopic');
    });

    it('should return 400 if topic id is invalid', async () => {
      const response = await request(testEnv.app)
        .get('/api/topics/invalid-topic-id')
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 400);
    });

    it('should return 404 if topic not found', async () => {
      const validNonExistentObjectId = '507f1f77bcf86cd799439011';
      const response = await request(testEnv.app)
        .get(`/api/topics/${validNonExistentObjectId}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 404);
    });

    it('should return 401 if not authenticated', async () => {
      const topic = await createTestTopic(testEnv);
      await testUnauthorizedAccess(testEnv, 'get', `/api/topics/${topic.id}`);
    });
  });

  describe('POST /api/topics/:topicId/subscribe', () => {
    it('should subscribe a queue to a topic', async () => {
      // Create a queue and a topic
      const queue = await createTestQueue(testEnv, 'Test Queue');
      const topic = await createTestTopic(testEnv);

      const response = await request(testEnv.app)
        .post(`/api/topics/${topic.id}/subscribe`)
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          queueId: queue.id
        });

      expectSuccessResponse(response);
      
      // Check if the subscription was created in the database
      const updatedTopic = await Topic.findById(topic.id);
      expect(updatedTopic!.subscribedQueues).toContain(queue.id);
    });

    it('should allow multiple queues to subscribe to a topic', async () => {
      // Create two queues and a topic
      const queue1 = await createTestQueue(testEnv, 'Queue 1');
      const queue2 = await createTestQueue(testEnv, 'Queue 2');
      const topic = await createTestTopic(testEnv);

      // Subscribe first queue
      await request(testEnv.app)
        .post(`/api/topics/${topic.id}/subscribe`)
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          queueId: queue1.id
        });

      // Subscribe second queue
      const response = await request(testEnv.app)
        .post(`/api/topics/${topic.id}/subscribe`)
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          queueId: queue2.id
        });

      expectSuccessResponse(response);
      
      // Check if both subscriptions were created in the database
      const updatedTopic = await Topic.findById(topic.id);
      expect(updatedTopic!.subscribedQueues).toContain(queue1.id);
      expect(updatedTopic!.subscribedQueues).toContain(queue2.id);
    });

    it('should return 400 if topic id is invalid', async () => {
      // Create a queue
      const queue = await createTestQueue(testEnv);

      const response = await request(testEnv.app)
        .post('/api/topics/invalid-topic-id/subscribe')
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          queueId: queue.id
        });

      expectErrorResponse(response, 400);
    });

    it('should return 400 if queue id is invalid', async () => {
      // Create a topic
      const topic = await createTestTopic(testEnv);

      const response = await request(testEnv.app)
        .post(`/api/topics/${topic.id}/subscribe`)
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          queueId: 'invalid-queue-id'
        });

      expectErrorResponse(response, 400);
    });

    it('should return 401 if not authenticated', async () => {
      // Create a queue and a topic
      const queue = await createTestQueue(testEnv);
      const topic = await createTestTopic(testEnv);

      await testUnauthorizedAccess(testEnv, 'post', `/api/topics/${topic.id}/subscribe`, {
        queueId: queue.id
      });
    });
  });

  describe('POST /api/topics/:topicId/publish', () => {
    it('should publish a message to all subscribed queues', async () => {
      // Create two queues and a topic
      const queue1 = await createTestQueue(testEnv, 'Queue 1');
      const queue2 = await createTestQueue(testEnv, 'Queue 2');

      // Create a topic with subscribed queues
      const topic = await Topic.create({
        name: 'Test Topic',
        ownerId: testEnv.userId,
        subscribedQueues: [queue1.id, queue2.id]
      });

      const messageBody = {
        name: 'Test Message',
        content: 'Hello, world!'
      };

      const response = await request(testEnv.app)
        .post(`/api/topics/${topic.id}/publish`)
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          data: messageBody
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data.messages).toBeDefined();
      expect(response.body.data.messages.length).toBeGreaterThan(0);
      
      // Check if the messages were added to both queues
      const messages1 = await request(testEnv.app)
        .get(`/api/messages/${queue1.id}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);
      
      const messages2 = await request(testEnv.app)
        .get(`/api/messages/${queue2.id}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);
      
      expect(messages1.body.data.messages).toHaveLength(1);
      expect(messages2.body.data.messages).toHaveLength(1);
      expect(messages1.body.data.messages[0].data.content).toBe('Hello, world!');
      expect(messages2.body.data.messages[0].data.content).toBe('Hello, world!');
    });

    it('should return 404 if topic not found', async () => {
      const validNonExistentObjectId = '507f1f77bcf86cd799439011';
      const response = await request(testEnv.app)
        .post(`/api/topics/${validNonExistentObjectId}/publish`)
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          data: {
            name: 'Test Message',
            content: 'Hello, world!'
          }
        });

      expectErrorResponse(response, 404);
    });

    it('should return 400 if topic id is invalid', async () => {
      const response = await request(testEnv.app)
        .post('/api/topics/invalid-topic-id/publish')
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          data: {
            name: 'Test Message',
            content: 'Hello, world!'
          }
        });

      expectErrorResponse(response, 400);
    });

    it('should return 400 if no subscribers', async () => {
      // Create a topic with no subscribers
      const topic = await createTestTopic(testEnv);

      const response = await request(testEnv.app)
        .post(`/api/topics/${topic.id}/publish`)
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          data: {
            name: 'Test Message',
            content: 'Hello, world!'
          }
        });

      expectErrorResponse(response, 400);
    });

    it('should return 403 if user does not own the topic', async () => {
      // Create another user
      const anotherUser = await User.create({
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'password456',
      });
      
      // Create a topic owned by the other user
      const topic = await Topic.create({
        name: 'Another User Topic',
        ownerId: anotherUser.id
      });

      const response = await request(testEnv.app)
        .post(`/api/topics/${topic.id}/publish`)
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          data: {
            name: 'Test Message',
            content: 'Hello, world!'
          }
        });

      expectErrorResponse(response, 403);
    });

    it('should return 401 if not authenticated', async () => {
      // Create a topic
      const topic = await createTestTopic(testEnv);

      await testUnauthorizedAccess(testEnv, 'post', `/api/topics/${topic.id}/publish`, {
        data: {
          name: 'Test Message',
          content: 'Hello, world!'
        }
      });
    });
  });
}); 