import { LangfuseClient } from "@langfuse/client";
import type { Env } from "../db/client";
import type { SuggestMappingsResult } from "../intake/aiMappingAdapter";
import { exportOtlpTrace } from "./otlp";

export type DispatchInput = {
  result: SuggestMappingsResult;
  promptName: string;
  promptVersion: string;
  env: Env;
};

export type DispatchOutput = {
  tracePostPromise: Promise<void>;
  flushPromise: Promise<void>;
};

const NO_OP_OUTPUT: DispatchOutput = {
  tracePostPromise: Promise.resolve(),
  flushPromise: Promise.resolve(),
};

function normalizeTraceId(uuid: string): string {
  return uuid.replace(/-/g, "").toLowerCase();
}

function resolveTraceId(result: SuggestMappingsResult): string {
  if (result.kind === "success") {
    return result.batch.mappingTraceId;
  }
  // For non-success results, generate a stable pseudo-id from available data
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("-");
}

function resolveConfidenceValue(result: SuggestMappingsResult): number {
  if (result.kind === "abstain") {
    return 0.5;
  }
  if (result.kind === "runtime_failure" || result.kind === "invalid_output") {
    return 0.0;
  }
  // success
  const { suggestions } = result.batch;
  if (suggestions.length === 0) {
    return 1.0;
  }
  const sum = suggestions.reduce((acc, s) => acc + s.confidence, 0);
  return sum / suggestions.length;
}

export async function dispatchIntakeTracing(input: DispatchInput): Promise<DispatchOutput> {
  const { result, promptName, promptVersion, env } = input;

  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) {
    return NO_OP_OUTPUT;
  }

  const credentials = {
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
    baseUrl: env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  };

  const traceId = resolveTraceId(result);
  const normalizedTraceId = normalizeTraceId(traceId);
  const { telemetry } = result;
  const confidenceValue = resolveConfidenceValue(result);

  const langfuse = new LangfuseClient({
    publicKey: credentials.publicKey,
    secretKey: credentials.secretKey,
    baseUrl: credentials.baseUrl,
  });

  const tracePostPromise = exportOtlpTrace({
    traceId,
    model: telemetry.model,
    promptName,
    promptVersion,
    promptText: telemetry.promptText,
    outputText: telemetry.outputText,
    startTimeMs: telemetry.startedAt,
    endTimeMs: telemetry.endedAt,
    usage: telemetry.usage,
    credentials,
  }).then(() => {
    langfuse.score.create({
      traceId: normalizedTraceId,
      name: "overall_confidence",
      value: confidenceValue,
    });
  });

  const flushPromise = tracePostPromise.then(() => langfuse.flush());

  return { tracePostPromise, flushPromise };
}
