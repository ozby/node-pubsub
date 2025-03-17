# Queue Service

A simple queue service similar to AWS SQS or Google PubSub, implemented with TypeScript, Express, and MongoDB.

## Features

- Create new queues with unique URLs
- Send and receive messages through queues
- Poll queues for messages
- Push notifications using WebSockets
- Message retention policies
- Schema validation for messages
- Topics for multicasting messages to multiple queues
- JWT Authentication
- Monitoring dashboard
- Load testing capabilities

## Prerequisites

- Node.js (v14+)
- MongoDB
- npm

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd queue-service
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on the `.env.example` file:
```bash
cp .env.example .env
```

4. Start MongoDB:
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Development

Start the development server:
```bash
npm run dev
```

## Testing

Run the tests:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

## Load Testing

Run the load tests:
```bash
npm run load-test
```

## Building

Build the project:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## API Documentation

### Queues
- `POST /api/queues`: Create a new queue
- `GET /api/queues`: List all queues
- `GET /api/queues/:id`: Get queue details
- `DELETE /api/queues/:id`: Delete a queue

### Messages
- `POST /api/queues/:id/messages`: Send a message to a queue
- `GET /api/queues/:id/messages`: Receive messages (polling)
- `DELETE /api/queues/:id/messages/:messageId`: Delete a message

### Topics
- `POST /api/topics`: Create a new topic
- `GET /api/topics`: List all topics
- `POST /api/topics/:id/publish`: Publish a message to a topic
- `POST /api/topics/:id/subscribe`: Subscribe a queue to a topic

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login and get JWT token

## License

ISC 