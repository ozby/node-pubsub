import { describe, expect, it, vi } from "vitest";

import {
  resolveAgentKitCliEntry,
  resolveWebpressoCliEntry,
  routeInvocation,
  runWebpressoCli,
} from "./run-webpresso-cli";

describe("run-webpresso-cli", () => {
  it("resolves the host bin next to the installed @webpresso/cli package", () => {
    const entry = resolveWebpressoCliEntry(() => "/repo/node_modules/@webpresso/cli/package.json");

    expect(entry).toBe("/repo/node_modules/@webpresso/host/src/bin/webpresso.ts");
  });

  it("resolves the agent-kit CLI entry for agent surfaces", () => {
    const entry = resolveAgentKitCliEntry(
      () => "/repo/node_modules/@webpresso/agent-kit/package.json",
    );

    expect(entry).toBe("/repo/node_modules/@webpresso/agent-kit/src/cli/cli.ts");
  });

  it("routes agent and blueprint surfaces through agent-kit", () => {
    const resolvePackageJson = (specifier: string) =>
      specifier === "@webpresso/cli/package.json"
        ? "/repo/node_modules/@webpresso/cli/package.json"
        : "/repo/node_modules/@webpresso/agent-kit/package.json";

    expect(routeInvocation(["agent", "audit", "catalog-drift"], resolvePackageJson)).toEqual({
      command: "/repo/node_modules/@webpresso/agent-kit/src/cli/cli.ts",
      args: ["audit", "catalog-drift"],
    });
    expect(routeInvocation(["blueprint", "audit", "--all"], resolvePackageJson)).toEqual({
      command: "/repo/node_modules/@webpresso/agent-kit/src/cli/cli.ts",
      args: ["blueprint", "audit", "--all"],
    });
  });

  it("spawns the resolved host entrypoint with inherited stdio", () => {
    const spawn = vi.fn(() => ({
      status: 0,
      pid: 1,
      output: [],
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
      signal: null,
    }));
    const resolvePackageJson = (specifier: string) =>
      specifier === "@webpresso/cli/package.json"
        ? "/repo/node_modules/@webpresso/cli/package.json"
        : "/repo/node_modules/@webpresso/agent-kit/package.json";

    const exitCode = runWebpressoCli(["agent", "audit", "catalog-drift"], {
      resolvePackageJson,
      spawn,
      env: { PATH: "/bin" },
    });

    expect(exitCode).toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      "/repo/node_modules/@webpresso/agent-kit/src/cli/cli.ts",
      ["audit", "catalog-drift"],
      {
        env: { PATH: "/bin" },
        stdio: "inherit",
      },
    );
  });
});
