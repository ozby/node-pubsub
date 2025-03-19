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
```

#### Using Yarn workspaces

```bash
yarn install
```

Either of these commands will:
- Install all dependencies for all packages
- Automatically link any cross-dependencies between packages
- Create the appropriate node_modules structure

### Note for Lerna Users

If you're familiar with older versions of Lerna, note that `lerna bootstrap` is no longer needed or supported in Lerna v7+. The modern workspace-based approach handled by npm or yarn is more efficient and is now the recommended method.

If you absolutely need to use the legacy bootstrap command (not recommended), you can install the `@lerna/legacy-package-management` package, but migrating to the workspace-based approach is strongly recommended.

## Running Scripts

You can run scripts across all packages using Lerna:

```bash
npx lerna run <script-name>
```

For example, to build all packages:

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
- [Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/)

