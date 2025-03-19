# Lerna Monorepo

This is a JavaScript/TypeScript monorepo managed with [Lerna](https://lerna.js.org/), using modern workspace management.

## Project Structure

This monorepo contains multiple packages that are managed together. The packages are located in the `packages/` directory.

## Installation

This project uses modern workspace management (Lerna v7+) which no longer requires the legacy `bootstrap` command.

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later recommended)
- npm (v7 or later) or Yarn (v1.22 or later)

### Installing Dependencies

#### Using npm workspaces (recommended)

```bash
npm install
npx lerna run dev
```

The command will:
- Install all dependencies for all packages
- Automatically link any cross-dependencies between packages
- Create the appropriate node_modules structure
- Start all packages in dev mode


to build all packages:

```bash
npx lerna run build
```

## Publishing

To publish packages to npm:

```bash
npx lerna publish
```

## Additional Resources

- [Lerna Documentation](https://lerna.js.org/)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)

