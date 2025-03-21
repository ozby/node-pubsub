import mongoose from 'mongoose';
import config from '../config';
import logger from './logger';

/**
 * Connect to MongoDB
 */
export async function connectDatabase(): Promise<void> {
  try {
    // In tests, the config.mongodbUri will be mocked
    // In regular use, we need a fallback if the environment variable is not defined
    const mongoUri = typeof config.mongodbUri === 'string' && config.mongodbUri.length > 0
      ? config.mongodbUri
      : 'mongodb://localhost:27017/notification-server';
      
    await mongoose.connect(mongoUri);
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
    logger.info('Connected to MongoDB');
    
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
} 