import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  } else {
    console.warn(`Warning: Missing recommended environment variables: ${missingEnvVars.join(', ')}`);
  }
}

// Define configuration object
const config = {
  port: parseInt(process.env.PORT || '4001', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/notification-server',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-key-for-development-only',
  },
  
  // Change stream options
  changeStream: {
    batchSize: 100,
    fullDocument: 'updateLookup' as const,
    maxAwaitTimeMS: 1000,
  },
};

export default config; 