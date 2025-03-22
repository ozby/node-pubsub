import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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

// Define configuration object with strict environment variable requirements
const config = {
  port: parseInt(process.env.NOTIFICATION_PORT || '4001', 10),
  mongodbUri: process.env.MONGODB_URI!,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  jwt: {
    secret: process.env.JWT_SECRET!,
  },
  
  // Change stream options
  changeStream: {
    batchSize: 100,
    fullDocument: 'updateLookup' as const,
    maxAwaitTimeMS: 1000,
  },
};

export default config; 