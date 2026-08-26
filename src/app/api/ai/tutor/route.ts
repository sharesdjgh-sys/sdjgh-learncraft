import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
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

const requestSchema = z.object({
  requestId: z.string().uuid(),
  unitId: z.string().min(1).max(100),
  action: z.enum(["QUESTION", "EASIER", "DEEPER", "REVEAL", "QUIZ"]),
  learningLevel: z.enum(["FOUNDATION", "STANDARD", "ADVANCED"]).default("STANDARD"),
  message: z.string().trim().min(1).max(2400).optional(),
  recentMessages: z.array(contextMessageSchema).max(6).default([]),
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
  result: StreamResult,
  onStreamFailure: (code: string, cancelled?: boolean) => Promise<void>,
) {
  const encoder = new TextEncoder();
  const iterator = result.stream[Symbol.asyncIterator]();
  let ended = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (!ended) {
          const next = await iterator.next();
          if (next.done) {
            ended = true;
            controller.close();
            return;
          }

          const part = next.value;
          if (part.type === "text-delta") {
            controller.enqueue(encoder.encode(part.text));
            return;
          }

          if (part.type === "finish" && part.finishReason === "length") {
            controller.enqueue(encoder.encode(
              "\n\n---\n\n> **답변 길이 안내**: 설명이 최대 출력 길이에 도달했습니다. "
              + "이어지는 설명이 필요하면 ‘계속 설명해 줘’라고 질문해 주세요.",
            ));
            return;
          }

          if (part.type === "error") {
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
        await onStreamFailure("AI_PROVIDER_STREAM_ERROR").catch(() => undefined);
        controller.error(streamError());
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
  if (input.action === "QUESTION" && !input.message) {
    return errorResponse("VALIDATION_ERROR", "질문 내용을 입력해 주세요.", 400, input.requestId);
  }
  if (input.action !== "QUESTION" && !hasAssistantContext(input)) {
    return errorResponse("VALIDATION_ERROR", "이어갈 튜터 답변이 없습니다.", 400, input.requestId);
  }

  const reservation = await reserveAiUsage({
    user,
    requestId: input.requestId,
    unitId: input.unitId,
    action: input.action,
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
      const startedAt = Date.now();
      const promptInput = {
        unit,
        student: user,
        action: input.action,
        learningLevel: input.learningLevel,
        message: input.message,
        recentMessages: input.recentMessages,
      };
      const result = streamText({
        model: google(env.GEMINI_MODEL_ID),
        system: buildTutorSystemPrompt(promptInput),
        prompt: buildTutorUserPrompt(promptInput),
        maxOutputTokens: 4096,
        temperature: 0.35,
        abortSignal: request.signal,
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingLevel: thinkingLevel(input),
              includeThoughts: false,
            },
          },
        },
        onError: async () => {
          await refundAiUsage(user, input.requestId, "AI_PROVIDER_STREAM_ERROR");
        },
        onAbort: async () => {
          await refundAiUsage(user, input.requestId, "CLIENT_ABORTED", true);
        },
        onEnd: async ({ usage, finishReason }) => {
          if (finishReason === "error") {
            await refundAiUsage(user, input.requestId, "AI_PROVIDER_STREAM_ERROR");
            return;
          }
          await completeAiUsageWithTokens(
            user,
            input.requestId,
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

      return new Response(
        tutorTextStream(
          result,
          (code, cancelled) => refundAiUsage(user, input.requestId, code, cancelled),
        ),
        { headers },
      );
    }

    const answer = makeDemoAnswer(
      input.action,
      input.message ?? input.recentMessages.at(-1)?.content ?? "",
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
