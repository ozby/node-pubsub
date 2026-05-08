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

export function resolvePackageEntry(
  packageName: "@webpresso/cli" | "@webpresso/agent-kit",
  resolvePackageJson: ResolvePackageJson = (specifier) => require.resolve(specifier),
): string {
  const cliPackageJson = resolvePackageJson(`${packageName}/package.json`);
  const cliDir = dirname(cliPackageJson);
  return packageName === "@webpresso/cli"
    ? resolve(cliDir, "../host/src/bin/webpresso.ts")
    : resolve(cliDir, "src/cli/cli.ts");
}

export function resolveWebpressoCliEntry(
  resolvePackageJson: ResolvePackageJson = (specifier) => require.resolve(specifier),
): string {
  return resolvePackageEntry("@webpresso/cli", resolvePackageJson);
}

export function resolveAgentKitCliEntry(
  resolvePackageJson: ResolvePackageJson = (specifier) => require.resolve(specifier),
): string {
  return resolvePackageEntry("@webpresso/agent-kit", resolvePackageJson);
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

  if (root === "agent") {
    return {
      command: resolveAgentKitCliEntry(resolvePackageJson),
      args: rest,
    };
  }

  if (root === "blueprint" || root === "roadmap") {
    return {
      command: resolveAgentKitCliEntry(resolvePackageJson),
      args: rawArgs,
    };
  }

  return {
    command: resolveWebpressoCliEntry(resolvePackageJson),
    args: rawArgs,
  };
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
