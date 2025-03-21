import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

// Create a minimal Express app for testing
const app = express();

// Mock health and ready routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  
  if (isDbConnected) {
    res.status(200).json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } else {
    res.status(503).json({ 
      status: 'not ready', 
      database: 'disconnected',
      timestamp: new Date().toISOString() 
    });
  }
});

describe('Health Routes', () => {
  // Mock mongoose connection readyState
  const originalReadyState = mongoose.connection.readyState;
  
  afterAll(() => {
    // Restore original connection state
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: originalReadyState,
      writable: true
    });
  });
  
  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });
  
  describe('GET /ready', () => {
    it('should return 200 when database is connected', async () => {
      // Mock connected state
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 1,
        writable: true
      });
      
      const response = await request(app).get('/ready');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('connected');
      expect(response.body.timestamp).toBeDefined();
    });
    
    it('should return 503 when database is disconnected', async () => {
      // Mock disconnected state
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 0,
        writable: true
      });
      
      const response = await request(app).get('/ready');
      
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('not ready');
      expect(response.body.database).toBe('disconnected');
      expect(response.body.timestamp).toBeDefined();
    });
  });
}); 