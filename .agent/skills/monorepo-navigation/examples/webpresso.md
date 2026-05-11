---
name: monorepo-navigation
description: Navigate Webpresso monorepo efficiently. Knows package structure, where to find code, dynamic targeting patterns, and cross-package dependencies. Use when unsure where code lives, doing simple read-only file/symbol/pattern lookup, finding imports, or working across packages.
---

<!--
Example monorepo-navigation content for reference. Not used at runtime.
Delete if not useful.
-->

# Monorepo Navigation Guide

## Package Structure

### Core Packages

| Package           | Path                                  | Purpose                         | Common Files                                    |
| ----------------- | ------------------------------------- | ------------------------------- | ----------------------------------------------- |
| **platform-api**  | `apps/platform/workers/platform-api/` | Main API, GraphQL, handlers     | `src/routes/`, `src/handlers/`, `src/services/` |
| **platform-web**  | `apps/platform/web/platform-web/`     | Platform web UI                 | `app/routes/`, `app/components/`                |
| **admin-api**     | `apps/platform/workers/admin-api/`    | Admin API                       | `src/routes/`, `src/services/`                  |
| **admin-web**     | `apps/platform/web/admin-web/`        | Admin web UI                    | `app/routes/`, `app/components/`                |
| **schema-engine** | `packages/sdk/schema-engine/`         | Entity schemas, GraphQL codegen | `src/`, emitters                                |
| **database**      | `packages/core/database/`             | Drizzle schemas, migrations     | `src/schemas/`, `migrations/`                   |
| **test-utils**    | `packages/core/test-utils/`           | Test utilities, mocks           | `src/`, `src/playwright/`                       |
| **cli2**          | `apps/cli2/`                          | CLI tool, just commands         | `src/commands/`, `src/lib/`                     |

### Key Locations

**API Routes**: `apps/workers/*/src/routes/` (Hono routes)
**Services**: `apps/workers/*/src/services/` (business logic)
**Database Queries**: Look in services or `packages/core/database/`
**GraphQL Actions**: `apps/platform/workers/platform-api/src/handlers//`
**Frontend Routes**: `apps/web/*/app/routes/`
**Shared Components**: `packages/core/ui/src/components/`
**Generated Package**: `.webpresso/generated/` (physical root, exposed as workspace package `@repo/generated`)

## Preferred Inspection Flow

For simple read-only repo inspection, use the lightest reliable tool first:

1. Prefer `omx explore` first when available for direct file/symbol/pattern lookup.
2. Fall back to shell-native tools when needed:
   - `rg -n` for content/symbol search
   - `sed -n '120,170p' file.ts` for exact line ranges
   - `fd pattern path` for filename/path discovery when installed
   - `bat --paging=never -n file.ts` for readable file views when installed
3. Keep ad hoc scripts for structured extraction or multi-file reshaping, not simple reads.

## Finding Code

### I need to find...

**A specific API endpoint**

```bash
# Search route files
rg -n "POST.*deploy" apps/platform/workers/platform-api/src/routes/

# Or check handlers
rg -n "deploy" apps/platform/workers/platform-api/src/handlers/
```

**Where a function is defined**

```bash
# Find definition
rg -n "function createProject" apps/workers/*/src/ packages/*/src/
rg -n "export function.*createProject" apps/workers/*/src/ packages/*/src/
```

**Database schema for an entity**

```bash
# Find likely files first
rg --files packages/core/database packages/sdk/schema-engine | rg 'project'

# Or in schema-engine
rg -n "table.*projects" packages/core/database packages/sdk/schema-engine
```

**GraphQL resolver**

```bash
# Actions are in platform-api
rg -n "projects:" apps/platform/workers/platform-api/src/handlers/
```

## Cross-Package Import Patterns

### Importing from Other Packages

```typescript
// From generated artifacts (real workspace package rooted at .webpresso/generated/)
import { projectFragment } from "@repo/generated/graphql";
import * as schema from "@repo/generated/drizzle/schemas";

// From test-utils
import { createIntegrationContext } from "@repo/test-utils";
import { projectsFactory } from "@repo/generated/factories";

// From database
import { db } from "@repo/database/client";
import { projects } from "@repo/database/schemas";

// From ui (shared components)
import { Button } from "@webpresso/ui";
```

### Package Names

Two npm scopes coexist after the `6 degrees of seperation` rename:

- Internal workspace packages use `@repo/*` scope (e.g. `@repo/platform-api`, `@repo/platform-web`, `@repo/chef`, `@repo/neon`, `@repo/e2e`, `@repo/docs-linter`)
- Externally published packages keep `@webpresso/*` scope (e.g. `@webpresso/schema-engine`, `@webpresso/cli-wp`, `@webpresso/agent-kit`, `@webpresso/ui`, `@repo/generated`)

Short names in just commands: `platform-api`, `schema-engine`, `cli2` (slug only, no scope)

## Dynamic Targeting

All `just` commands support dynamic targeting:

```bash
# By package name
just test platform-api
just lint schema-engine

# By file path
just test apps/platform/workers/platform-api/src/services/project.ts
just lint BLUEPRINT-COMMANDS-REMOVED

# By category
just test platform     # All platform packages
just test admin        # All admin packages

# Multiple packages
just test cli2,schema-engine
```

## Common Workflows

### Adding a New API Endpoint

1. **Route**: `apps/platform/workers/platform-api/src/routes/<feature>.ts`
2. **Service**: `apps/platform/workers/platform-api/src/services/<feature>-service.ts`
3. **Handler**: `apps/platform/workers/platform-api/src/handlers/<feature>-handlers.ts`
4. **Test**: `apps/platform/workers/platform-api/src/services/<feature>-service.integration.test.ts`

### Adding a Database Query

1. Check `packages/core/database/` for existing patterns
2. Add query function using Drizzle
3. Test with `createIntegrationContext()`

### Modifying GraphQL Schema

1. Edit entity YAML: `webpresso/entities/<entity>.yaml`
2. Run `just schema-compile`
3. Check generated artifacts in `.webpresso/generated/`
4. Import generated consumer surfaces via `@repo/generated/*` instead of deep relative paths
5. Test with integration tests

## Dependency Graph

**Upstream** (used by many):

- `packages/schema-engine` - All packages use generated code
- `packages/database` - All API packages
- `packages/ui` - All web packages

**Downstream** (uses many):

- `apps/platform/workers/platform-api` - Uses database, schema-engine
- `apps/platform/web/platform-web` - Uses schema-engine, ui

## Finding Related Code

### Something changed in database schema

Check these locations:

1. `packages/core/database/` - Source of truth
2. `.webpresso/generated/drizzle/` - Generated
3. `apps/workers/*/src/services/` - Services that use the schema
4. `apps/platform/workers/platform-api/src/handlers/` - GraphQL resolvers / action handlers

### GraphQL query not working

1. Check generated fragments: `.webpresso/generated/graphql/fragments/`
2. Verify resolver: `apps/platform/workers/platform-api/src/handlers/`
3. Check permissions: `webpresso/permissions/` YAML files

### Frontend not seeing updates

1. Regenerate frontend: `just schema-frontend`
2. Check route file: `apps/platform/web/platform-web/app/routes/...`
3. Verify hooks: Look for `useQuery`, `useMutation` from generated code

## File Naming Conventions

| Type             | Pattern                 | Example                               |
| ---------------- | ----------------------- | ------------------------------------- |
| Unit test        | `*.test.ts`             | `slug.test.ts`                        |
| Integration test | `*.integration.test.ts` | `project-service.integration.test.ts` |
| Workers test     | `*.workers.test.ts`     | `websocket.workers.test.ts`           |
| Vitest E2E test  | `*.e2e.ts`              | `worker-admin-chef.e2e.ts`            |
| Playwright spec  | `*.spec.ts`             | `CUJ-02-login.spec.ts`                |
| Service          | `*-service.ts`          | `project-service.ts`                  |
| Handler          | `*-handlers.ts`         | `project-handlers.ts`                 |
| Route            | `*.ts` in routes/       | `projects.ts`                         |
| Factory          | `*Factory`              | `projectsFactory`                     |

## Troubleshooting

**Can't find where something is defined?**

```bash
# Search content first
rg -n "functionName" apps/ packages/ -t ts

# If you only know part of the filename
rg --files apps packages | rg 'function|project|service'

# Read an exact range once you have the file
sed -n '120,170p' apps/platform/workers/platform-api/src/services/project-service.ts
```

**Import not working?**

- Check `package.json` exports field
- Check `package.json` imports field for package-private `#...` mappings, and prefer `@repo/generated/*` for generated artifacts
- Ensure the importing package declares `@repo/generated` in `dependencies`
- Ensure package is built: `just build <package>`
- Check workspace install/link state instead of adding `tsconfig.paths` aliases

**Not sure which package to edit?**

- API logic → `apps/platform/workers/platform-api/`
- UI component → `packages/core/ui/` or specific web app
- Database schema → `packages/core/database/`
- Shared types → `packages/sdk/schema-engine/`
