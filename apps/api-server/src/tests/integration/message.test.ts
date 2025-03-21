import request from 'supertest';

import Message from '../../models/Message';
import { setupIntegrationTestEnv, teardownTestEnv, cleanupDatabase, IntegrationTestEnv } from './helpers/setup';
import { createTestQueue, sendMessageToQueue, expectSuccessResponse, expectErrorResponse, testUnauthorizedAccess } from './helpers/test-utils';

let testEnv: IntegrationTestEnv;

describe('Message API', () => {
  beforeAll(async () => {
    testEnv = await setupIntegrationTestEnv();
  }, 60000);

  afterAll(async () => {
    await teardownTestEnv(testEnv);
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/messages/:queueId', () => {
    it('should send a message to a queue', async () => {
      const queue = await createTestQueue(testEnv);
      
      const response = await sendMessageToQueue(testEnv, queue.id, 'This is a test message');

      expectSuccessResponse(response, 201);
      expect(response.body.data.message).toBeDefined();
      expect(response.body.data.message.data.content).toBe('This is a test message');

      const messages = await Message.find({ queueId: queue.id }) as any[];
      expect(messages.length).toBe(1);
      expect(messages[0].data.content).toBe('This is a test message');
    });

    it('should return 404 if queue not found', async () => {
      const validNonExistentObjectId = '507f1f77bcf86cd799439011';
      const response = await request(testEnv.app)
        .post(`/api/messages/${validNonExistentObjectId}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          data: { 
            name: 'Test Message',
            content: 'Hello, world!' 
          }
        });

      expectErrorResponse(response, 404);
    });

    it('should return 400 if message body is missing', async () => {
      const queue = await createTestQueue(testEnv);

      const response = await request(testEnv.app)
        .post(`/api/messages/${queue.id}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({});

      expectErrorResponse(response, 400);
    });

    it('should return 401 if not authenticated', async () => {
      const queue = await createTestQueue(testEnv);
      
      await testUnauthorizedAccess(testEnv, 'post', `/api/messages/${queue.id}`, {
        data: { 
          name: 'Test Message',
          content: 'Hello, world!' 
        }
      });
    });

    it('should return 400 if queue id is invalid', async () => {
      const response = await request(testEnv.app)
        .post('/api/messages/invalid-queue-id')
        .set('Authorization', `Bearer ${testEnv.authToken}`)
        .send({
          data: { 
            name: 'Test Message',
            content: 'Hello, world!' 
          }
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('GET /api/messages/:queueId', () => {
    it('should receive messages from a queue', async () => {
      const queue = await createTestQueue(testEnv);

      for (let i = 0; i < 5; i++) {
        await sendMessageToQueue(testEnv, queue.id, `Message content ${i}`);
      }

      const response = await request(testEnv.app)
        .get(`/api/messages/${queue.id}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectSuccessResponse(response);
      expect(response.body.results).toBeGreaterThanOrEqual(5);
      expect(response.body.data.messages.length).toBeGreaterThanOrEqual(5);
      expect(response.body.data.visibilityTimeout).toBeDefined();
      
      const messageContents = response.body.data.messages.map((msg: any) => msg.data.content);
      for (let i = 0; i < 5; i++) {
        expect(messageContents).toContain(`Message content ${i}`);
      }
    });

    it('should respect maxMessages parameter', async () => {
      const queue = await createTestQueue(testEnv);

      for (let i = 0; i < 5; i++) {
        await sendMessageToQueue(testEnv, queue.id, `Message content ${i}`);
      }

      const response = await request(testEnv.app)
        .get(`/api/messages/${queue.id}?maxMessages=2`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectSuccessResponse(response);
      expect(response.body.results).toBe(2);
      expect(response.body.data.messages).toHaveLength(2);
      
      const secondResponse = await request(testEnv.app)
        .get(`/api/messages/${queue.id}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expect(secondResponse.body.results).toBe(3);
    });

    it('should respect visibilityTimeout parameter', async () => {
      const queue = await createTestQueue(testEnv);

      await sendMessageToQueue(testEnv, queue.id, 'This is a test message');

      const response = await request(testEnv.app)
        .get(`/api/messages/${queue.id}?visibilityTimeout=1`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.visibilityTimeout).toBe(1);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const secondResponse = await request(testEnv.app)
        .get(`/api/messages/${queue.id}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);
        
      expect(secondResponse.status).toBe(200);
    });

    it('should return 404 if queue not found', async () => {
      const validNonExistentObjectId = '507f1f77bcf86cd799439011';
      const response = await request(testEnv.app)
        .get(`/api/messages/${validNonExistentObjectId}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 404);
    });

    it('should return 400 if queue not found with invalid format', async () => {
      const response = await request(testEnv.app)
        .get('/api/messages/invalid-queue-id')
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 400);
    });

    it('should return 401 if not authenticated', async () => {
      const queue = await createTestQueue(testEnv);
      await testUnauthorizedAccess(testEnv, 'get', `/api/messages/${queue.id}`);
    });
  });

  describe('DELETE /api/messages/:queueId/:messageId', () => {
    it('should delete a message', async () => {
      const queue = await createTestQueue(testEnv);

      const sendResponse = await sendMessageToQueue(testEnv, queue.id, 'This is a test message');
      const messageId = sendResponse.body.data.message.id;

      const response = await request(testEnv.app)
        .delete(`/api/messages/${queue.id}/${messageId}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expect(response.status).toBe(204);
      
      const message = await Message.findById(messageId);
      expect(message).toBeNull();
    });

    it('should return 404 if message not found', async () => {
      const queue = await createTestQueue(testEnv);
      const validNonExistentObjectId = '507f1f77bcf86cd799439011';

      const response = await request(testEnv.app)
        .delete(`/api/messages/${queue.id}/${validNonExistentObjectId}`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 404);
    });

    it('should return 404 if queue not found', async () => {
      const validNonExistentObjectId = '507f1f77bcf86cd799439011';
      const response = await request(testEnv.app)
        .delete(`/api/messages/${validNonExistentObjectId}/507f1f77bcf86cd799439012`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 404);
    });

    it('should return 401 if not authenticated', async () => {
      const queue = await createTestQueue(testEnv);
      await testUnauthorizedAccess(testEnv, 'delete', `/api/messages/${queue.id}/invalid-message-id`);
    });

    it('should return 400 if message ID has invalid format', async () => {
      const queue = await createTestQueue(testEnv);

      const response = await request(testEnv.app)
        .delete(`/api/messages/${queue.id}/invalid-message-id`)
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 400);
    });

    it('should return 400 if queue ID has invalid format', async () => {
      const response = await request(testEnv.app)
        .delete('/api/messages/invalid-queue-id/invalid-message-id')
        .set('Authorization', `Bearer ${testEnv.authToken}`);

      expectErrorResponse(response, 400);
    });
  });
});