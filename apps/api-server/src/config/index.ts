import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from root .env file
const envPath = path.resolve(__dirname, '../../../.env');

// Check if .env file exists
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error(`Error loading .env file: ${result.error.message}`);
    process.exit(1);
  }
}

// Required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

// Fail if any required environment variables are missing
if (missingEnvVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.error(`Error: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error(`Please set them in the .env file at: ${envPath}`);
  process.exit(1);
}

// Create config object with strict environment variable requirements
const config = {
  port: parseInt(process.env.API_PORT || '4000', 10),
  mongodbUri: process.env.MONGODB_URI!,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  jwt: {
    secret: process.env.JWT_SECRET!,
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

export default config;