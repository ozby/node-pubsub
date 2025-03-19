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

## CI/CD Workflow

This project uses GitHub Actions for continuous integration and deployment:

### Automated Checks

- **Linting**: All packages are linted using the configured ESLint rules
- **Testing**: All packages' tests are run automatically

### When Checks Run

- On push to main, master, and develop branches
- On all pull requests to these branches
- Manually via workflow dispatch

### Pre-commit Hooks

This repository also uses Husky to run linting and tests locally before commits:

```bash
# This runs automatically on git commit
npx lerna run lint
npx lerna run test
```

You can bypass hooks if necessary using:

```bash
git commit -m "Your message" --no-verify
```

### GitHub Actions Workflows

- `ci.yml` - Main CI workflow that runs lint and test for all packages
- `pr-feedback.yml` - Provides detailed lint results as PR comments
- `test-feedback.yml` - Provides detailed test results as PR comments

