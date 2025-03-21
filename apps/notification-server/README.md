# Notification Server

The Notification Server is a specialized microservice that processes MongoDB change events from collections and handles them asynchronously. It uses MongoDB's change streams feature to detect database changes and trigger appropriate side effects.

## Features

- **Real-time Monitoring**: Listens to MongoDB change streams to detect collection changes
- **Event Classification**: Categorizes different types of database operations into semantic events
- **Notification Storage**: Records all change events in the database for auditing and tracking
- **Automatic Recovery**: Resumes processing from where it left off after restarts using resume tokens
- **Health Checks**: Provides endpoints to check the service and database health

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (with replica set enabled for change streams)

### Environment Variables

Copy the example environment file and adjust as needed:

```bash
cp .env.example .env
```

Required environment variables:

- `MONGODB_URI`: Connection string for MongoDB
- `JWT_SECRET`: Secret key for JWT token validation
- `PORT`: Port to run the server on (default: 4001)

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

### Development

```bash
# Start in development mode with hot reloading
npm run dev
```

## Testing

The notification server includes comprehensive tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### Test Categories

- **Unit Tests**: Tests for individual components like models and utilities
- **Integration Tests**: Tests for database operations and API endpoints
- **Service Tests**: Tests for the change stream service with mocked MongoDB

*Note: Full change stream testing requires a MongoDB replica set, which is not included in the automated tests.*

## API Endpoints

- `GET /health`: Returns the service health status
- `GET /ready`: Checks if the service is fully ready, including database connection

## Architecture

The notification server works by:

1. Connecting to MongoDB and initializing change streams for selected collections
2. Listening for changes and creating notification records
3. Processing the notifications based on event type
4. Tracking the processing status of each notification

### Watched Collections

- `messages`: For tracking message-related events
- `queues`: For tracking queue-related events

### Event Types

- `message.created`: When a new message is inserted
- `message.updated`: When a message is updated
- `message.deleted`: When a message is deleted
- `queue.created`: When a new queue is created
- `queue.updated`: When a queue is updated

## License

Internal use only 