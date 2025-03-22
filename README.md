# Node PubSub Implementation + Dashboard (for FUN)

A Turborepo project that provides a PubSub and corresponding managing dashboard.

## Getting Started

This repository uses [pnpm](https://pnpm.io/) for package management and [Turborepo](https://turbo.build/repo) for build system orchestration.

### Prerequisites

- Node.js 18 or later
- pnpm 8 or later
- Docker and Docker Compose (for local database)

### Installation

```sh
# Install pnpm if you don't have it already
npm install -g pnpm

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
```

### Environment Setup

After copying the environment file, open it in your editor to configure the necessary values:

```sh
# Edit the environment file
nano .env
```

The repository uses a single `.env` file at the root level for all applications. **All required environment variables must be set or the applications will not start**.

#### Required Environment Variables

- `MONGODB_URI`: MongoDB connection string (e.g., `mongodb://localhost:27017/pubsub`)
- `JWT_SECRET`: Secret key for JWT token generation and validation

#### Application-specific Variables

Environment variables are prefixed to indicate which service they apply to:
- Common variables: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`
- API server variables: prefixed with `API_` (e.g., `API_PORT`)
- Notification server variables: prefixed with `NOTIFICATION_` (e.g., `NOTIFICATION_PORT`)

#### Troubleshooting Environment Variables

If you see errors about missing environment variables:

1. Make sure the `.env` file exists in the root directory of the project
2. Verify that it contains all required variables (`MONGODB_URI` and `JWT_SECRET` at minimum)
3. Check for typos in variable names
4. Ensure the file is properly formatted (one variable per line, no spaces around the `=` sign)
5. Restart the application after making changes to the `.env` file

## Development

### Start the Database

```sh
# Start MongoDB and Mongo Express using Docker Compose
docker-compose up -d

# MongoDB will be available at mongodb://localhost:27017
# Mongo Express UI will be available at http://localhost:8081
```

### Run the Applications

```sh
# Start all applications in development mode
pnpm dev

# Build all applications and packages
pnpm build

# Run linting
pnpm lint

# Type checking
pnpm check-types

# Run tests
pnpm test
```

## Workspace Structure

This Turborepo includes the following packages and apps:

### Apps
- `client`: A Vite React application for the PubSub dashboard UI
- `api-server`: An Express server providing the main PubSub API for publishing and subscribing to messages
- `notification-server`: A specialized server that monitors database changes and handles event notifications

### Packages
- `@repo/ui`: A shared UI component library 
- `@repo/eslint-config`: ESLint configurations
- `@repo/typescript-config`: TypeScript configurations
- `@repo/types`: Shared TypeScript types
- `@repo/logger`: Shared logging utilities

## Service Overview

### API Server
The API server handles the core PubSub functionality, including:
- Topic and queue management
- Message publishing and subscribing
- User authentication and authorization
- Dashboard metrics and monitoring

### Notification Server
The notification server is responsible for:
- Monitoring MongoDB change streams to detect data changes
- Processing database events (message creation, updates, queue changes)
- Managing notification records for event tracking
- Providing real-time notification capabilities to connected clients

## Working with the Monorepo

### Running Commands on Specific Workspaces

```sh
# Run a command in a specific workspace
pnpm --filter=client dev
pnpm --filter=api-server dev
pnpm --filter=notification-server dev

# Build a specific package
pnpm --filter=@repo/ui build
```

### Adding Dependencies

```sh
# Add a dependency to a specific workspace
pnpm --filter=client add react-router-dom

# Add a development dependency
pnpm --filter=client add -D @types/react

# Add a workspace dependency
pnpm --filter=client add @repo/ui@workspace:*
```

## Testing

### Running All Tests

```sh
# Run all tests in the repo
pnpm test

# Run tests for a specific package or app
pnpm --filter=api-server test
pnpm --filter=notification-server test
pnpm --filter=client test
```

### Running Specific Tests

```sh
# Run a specific test file in an app or package
pnpm --filter=api-server test src/tests/integration/dashboard.test.ts

# Run tests with Jest options
pnpm --filter=api-server test -- src/tests/integration/dashboard.test.ts --watch

# Run a specific test by name
pnpm --filter=api-server test src/tests/integration/dashboard.test.ts -t "should return server metrics"
```

These commands can be run from the root of the monorepo, so you don't need to change directories.

## License

MIT