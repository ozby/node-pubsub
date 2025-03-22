# Notification Server

The Notification Server is a specialized microservice that processes MongoDB change events from collections and handles them asynchronously. It uses MongoDB's change streams feature to detect database changes and trigger appropriate side effects as part of the Node PubSub system.

## Features

- **Real-time Monitoring**: Listens to MongoDB change streams to detect collection changes
- **Event Classification**: Categorizes different types of database operations into semantic events
- **Notification Storage**: Records all change events in the database for auditing and tracking
- **Automatic Recovery**: Resumes processing from where it left off after restarts using resume tokens
- **Health Checks**: Provides endpoints to check the service and database health

## Role in the PubSub System

The notification server complements the API server by:

- Monitoring database changes to trigger event-driven workflows
- Providing real-time notification capabilities for clients
- Handling asynchronous event processing to improve system responsiveness
- Creating an audit trail of system events for troubleshooting and analytics

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (with replica set enabled for change streams)

### Environment Variables

The notification server uses the root-level `.env` file in the monorepo:

```bash
# From the root of the repository
cp .env.example .env
```

Required environment variables for the notification server:

- `MONGODB_URI`: Connection string for MongoDB
- `JWT_SECRET`: Secret key for JWT token validation
- `NOTIFICATION_PORT`: Port to run the server on (default: 4001)

Notification server variables are prefixed with `NOTIFICATION_` to distinguish them from other services.

### Installation

```bash
# From the root of the repository
pnpm install
pnpm build
```

### Running the Server

```bash
# Start in development mode with hot reloading
pnpm --filter=notification-server dev

# Start in production mode
pnpm --filter=notification-server start
```

## Testing

The notification server includes comprehensive tests:

```bash
# Run all tests
pnpm --filter=notification-server test

# Run tests with coverage
pnpm --filter=notification-server test -- --coverage
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

### Code Structure

- `/src/models`: Database models including the Notification schema
- `/src/services`: Core services including the ChangeStreamService
- `/src/routes`: API endpoints for health checks and monitoring
- `/src/utils`: Utility functions for logging, database connection, etc.
- `/src/tests`: Test suites for all components

## Integration with API Server

The notification server works alongside the API server to provide a complete PubSub system:

- API server handles direct client requests for publishing and subscribing
- Notification server monitors the database for changes and handles side effects
- Both servers share the same MongoDB database but operate independently

## Future Enhancements

- WebSocket support for real-time client notifications
- More granular event filtering options
- Support for additional collections and event types
- Performance optimizations for high-volume change streams

## License

Internal use only 