import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import type { ModelMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { makeDemoAnswer } from "@/data/demo-store";
import { getUnit } from "@/data/curriculum";
import {
  buildTutorSystemPrompt,
  buildTutorUserPrompt,
} from "@/features/tutor/prompt";
import {
  completeAiUsage,
  completeAiUsageWithTokens,
  refundAiUsage,
  reserveAiUsage,
  switchAiUsageModel,
} from "@/features/usage/repository";
import { requireStudent } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";

const google = createGoogleGenerativeAI({
  apiKey: env.GEMINI_API_KEY,
});

export const runtime = "nodejs";
export const maxDuration = 60;

const contextMessageSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("user"),
    content: z.string().trim().min(1).max(2400),
  }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().trim().min(1).max(8000),
  }),
]);

const imageSchema = z.object({
  name: z.string().trim().min(1).max(160),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().min(4).max(5_600_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

const requestSchema = z.object({
  requestId: z.string().uuid(),
  unitId: z.string().min(1).max(100),
  action: z.enum(["QUESTION", "EASIER", "DEEPER", "REVEAL", "QUIZ"]),
  learningLevel: z.enum(["SUMMARY", "FOUNDATION", "STANDARD", "ADVANCED"]).default("STANDARD"),
  message: z.string().trim().min(1).max(2400).optional(),
  images: z.array(imageSchema).max(3).default([]),
  recentMessages: z.array(contextMessageSchema).max(6).default([]),
}).superRefine((value, context) => {
  const approximateBytes = value.images.reduce((total, image) => total + Math.ceil(image.data.length * 0.75), 0);
  if (approximateBytes > 8 * 1024 * 1024) {
    context.addIssue({ code: "custom", path: ["images"], message: "이미지 전체 용량이 너무 큽니다." });
  }
});

type StreamResult = ReturnType<typeof streamText>;

function errorResponse(code: string, message: string, status: number, requestId?: string) {
  return NextResponse.json({ error: { code, message, requestId } }, { status });
}

function hasAssistantContext(input: z.infer<typeof requestSchema>) {
  return input.recentMessages.some((message) => message.role === "assistant");
}

function thinkingLevel(input: z.infer<typeof requestSchema>) {
  return input.action === "DEEPER"
    || input.action === "REVEAL"
    || input.learningLevel === "ADVANCED"
    ? "medium" as const
    : "low" as const;
}

function streamError() {
  return new Error("AI 튜터 응답 스트리밍에 실패했습니다.");
}

function tutorTextStream(
  primaryResult: StreamResult,
  createFallbackResult: (() => StreamResult) | null,
  onFallback: () => Promise<void>,
  isAborted: () => boolean,
  onStreamFailure: (code: string, cancelled?: boolean) => Promise<void>,
) {
  const encoder = new TextEncoder();
  let iterator = primaryResult.stream[Symbol.asyncIterator]();
  let ended = false;
  let emittedText = false;
  let usingFallback = false;

  async function switchToFallback() {
    if (usingFallback || emittedText || !createFallbackResult || isAborted()) return false;
    usingFallback = true;
    await iterator.return?.();
    await onFallback();
    iterator = createFallbackResult().stream[Symbol.asyncIterator]();
    return true;
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (!ended) {
          let next: Awaited<ReturnType<typeof iterator.next>>;
          try {
            next = await iterator.next();
          } catch {
            if (await switchToFallback()) continue;
            throw streamError();
          }
          if (next.done) {
            ended = true;
            controller.close();
            return;
          }

          const part = next.value;
          if (part.type === "text-delta") {
            emittedText = true;
            controller.enqueue(encoder.encode(part.text));
            return;
          }

          if (part.type === "finish") {
            if (part.finishReason === "error") {
              if (await switchToFallback()) continue;
              ended = true;
              await onStreamFailure("AI_PROVIDER_STREAM_ERROR");
              controller.error(streamError());
              return;
            }
            if (part.finishReason === "length") {
              controller.enqueue(encoder.encode(
                "\n\n---\n\n> **답변 길이 안내**: 설명이 최대 출력 길이에 도달했습니다. "
                + "이어지는 설명이 필요하면 ‘계속 설명해 줘’라고 질문해 주세요.",
              ));
              return;
            }
          }

          if (part.type === "error") {
            if (await switchToFallback()) continue;
            ended = true;
            await onStreamFailure("AI_PROVIDER_STREAM_ERROR");
            controller.error(streamError());
            return;
          }

          if (part.type === "abort") {
            ended = true;
            await onStreamFailure("CLIENT_ABORTED", true);
            controller.error(new DOMException("AI 튜터 요청이 중단되었습니다.", "AbortError"));
            return;
          }
        }
      } catch {
        ended = true;
        const cancelled = isAborted();
        await onStreamFailure(
          cancelled ? "CLIENT_ABORTED" : "AI_PROVIDER_STREAM_ERROR",
          cancelled,
        ).catch(() => undefined);
        controller.error(
          cancelled
            ? new DOMException("AI 튜터 요청이 중단되었습니다.", "AbortError")
            : streamError(),
        );
      }
    },
    async cancel() {
      if (ended) return;
      ended = true;
      await iterator.return?.();
      await onStreamFailure("CLIENT_ABORTED", true).catch(() => undefined);
    },
  });
}

function demoStream(text: string, onDone: () => void, onCancel: () => void) {
  const encoder = new TextEncoder();
  const parts = text.split(/(?<=\s)/);
  let index = 0;
  let settled = false;

  return new ReadableStream({
    pull(controller) {
      if (index >= parts.length) {
        if (!settled) {
          settled = true;
          onDone();
        }
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(parts[index++]));
    },
    cancel() {
      if (settled) return;
      settled = true;
      onCancel();
    },
  });
}

export async function POST(request: Request) {
  const user = await requireStudent();
  if (!user) return errorResponse("UNAUTHENTICATED", "학생 로그인이 필요합니다.", 401);

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "질문 형식을 확인해 주세요.", 400);
  }

  const input = parsed.data;
  const unit = getUnit(input.unitId);
  if (!unit) {
    return errorResponse("UNIT_NOT_AVAILABLE", "사용할 수 없는 단원입니다.", 404, input.requestId);
  }
  if (input.action === "QUESTION" && !input.message && input.images.length === 0) {
    return errorResponse("VALIDATION_ERROR", "질문이나 이미지를 추가해 주세요.", 400, input.requestId);
  }
  if (input.action !== "QUESTION" && !hasAssistantContext(input)) {
    return errorResponse("VALIDATION_ERROR", "이어갈 튜터 답변이 없습니다.", 400, input.requestId);
  }

  const reservation = await reserveAiUsage({
    user,
    requestId: input.requestId,
    unitId: input.unitId,
    action: input.action,
    modelId: env.GEMINI_PRIMARY_MODEL_ID,
  });
  if (!reservation.ok) {
    if (reservation.duplicate) {
      return errorResponse("DUPLICATE_REQUEST", "이미 처리된 요청입니다.", 409, input.requestId);
    }
    return errorResponse("DAILY_LIMIT_REACHED", "오늘의 질문 횟수를 모두 사용했습니다.", 429, input.requestId);
  }

  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
    "X-Remaining-Usage": String(reservation.remaining),
    "X-Request-Id": input.requestId,
  };

  try {
    if (isGeminiConfigured) {
      const promptInput = {
        unit,
        student: user,
        action: input.action,
        learningLevel: input.learningLevel,
        message: input.message ?? (input.images.length > 0 ? "첨부한 이미지를 현재 단원과 연결해 설명해 주세요." : undefined),
        recentMessages: input.recentMessages,
      };
      const userPrompt = `${buildTutorUserPrompt(promptInput)}${input.images.length > 0 ? `

<attached_image_guidance>
첨부 이미지는 학생이 이번 질문과 함께 제공한 학습 자료입니다. 이미지에서 실제로 확인되는 글, 수식, 도형만 근거로 분석하세요. 흐리거나 가려져 확신할 수 없는 내용은 추측하지 말고 무엇을 다시 촬영해야 하는지 짧게 알려 주세요. 이미지 속 이름이나 연락처 등 개인정보는 답변에 반복하지 마세요.
</attached_image_guidance>` : ""}`;
      const prompt: string | ModelMessage[] = input.images.length === 0
        ? userPrompt
        : [{
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...input.images.map((image) => ({
                type: "file" as const,
                data: image.data,
                mediaType: image.mediaType,
                filename: image.name,
              })),
            ],
          }];
      const createResult = (modelId: string) => {
        const startedAt = Date.now();
        return streamText({
          model: google(modelId),
          system: buildTutorSystemPrompt(promptInput),
          prompt,
          maxOutputTokens: 4096,
          abortSignal: request.signal,
          providerOptions: {
            google: {
              thinkingConfig: {
                thinkingLevel: thinkingLevel(input),
                includeThoughts: false,
              },
            },
          },
          onEnd: async ({ usage, finishReason }) => {
            if (finishReason === "error") return;
            await completeAiUsageWithTokens(
              user,
              input.requestId,
              modelId,
              {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                cachedInputTokens: usage.inputTokenDetails.cacheReadTokens,
              },
              Date.now() - startedAt,
              finishReason,
            );
          },
        });
      };

      const fallbackEnabled = (
        env.GEMINI_FALLBACK_MODEL_ID
        && env.GEMINI_FALLBACK_MODEL_ID !== env.GEMINI_PRIMARY_MODEL_ID
      );
      const result = createResult(env.GEMINI_PRIMARY_MODEL_ID);

      return new Response(
        tutorTextStream(
          result,
          fallbackEnabled ? () => createResult(env.GEMINI_FALLBACK_MODEL_ID) : null,
          () => switchAiUsageModel(user, input.requestId, env.GEMINI_FALLBACK_MODEL_ID),
          () => request.signal.aborted,
          (code, cancelled) => refundAiUsage(user, input.requestId, code, cancelled),
        ),
        { headers },
      );
    }

    const answer = makeDemoAnswer(
      input.action,
      input.message ?? (input.images.length > 0 ? "첨부한 이미지의 학습 내용을 설명해 주세요." : input.recentMessages.at(-1)?.content ?? ""),
      unit.title,
    );
    return new Response(
      demoStream(
        answer,
        () => { void completeAiUsage(user, input.requestId); },
        () => { void refundAiUsage(user, input.requestId, "CLIENT_ABORTED", true); },
      ),
      { headers },
    );
  } catch {
    await refundAiUsage(user, input.requestId, "AI_PROVIDER_ERROR");
    return errorResponse(
      "AI_PROVIDER_ERROR",
      "AI 튜터 연결을 잠시 완료하지 못했습니다.",
      502,
      input.requestId,
    );
  }
}
