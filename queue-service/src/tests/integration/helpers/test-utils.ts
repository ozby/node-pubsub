import request from 'supertest';
import Queue from '../../../models/Queue';
import Topic from '../../../models/Topic';
import { IntegrationTestEnv } from './setup';

/**
 * Creates a test queue with the given name
 */
export const createTestQueue = async (testEnv: IntegrationTestEnv, name: string = 'TestQueue') => {
  return await Queue.create({
    name,
    ownerId: testEnv.userId,
    retentionPeriod: 7
  });
};

/**
 * Creates a test topic with the given name
 */
export const createTestTopic = async (testEnv: IntegrationTestEnv, name: string = 'TestTopic') => {
  return await Topic.create({
    name,
    ownerId: testEnv.userId,
  });
};

/**
 * Sends a message to a queue via the API
 */
export const sendMessageToQueue = async (testEnv: IntegrationTestEnv, queueId: string, content: string = 'Test message content') => {
  return await request(testEnv.app)
    .post(`/api/messages/${queueId}`)
    .set('Authorization', `Bearer ${testEnv.authToken}`)
    .send({
      data: {
        name: 'Test Message',
        content
      }
    });
};

/**
 * Check for a successful API response with the expected status code
 */
export const expectSuccessResponse = (response: any, statusCode: number = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.status).toBe('success');
  return response.body;
};

/**
 * Check for an error API response with the expected status code
 */
export const expectErrorResponse = (response: any, statusCode: number) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.status).toBe('error');
  return response.body;
};

/**
 * Makes an authenticated API request
 */
export const authenticatedRequest = (testEnv: IntegrationTestEnv, method: 'get' | 'post' | 'put' | 'delete', url: string) => {
  return request(testEnv.app)[method](url)
    .set('Authorization', `Bearer ${testEnv.authToken}`);
};

/**
 * Utility to check for unauthorized access
 */
export const testUnauthorizedAccess = async (testEnv: IntegrationTestEnv, method: 'get' | 'post' | 'put' | 'delete', url: string, body?: any) => {
  const req = request(testEnv.app)[method](url);
  
  if (body && (method === 'post' || method === 'put')) {
    req.send(body);
  }
  
  const response = await req;
  return expectErrorResponse(response, 401);
}; 