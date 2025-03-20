import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/queue-service',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-key-for-development-only',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  defaultRetentionPeriod: parseInt(process.env.DEFAULT_RETENTION_PERIOD || '14', 10),
  visibilityTimeout: 30,
  messageRateLimit: {
    windowMs: 60 * 1000,
    max: 100,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  } else {
    console.warn(`Warning: Missing recommended environment variables: ${missingEnvVars.join(', ')}`);
  }
}

export default config;