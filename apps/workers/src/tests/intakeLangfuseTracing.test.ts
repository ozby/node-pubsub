import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SuggestMappingsResult } from "../intake/aiMappingAdapter";
import type { Env } from "../db/client";

// Hoist shared spies so the vi.mock factory can close over them
const { mockScoreCreate, mockFlush } = vi.hoisted(() => ({
  mockScoreCreate: vi.fn(),
  mockFlush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../langfuse/otlp", () => ({
  exportOtlpTrace: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@langfuse/client", () => {
  class MockLangfuseClient {
    score = { create: mockScoreCreate };
    flush = mockFlush;
  }
  return { LangfuseClient: MockLangfuseClient };
});

import { dispatchIntakeTracing } from "../langfuse/intakeTracing";
import { exportOtlpTrace } from "../langfuse/otlp";

const mockExportOtlpTrace = exportOtlpTrace as ReturnType<typeof vi.fn>;

function makeTelemetry() {
  return {
    model: "test-model",
    promptText: "test prompt",
    startedAt: 1000,
    endedAt: 2000,
    durationMs: 1000,
    outputText: '{"suggestions":[]}',
  } as const;
}

function makeDecisionLog() {
  return {
    provider: "test-runner" as const,
    model: "test-model",
    promptVersion: "v1",
    validationOutcome: "passed" as const,
    confidence: { average: 0.9, maximum: 1.0, minimum: 0.8, overall: 0.9 },
    judgeDisagreements: 0,
    judgeUnavailableCount: 0,
  };
}

function makeEnv(overrides?: Partial<Env>): Env {
  return {
    LANGFUSE_PUBLIC_KEY: "pk-lf-test",
    LANGFUSE_SECRET_KEY: "sk-lf-test",
    LANGFUSE_BASE_URL: "https://cloud.langfuse.com",
    ...overrides,
  } as unknown as Env;
}

const TRACE_ID = "123e4567-e89b-12d3-a456-426614174000";
const NORMALIZED_TRACE_ID = "123e4567e89b12d3a456426614174000";

const BASE_INPUT = {
  promptName: "payload-mapper-v1",
  promptVersion: "v1",
  env: makeEnv(),
};

describe("dispatchIntakeTracing", () => {
  beforeEach(() => {
    mockScoreCreate.mockReset();
    mockFlush.mockReset();
    mockFlush.mockResolvedValue(undefined);
    mockExportOtlpTrace.mockReset();
    mockExportOtlpTrace.mockResolvedValue(undefined);
  });

  describe("no-op when credentials missing", () => {
    it("returns resolved promises when LANGFUSE_PUBLIC_KEY is absent", async () => {
      const result: SuggestMappingsResult = {
        kind: "success",
        batch: {
          mappingTraceId: TRACE_ID,
          contractId: "c1",
          contractVersion: "1",
          sourceSystem: "sys",
          promptVersion: "v1",
          generatedAt: new Date().toISOString(),
          overallConfidence: 0.9,
          driftCategories: [],
          missingRequiredFields: [],
          ambiguousTargetFields: [],
          suggestions: [],
          summary: "",
        },
        decisionLog: makeDecisionLog(),
        telemetry: makeTelemetry(),
      };

      const output = await dispatchIntakeTracing({
        result,
        ...BASE_INPUT,
        env: makeEnv({ LANGFUSE_PUBLIC_KEY: undefined }),
      });

      await expect(output.tracePostPromise).resolves.toBeUndefined();
      await expect(output.flushPromise).resolves.toBeUndefined();
      expect(mockExportOtlpTrace).not.toHaveBeenCalled();
      expect(mockScoreCreate).not.toHaveBeenCalled();
    });

    it("returns resolved promises when LANGFUSE_SECRET_KEY is absent", async () => {
      const result: SuggestMappingsResult = {
        kind: "abstain",
        reason: "no data",
        decisionLog: makeDecisionLog(),
        telemetry: makeTelemetry(),
      };

      const output = await dispatchIntakeTracing({
        result,
        ...BASE_INPUT,
        env: makeEnv({ LANGFUSE_SECRET_KEY: undefined }),
      });

      await expect(output.tracePostPromise).resolves.toBeUndefined();
      await expect(output.flushPromise).resolves.toBeUndefined();
      expect(mockExportOtlpTrace).not.toHaveBeenCalled();
    });
  });

  describe("success kind", () => {
    it("calls exportOtlpTrace with correct traceId and prompt fields", async () => {
      const result: SuggestMappingsResult = {
        kind: "success",
        batch: {
          mappingTraceId: TRACE_ID,
          contractId: "c1",
          contractVersion: "1",
          sourceSystem: "sys",
          promptVersion: "v1",
          generatedAt: new Date().toISOString(),
          overallConfidence: 0.9,
          driftCategories: [],
          missingRequiredFields: [],
          ambiguousTargetFields: [],
          suggestions: [],
          summary: "",
        },
        decisionLog: makeDecisionLog(),
        telemetry: makeTelemetry(),
      };

      const output = await dispatchIntakeTracing({ result, ...BASE_INPUT });
      await output.tracePostPromise;

      expect(mockExportOtlpTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: TRACE_ID,
          promptName: BASE_INPUT.promptName,
          promptVersion: BASE_INPUT.promptVersion,
        }),
      );
    });

    it("creates score with value = 1.0 when no suggestions", async () => {
      const result: SuggestMappingsResult = {
        kind: "success",
        batch: {
          mappingTraceId: TRACE_ID,
          contractId: "c1",
          contractVersion: "1",
          sourceSystem: "sys",
          promptVersion: "v1",
          generatedAt: new Date().toISOString(),
          overallConfidence: 0.9,
          driftCategories: [],
          missingRequiredFields: [],
          ambiguousTargetFields: [],
          suggestions: [],
          summary: "",
        },
        decisionLog: makeDecisionLog(),
        telemetry: makeTelemetry(),
      };

      const output = await dispatchIntakeTracing({ result, ...BASE_INPUT });
      await output.tracePostPromise;

      expect(mockScoreCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: NORMALIZED_TRACE_ID,
          name: "overall_confidence",
          value: 1.0,
        }),
      );
    });

    it("computes average confidence from batch suggestions", async () => {
      const result: SuggestMappingsResult = {
        kind: "success",
        batch: {
          mappingTraceId: TRACE_ID,
          contractId: "c1",
          contractVersion: "1",
          sourceSystem: "sys",
          promptVersion: "v1",
          generatedAt: new Date().toISOString(),
          overallConfidence: 0.9,
          driftCategories: [],
          missingRequiredFields: [],
          ambiguousTargetFields: [],
          suggestions: [
            {
              id: "s1",
              sourcePath: "a",
              targetField: "b",
              transformKind: "copy",
              confidence: 0.8,
              explanation: "",
              evidenceSample: "",
              deterministicValidation: { isValid: true, validatedAt: "", errors: [] },
              reviewStatus: "pending",
              replayStatus: "pending",
            },
            {
              id: "s2",
              sourcePath: "c",
              targetField: "d",
              transformKind: "copy",
              confidence: 0.6,
              explanation: "",
              evidenceSample: "",
              deterministicValidation: { isValid: true, validatedAt: "", errors: [] },
              reviewStatus: "pending",
              replayStatus: "pending",
            },
          ],
          summary: "",
        },
        decisionLog: makeDecisionLog(),
        telemetry: makeTelemetry(),
      };

      const output = await dispatchIntakeTracing({ result, ...BASE_INPUT });
      await output.tracePostPromise;

      expect(mockScoreCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: NORMALIZED_TRACE_ID,
          name: "overall_confidence",
          value: 0.7,
        }),
      );
    });
  });

  describe("abstain kind", () => {
    it("creates score with value=0.5 and calls exportOtlpTrace", async () => {
      const result: SuggestMappingsResult = {
        kind: "abstain",
        reason: "no data",
        decisionLog: {
          ...makeDecisionLog(),
          validationOutcome: "abstained" as const,
        },
        telemetry: {
          ...makeTelemetry(),
          outputText: "",
        },
      };

      const output = await dispatchIntakeTracing({ result, ...BASE_INPUT });
      await output.tracePostPromise;

      expect(mockExportOtlpTrace).toHaveBeenCalled();
      expect(mockScoreCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "overall_confidence",
          value: 0.5,
        }),
      );
    });
  });

  describe("error kinds", () => {
    it("creates score with value=0.0 for runtime_failure", async () => {
      const result: SuggestMappingsResult = {
        kind: "runtime_failure",
        reason: "timeout",
        decisionLog: {
          ...makeDecisionLog(),
          validationOutcome: "runtime_failure" as const,
        },
        telemetry: { ...makeTelemetry(), outputText: "" },
      };

      const output = await dispatchIntakeTracing({ result, ...BASE_INPUT });
      await output.tracePostPromise;

      expect(mockScoreCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "overall_confidence",
          value: 0.0,
        }),
      );
    });

    it("creates score with value=0.0 for invalid_output", async () => {
      const result: SuggestMappingsResult = {
        kind: "invalid_output",
        reason: "bad json",
        errors: ["parse error"],
        decisionLog: {
          ...makeDecisionLog(),
          validationOutcome: "invalid_output" as const,
        },
        telemetry: { ...makeTelemetry(), outputText: "" },
      };

      const output = await dispatchIntakeTracing({ result, ...BASE_INPUT });
      await output.tracePostPromise;

      expect(mockScoreCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "overall_confidence",
          value: 0.0,
        }),
      );
    });
  });

  describe("flushPromise", () => {
    it("exposes flush as flushPromise and calls langfuse.flush()", async () => {
      const result: SuggestMappingsResult = {
        kind: "abstain",
        reason: "test",
        decisionLog: makeDecisionLog(),
        telemetry: makeTelemetry(),
      };

      const output = await dispatchIntakeTracing({ result, ...BASE_INPUT });
      await output.flushPromise;

      expect(mockFlush).toHaveBeenCalled();
    });
  });
});
