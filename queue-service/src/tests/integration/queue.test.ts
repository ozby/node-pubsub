import request from 'supertest';

import Queue from '../../models/Queue';
import { setupIntegrationTestEnv, teardownTestEnv, cleanupDatabase, IntegrationTestEnv } from './helpers/setup';
import { createTestQueue, expectSuccessResponse, expectErrorResponse, testUnauthorizedAccess } from './helpers/test-utils';

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

describe('Queue API', () => {
  describe('POST /api/queues', () => {
    it('should create a new queue', async () => {
      const queueData = {
        name: 'Test Queue',
        retentionPeriod: 7,
      };

      const response = await request(testEnv.app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send(queueData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.queue).toBeDefined();
      expect(response.body.data.queue.name).toBe(queueData.name);
      expect(response.body.data.queue.ownerId).toBe(testEnv.userId);
      expect(response.body.data.queue.retentionPeriod).toBe(queueData.retentionPeriod);
    });

    it('should return 400 if name is missing', async () => {
      const queueData = {
        retentionPeriod: 7,
      };

      const response = await request(testEnv.app)
        .post('/api/queues')
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send(queueData);

      expectErrorResponse(response, 400);
    });

    it('should return 401 if not authenticated', async () => {
      const queueData = {
        name: 'Test Queue',
        retentionPeriod: 7,
      };

      await testUnauthorizedAccess(testEnv, 'post', '/api/queues', queueData);
    });
  });

  describe('GET /api/queues', () => {
    it('should return all queues for the authenticated user', async () => {
      await createTestQueue(testEnv, 'Queue 1');
      await createTestQueue(testEnv, 'Queue 2');

      const response = await request(testEnv.app)
        .get('/api/queues')
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectSuccessResponse(response);
      expect(response.body.results).toBe(2);
      expect(response.body.data.queues).toHaveLength(2);
      expect(response.body.data.queues[0].name).toBe('Queue 1');
      expect(response.body.data.queues[1].name).toBe('Queue 2');
    });

    it('should return 401 if not authenticated', async () => {
      await testUnauthorizedAccess(testEnv, 'get', '/api/queues');
    });
  });

  describe('GET /api/queues/:id', () => {
    it('should return a single queue', async () => {
      const queue = await createTestQueue(testEnv, 'Test Queue');

      const response = await request(testEnv.app)
        .get(`/api/queues/${queue.id}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.queue).toBeDefined();
      expect(response.body.data.queue.id).toBe(queue.id);
      expect(response.body.data.queue.name).toBe('Test Queue');
    });

    it('should return 404 if queue not found', async () => {
      const response = await request(testEnv.app)
        .get(`/api/queues/67d8623086db984659894da4`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);
      expectErrorResponse(response, 404);
    });

    it('should return 400 if queue id is invalid', async () => {
      const response = await request(testEnv.app)
        .get('/api/queues/invalid-queue-id')
        .set('Authorization', `Bearer ${testEnv.authToken}`);
      expectErrorResponse(response, 400);
    });

    it('should return 403 if user does not own the queue', async () => {
      const queue = await Queue.create({
        name: 'Test Queue',
        ownerId: 'another-user',
      });
      const queueId = queue._id.toString();

      const response = await request(testEnv.app)
        .get(`/api/queues/${queueId}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 403);
    });
  });

  describe('DELETE /api/queues/:id', () => {
    it('should delete a queue', async () => {
      const queue = await createTestQueue(testEnv, 'Test Queue');
      const queueId = queue._id;

      const response = await request(testEnv.app)
        .delete(`/api/queues/${queueId}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expect(response.status).toBe(204);

      const deletedQueue = await Queue.findById(queueId);
      expect(deletedQueue).toBeNull();
    });

    it('should return 404 if queue not found', async () => {
      const response = await request(testEnv.app)
        .delete(`/api/queues/67d8623086db984659894da4`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 404);
    });

    it('should return 400 if queue id is invalid', async () => {
      const response = await request(testEnv.app)
        .delete('/api/queues/invalid-queue-id')
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 400);
    });

    it('should return 403 if user does not own the queue', async () => {
      const queue = await Queue.create({
        name: 'Test Queue',
        ownerId: 'another-user',
      });
      const queueId = queue._id.toString();

      const response = await request(testEnv.app)
        .delete(`/api/queues/${queueId}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 403);
    });
  });
}); 