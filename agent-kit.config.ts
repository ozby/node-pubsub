/**
 * agent-kit.config.ts — root configuration for the agent-kit e2e library surface.
 *
 * Registers e2e suites for the consistency lab scenarios.
 * Unified target runner: webpresso agent e2e --suite s1a-correctness
 */
export default {
  e2e: {
    hostAdapterModule: "./apps/workers/src/index.ts",
    suites: [
      {
        name: "s1a-correctness",
        include: ["apps/lab/scenarios/s1a-correctness/test/e2e/**/*.test.ts"],
        description: "Correctness scenario: CfQueues + PgPolling + PostgresDirectNotify paths",
      },
    ],
  },
};
