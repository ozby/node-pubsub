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
cp apps/api-server/.env.example apps/api-server/.env
cp apps/notification-server/.env.example apps/notification-server/.env
```

### Environment Setup

After copying the environment files, open them in your editor to configure any necessary values:

```sh
# Edit the environment files
nano apps/api-server/.env
nano apps/notification-server/.env
```

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