import "server-only";
import { env } from "@/lib/env";

/* 교사 도구가 GPT 이미지 모델로 그림을 만들 때 함께 쓰는 호출입니다. reference가 있으면 그 그림을 참고 이미지로 보냅니다(edits).
   실패하면 화면에 보여 줄 한국어 문구와 상태 코드를 돌려줍니다. */

type OpenAiImageResponse = { data?: { b64_json?: string }[]; error?: { message?: string; code?: string; type?: string } };
export type OpenAiImageResult =
  | { ok: true; image: string; model: string }
  | { ok: false; status: number; error: string; detail?: { status: number; code?: string; type?: string; message?: string } };

export async function requestOpenAiImage({ prompt, size, signal, reference }: { prompt: string; size: string; signal: AbortSignal; reference?: File | null }): Promise<OpenAiImageResult> {
  const model = env.OPENAI_IMAGE_MODEL_ID;
  const timeout = AbortSignal.any([signal, AbortSignal.timeout(170_000)]);
  try {
    let response: Response;
    if (reference) {
      const body = new FormData();
      body.append("model", model);
      body.append("prompt", prompt);
      body.append("size", size);
      body.append("quality", env.OPENAI_IMAGE_QUALITY);
      body.append("n", "1");
      body.append("image[]", reference, "figure.png");
      response = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body, signal: timeout });
    } else {
      response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, size, quality: env.OPENAI_IMAGE_QUALITY, n: 1 }),
        signal: timeout,
      });
    }
    const payload = await response.json().catch(() => ({})) as OpenAiImageResponse;
    const image = payload.data?.[0]?.b64_json;
    if (response.ok && image) return { ok: true, image: `data:image/png;base64,${image}`, model };
    const detail = { status: response.status, code: payload.error?.code, type: payload.error?.type, message: payload.error?.message?.slice(0, 300) };
    const blocked = payload.error?.code === "moderation_blocked" || /safety|moderation/i.test(payload.error?.message ?? "");
    if (blocked) return { ok: false, status: 422, error: "요청 내용이 이미지 생성 안전 기준에 걸렸어요. 표현을 바꿔 다시 시도해 주세요.", detail };
    if (response.status === 401) return { ok: false, status: 502, error: "OpenAI API 키가 올바르지 않습니다. 관리자에게 알려 주세요.", detail };
    if (response.status === 429) return { ok: false, status: 429, error: "OpenAI 사용 한도에 걸렸어요. 잠시 후 다시 시도해 주세요.", detail };
    return { ok: false, status: 502, error: "GPT가 그림을 만들지 못했어요. 잠시 후 다시 시도해 주세요.", detail };
  } catch (error) {
    if (signal.aborted) return { ok: false, status: 499, error: "요청을 취소했어요." };
    return {
      ok: false, status: 502,
      error: error instanceof Error && error.name === "TimeoutError" ? "그림을 만드는 데 너무 오래 걸렸어요. 크기를 줄이거나 다시 시도해 주세요." : "GPT에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
      detail: { status: 0, message: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 300) : "UnknownError" },
    };
  }
}
