import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';

import config from './config';
import { connectDatabase } from './utils/db';
import changeStreamService from './services/ChangeStreamService';
import logger from './utils/logger';
async function startServer() {
  logger.info('Starting notification server...');
  
  // Connect to MongoDB
  try {
    await connectDatabase();
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
  
  // Create Express app
  const app = express();
  
  // Apply middlewares
  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));
  
  // Basic routes
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  app.get('/ready', async (req, res) => {
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
  
  // Initialize change stream service
  try {
    await changeStreamService.initialize();
    logger.info('Change Stream Service initialized');
  } catch (error) {
    logger.error('Failed to initialize Change Stream Service', error);
    // Continue anyway - we'll retry connections automatically
  }
  
  // Start server
  const server = app.listen(config.port, () => {
    logger.info(`Notification server listening on port ${config.port}`);
  });
  
  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down notification server...');
    
    // Close change streams first
    try {
      await changeStreamService.close();
    } catch (error) {
      logger.error('Error closing change streams:', error);
    }
    
    // Close database connection
    try {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
    }
    
    // Close server
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    
    // Force close if graceful shutdown fails
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
}); 