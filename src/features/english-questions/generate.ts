import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import type { z } from "zod";
import { env } from "@/lib/env";

type Options<T> = { label: string; schema: z.ZodType<T>; system: string; prompt: string; signal: AbortSignal; maxOutputTokens: number; timeouts: [number, number] };

// 수학 문제 검토와 같이, 구조화 결과가 비거나 시간이 초과되면 가벼운 사고 수준으로 한 번 더 시도합니다.
export async function generateStructured<T>({ label, schema, system, prompt, signal, maxOutputTokens, timeouts }: Options<T>) {
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  const modelIds = [env.GEMINI_PRIMARY_MODEL_ID, env.GEMINI_FALLBACK_MODEL_ID || env.GEMINI_PRIMARY_MODEL_ID];
  let lastError: unknown;
  for (const [attempt, modelId] of modelIds.entries()) {
    try {
      const result = await generateText({
        model: google(modelId),
        maxRetries: 0,
        maxOutputTokens,
        abortSignal: AbortSignal.any([signal, AbortSignal.timeout(timeouts[attempt])]),
        output: Output.object({ schema }),
        system,
        prompt: attempt === 0 ? prompt : `${prompt}\n\n이전 시도에서 유효한 JSON 결과가 생성되지 않았습니다. 반드시 지정된 스키마의 JSON 객체를 완성하세요.`,
        providerOptions: { google: { thinkingConfig: { thinkingLevel: attempt === 0 ? "high" : "low", includeThoughts: false } } },
      });
      return { output: schema.parse(result.output), modelId, attempts: attempt + 1, usage: result.usage };
    } catch (error) {
      lastError = error;
      const retryable = NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)
        || (error instanceof Error && (error.name === "TimeoutError" || error.name === "ZodError"));
      console.warn(`${label}_attempt_failed ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { model: modelId, attempt: attempt + 1, retryable });
      if (!retryable || signal.aborted) break;
    }
  }
  throw lastError;
}
