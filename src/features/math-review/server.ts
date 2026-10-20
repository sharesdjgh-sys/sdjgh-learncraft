import "server-only";
import sharp from "sharp";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output, type UserContent } from "ai";
import type { z } from "zod";
import { env } from "@/lib/env";
import { REVIEW_LIMITS, uploadError, type SourceFile } from "./model";

export class ReviewInputError extends Error {}
export type ReviewMedia = SourceFile & { data: Uint8Array };

// Bound the actual stream as well as Content-Length; multipart overhead is allowed.
export async function readReviewForm(request: Request) {
  const maxBytes = REVIEW_LIMITS.bytes + 256 * 1024;
  if (Number(request.headers.get("content-length")) > maxBytes) throw new ReviewInputError("요청이 너무 큽니다. 첨부 파일 합계를 4MB 이하로 줄여 주세요.");
  if (!request.body) throw new ReviewInputError("문제 사진을 올려 주세요.");
  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ReviewInputError("요청이 너무 큽니다. 첨부 파일 합계를 4MB 이하로 줄여 주세요.");
      }
      chunks.push(new Uint8Array(next.value));
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Response(new Blob(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
  } catch {
    throw new ReviewInputError("업로드 내용을 읽을 수 없습니다. 파일을 다시 선택해 주세요.");
  }
}

export async function readReviewMedia(entries: FormDataEntryValue[]): Promise<ReviewMedia[]> {
  if (entries.some(entry => !(entry instanceof File))) throw new ReviewInputError("첨부 파일 형식이 올바르지 않습니다.");
  const files = entries as File[];
  const error = uploadError(files);
  if (error) throw new ReviewInputError(error);
  const media: ReviewMedia[] = [];
  for (const file of files) {
    const data = new Uint8Array(await file.arrayBuffer());
    try {
      const meta = await sharp(data, { limitInputPixels: 24_000_000 }).metadata();
      const expected = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" }[file.type];
      if (!expected || meta.format !== expected || (meta.pages ?? 1) !== 1 || !meta.width || !meta.height) throw new Error("INVALID_IMAGE");
    } catch {
      throw new ReviewInputError("이미지를 읽을 수 없습니다. 2,400만 화소 이하의 정적인 PNG, JPG, WebP 파일을 선택해 주세요.");
    }
    media.push({ name: file.name, type: file.type, size: file.size, pages: 1, data });
  }
  return media;
}

export async function generateMathReview<T>({ schema, system, task, media, signal, recognition }: {
  schema: z.ZodType<T>; system: string; task: string; media: ReviewMedia[]; signal: AbortSignal; recognition: boolean;
}) {
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  const modelIds = [env.GEMINI_PRIMARY_MODEL_ID, env.GEMINI_FALLBACK_MODEL_ID || env.GEMINI_PRIMARY_MODEL_ID];
  const attachments: Exclude<UserContent, string> = media.flatMap((file, index): Exclude<UserContent, string> => [
    { type: "text", text: "첨부 파일 " + index + ": " + JSON.stringify({ name: file.name, pages: file.pages }) },
    { type: "file", mediaType: file.type, data: file.data },
  ]);
  let lastError: unknown;
  for (const [attempt, modelId] of modelIds.entries()) {
    signal.throwIfAborted();
    try {
      const result = await generateText({
        model: google(modelId), maxRetries: 0,
        maxOutputTokens: recognition ? 24000 : 16000,
        abortSignal: AbortSignal.any([signal, AbortSignal.timeout(attempt === 0 ? 110_000 : 55_000)]),
        output: Output.object({ schema }), system,
        messages: [{ role: "user", content: [
          { type: "text", text: task + (attempt ? "\n지정된 JSON 객체를 누락 없이 완성하세요." : "") }, ...attachments,
        ] }],
        providerOptions: { google: { thinkingConfig: { thinkingLevel: recognition ? "low" : "high", includeThoughts: false } } },
      });
      return { output: schema.parse(result.output), modelId, usage: result.usage };
    } catch (error) {
      lastError = error;
      const retryable = NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)
        || (error instanceof Error && ["TimeoutError", "ZodError"].includes(error.name));
      // Do not log question text, provider response bodies, or attachments.
      console.warn("math_review_attempt_failed", { model: modelId, attempt: attempt + 1, code: error instanceof Error ? error.name : "UnknownError" });
      if (!retryable || signal.aborted) break;
    }
  }
  throw lastError;
}
