#!/usr/bin/env bun

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);

type ResolvePackageJson = (specifier: string) => string;

type SpawnLike = (
  command: string,
  args: readonly string[],
  options: { env: NodeJS.ProcessEnv; stdio: "inherit" },
) => SpawnSyncReturns<Buffer>;

export function resolveAgentKitCliEntry(
  resolvePackageJson: ResolvePackageJson = (specifier) => require.resolve(specifier),
): string {
  const packageJson = resolvePackageJson("@webpresso/agent-kit/package.json");
  return resolve(dirname(packageJson), "src/cli/cli.ts");
}

type RoutedInvocation = {
  command: string;
  args: readonly string[];
};

export function routeInvocation(
  rawArgs: readonly string[],
  resolvePackageJson: ResolvePackageJson = (specifier) => require.resolve(specifier),
): RoutedInvocation {
  const [root, ...rest] = rawArgs;
  const cliEntry = resolveAgentKitCliEntry(resolvePackageJson);

  // Legacy alias: `agent <subcmd>` used to dispatch to a different bin, so
  // existing call sites pass it. Strip the prefix and run the rest on ak.
  if (root === "agent") {
    return { command: cliEntry, args: rest };
  }
  return { command: cliEntry, args: rawArgs };
}

export function runWebpressoCli(
  args: readonly string[],
  options: {
    resolvePackageJson?: ResolvePackageJson;
    spawn?: SpawnLike;
    env?: NodeJS.ProcessEnv;
  } = {},
): number {
  const invocation = routeInvocation(args, options.resolvePackageJson);
  const spawn = options.spawn ?? spawnSync;
  const result = spawn(invocation.command, invocation.args, {
    env: options.env ?? process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);

if (isDirectRun) {
  process.exit(runWebpressoCli(process.argv.slice(2)));
}
