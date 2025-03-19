import request from 'supertest';
import jwt from 'jsonwebtoken';
import User from '../../models/User';
import config from '../../config';
import { setupIntegrationTestEnv, teardownTestEnv, cleanupDatabase, IntegrationTestEnv } from './helpers/setup';

let testEnv: IntegrationTestEnv;

beforeAll(async () => {
  testEnv = await setupIntegrationTestEnv();
});

afterAll(async () => {
  await teardownTestEnv(testEnv);
});

beforeEach(async () => {
  await cleanupDatabase();
});

describe('Dashboard API', () => {
  describe('GET /api/dashboard/server', () => {
    it('should return server metrics with queue statistics', async () => {
      const { app, authToken } = testEnv;
      
      // Create queues using the API endpoint
      const queue1Response = await request(app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Queue 1',
          retentionPeriod: 7
        });
      
      const queue2Response = await request(app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Queue 2',
          retentionPeriod: 14
        });
      
      const queue3Response = await request(app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Queue 3',
          retentionPeriod: 30
        });
      
      const queue1Id = queue1Response.body.data.queue.id;
      const queue2Id = queue2Response.body.data.queue.id;
      const queue3Id = queue3Response.body.data.queue.id;
      
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/messages/${queue1Id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            data: { 
              name: `Message ${i}`,
              content: `Message ${i} for Queue 1` 
            }
          });
      }
      
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/messages/${queue2Id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            data: { 
              name: `Message ${i}`,
              content: `Message ${i} for Queue 2` 
            }
          });
      }
      
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post(`/api/messages/${queue3Id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            data: { 
              name: `Message ${i}`,
              content: `Message ${i} for Queue 3` 
            }
          });
      }

      const response = await request(app)
        .get('/api/dashboard/server')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      
      expect(response.body.data.serverMetrics).toBeDefined();
      expect(response.body.data.stats.totalQueues).toBe(3);
      expect(response.body.data.stats.totalMessages).toBe(10);
      expect(response.body.data.stats.activeMessages).toBeDefined();
    });

    it('should return 401 if not authenticated', async () => {
      const { app } = testEnv;
      
      const response = await request(app).get('/api/dashboard/server');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/dashboard/queues', () => {
    it('should return metrics for all queues owned by the user', async () => {
      const { app, authToken } = testEnv;
      
      const queue1Response = await request(app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Active Queue',
          retentionPeriod: 7
        });
      
      const queue2Response = await request(app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Inactive Queue',
          retentionPeriod: 7
        });

      const activeQueueId = queue1Response.body.data.queue.id;
      const inactiveQueueId = queue2Response.body.data.queue.id;
      
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/messages/${activeQueueId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            data: { 
              name: `Message ${i}`,
              content: `Message ${i} for Active Queue` 
            }
          });
      }

      const response = await request(app)
        .get('/api/dashboard/queues')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2); // Two queues
      expect(response.body.data.queueMetrics).toHaveLength(2);
      
      const activeQueueMetrics = response.body.data.queueMetrics.find(
        (m: any) => m.queueId === activeQueueId
      );
      expect(activeQueueMetrics.messagesSent).toBe(5);
      
      const inactiveQueueMetrics = response.body.data.queueMetrics.find(
        (m: any) => m.queueId === inactiveQueueId
      );
      expect(inactiveQueueMetrics.messagesSent).toBe(0);
    });
  });

  describe('GET /api/dashboard/queues/:queueId', () => {
    it('should return detailed metrics for a specific queue', async () => {
      const { app, authToken } = testEnv;
      
      const queueResponse = await request(app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Queue',
          retentionPeriod: 7
        });
      
      const queueId = queueResponse.body.data.queue.id;
      
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post(`/api/messages/${queueId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            data: { 
              name: `Message ${i}`,
              content: `Message ${i}` 
            }
          });
      }
      
      await request(app)
        .get(`/api/messages/${queueId}?maxMessages=3`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .get(`/api/dashboard/queues/${queueId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.queueMetrics).toBeDefined();
      expect(response.body.data.queueMetrics.queueId).toBe(queueId);
      expect(response.body.data.queueMetrics.messagesSent).toBe(10);
      expect(response.body.data.queueMetrics.messagesReceived).toBe(3);
      
      // Check stats
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalMessages).toBe(10);
      expect(response.body.data.stats.activeMessages).toBe(7); // 10 total - 3 received
      expect(response.body.data.stats.oldestMessageAge).toBeDefined();
      expect(response.body.data.stats.newestMessageAge).toBeDefined();
    });

    it('should return 404 if queue not found', async () => {
      const { app, authToken } = testEnv;
      
      const response = await request(app)
        .get('/api/dashboard/queues/67d8623086db984659894da4')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });

    it('should return 400 if queue id is invalid', async () => {
      const { app, authToken } = testEnv;
      
      const response = await request(app)
        .get('/api/dashboard/queues/invalid-queue-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 403 if user does not own the queue', async () => {
      const { app, authToken } = testEnv;
      
      const anotherUser = await User.create({
        username: 'anotheruser',
        email: 'another@example.com',
        password: 'password456',
      });
      
      const anotherToken = jwt.sign(
        { userId: anotherUser.id, username: 'anotheruser' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      
      const queueResponse = await request(app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({
          name: 'Another User Queue',
          retentionPeriod: 7
        });
      
      const queueId = queueResponse.body.data.queue.id;
      
      const response = await request(app)
        .get(`/api/dashboard/queues/${queueId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
    });
  });
}); 