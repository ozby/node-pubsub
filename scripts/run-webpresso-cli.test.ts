import { describe, expect, it, vi } from "vitest";

import { resolveAgentKitCliEntry, routeInvocation, runWebpressoCli } from "./run-webpresso-cli";

describe("run-webpresso-cli", () => {
  it("resolves the agent-kit CLI entry from the installed package.json", () => {
    const entry = resolveAgentKitCliEntry(
      () => "/repo/node_modules/@webpresso/agent-kit/package.json",
    );

    expect(entry).toBe("/repo/node_modules/@webpresso/agent-kit/src/cli/cli.ts");
  });

  it("strips the legacy `agent` prefix and routes the rest to agent-kit", () => {
    const resolvePackageJson = () => "/repo/node_modules/@webpresso/agent-kit/package.json";

    expect(routeInvocation(["agent", "audit", "catalog-drift"], resolvePackageJson)).toEqual({
      command: "/repo/node_modules/@webpresso/agent-kit/src/cli/cli.ts",
      args: ["audit", "catalog-drift"],
    });
  });

  it("passes non-`agent` roots through to agent-kit unchanged", () => {
    const resolvePackageJson = () => "/repo/node_modules/@webpresso/agent-kit/package.json";

    expect(routeInvocation(["blueprint", "audit", "--all"], resolvePackageJson)).toEqual({
      command: "/repo/node_modules/@webpresso/agent-kit/src/cli/cli.ts",
      args: ["blueprint", "audit", "--all"],
    });
  });

  it("spawns the resolved agent-kit entrypoint with inherited stdio", () => {
    const spawn = vi.fn(() => ({
      status: 0,
      pid: 1,
      output: [],
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
      signal: null,
    }));
    const resolvePackageJson = () => "/repo/node_modules/@webpresso/agent-kit/package.json";

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
