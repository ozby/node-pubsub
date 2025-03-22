// This file sets up the environment variables needed for testing
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'your-secure-jwt-key-for-testing';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DEFAULT_RETENTION_PERIOD = '14';
process.env.CORS_ORIGIN = '*';
process.env.JEST_WORKER_ID = '1'; 