#!/usr/bin/env bun
/**
 * Probe p15 — Repo sanity: does the unified `webpresso agent` CLI surface
 * actually exist in this repo's workspace, and does it support
 * `agent e2e --suite` as the cutover expects?
 *
 * This is an internal-claim probe: scenario 1a/1b blueprints say
 * `bun ./scripts/run-webpresso-cli.ts agent e2e --suite s1a-correctness` registers and runs
 * the suite. If `webpresso agent` doesn't exist, or doesn't support `--suite`,
 * the suite
 * registration tasks (2.7 / 3.7) are ghosts.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emit } from "./lib/verdict";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..", "..");

const PROBE = "p15-repo-webpresso-agent-cli";
const CLAIM =
  "`bun ./scripts/run-webpresso-cli.ts agent e2e --help` succeeds in this repo and the command accepts a `--suite` argument";

function runCmd(
  cmd: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd: REPO_ROOT });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    const timer = setTimeout(() => proc.kill("SIGTERM"), timeoutMs);
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    proc.on("error", () => {
      clearTimeout(timer);
      resolve({ code: 127, stdout, stderr });
    });
  });
}

async function run(): Promise<void> {
  const help = await runCmd(
    "bun",
    ["./scripts/run-webpresso-cli.ts", "agent", "e2e", "--help"],
    30_000,
  );
  const webpressoAgentExists =
    help.code === 0 || /webpresso agent|agent e2e|--suite/i.test(help.stdout + help.stderr);

  let e2eHelpOk = false;
  let suiteFlagMentioned = false;
  if (webpressoAgentExists) {
    e2eHelpOk = help.code === 0 || /e2e/.test(help.stdout);
    suiteFlagMentioned = /--suite|suite\s+name/i.test(help.stdout + help.stderr);
  }

  const verdict: "CONFIRMED" | "PARTIAL" | "WRONG" = !webpressoAgentExists
    ? "WRONG"
    : suiteFlagMentioned
      ? "CONFIRMED"
      : "PARTIAL";

  await emit({
    probe: PROBE,
    verdict,
    claim: CLAIM,
    evidence: [
      `webpresso-agent-cli-exists=${webpressoAgentExists}`,
      `webpresso-agent-e2e-help-ok=${e2eHelpOk}`,
      `--suite-flag-mentioned=${suiteFlagMentioned}`,
    ].join(" | "),
    citation: "internal: bun ./scripts/run-webpresso-cli.ts agent e2e --help",
  });
  if (verdict === "WRONG") process.exit(1);
}

run().catch(async (err) => {
  await emit({
    probe: PROBE,
    verdict: "UNREACHABLE",
    claim: CLAIM,
    evidence: `threw: ${err instanceof Error ? err.message : String(err)}`,
    citation: "internal: bun ./scripts/run-webpresso-cli.ts agent e2e --help",
  });
  process.exit(2);
});
