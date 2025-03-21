# Node PubSub Dashboard

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
cp apps/server/.env.example apps/server/.env
```

### Environment Setup

After copying the environment file, open it in your editor to configure any necessary values:

```sh
# Edit the environment file
nano apps/server/.env
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
- `api`: An Express server for backend services

### Packages
- `@repo/ui`: A shared UI component library 
- `@repo/eslint-config`: ESLint configurations
- `@repo/typescript-config`: TypeScript configurations
- `@repo/types`: Shared TypeScript types

## Working with the Monorepo

### Running Commands on Specific Workspaces

```sh
# Run a command in a specific workspace
pnpm --filter=client dev
pnpm --filter=api dev

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

## License

MIT

## Testing

### Running All Tests

```sh
# Run all tests in the repo
pnpm test

# Run tests for a specific package or app
pnpm --filter=server test
pnpm --filter=client test
```

### Running Specific Tests

```sh
# Run a specific test file in an app or package
pnpm --filter=server test src/tests/integration/dashboard.test.ts

# Run tests with Jest options
pnpm --filter=server test -- src/tests/integration/dashboard.test.ts --watch

# Run a specific test by name
pnpm --filter=server test src/tests/integration/dashboard.test.ts -t "should return server metrics"
```

These commands can be run from the root of the monorepo, so you don't need to change directories.
