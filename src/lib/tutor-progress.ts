import { validImageUpdate } from "./image-slots";
export const tutorProgressLabels = {
  preparing: "질문과 단원 내용을 살펴보고 있어요",
  writing: "답변을 작성하고 있어요",
  image_search: "설명에 필요한 시각 자료를 찾고 있어요",
  image_generating: "학습용 그림을 그리고 있어요",
  image_processing: "그림의 해상도와 선명도를 정리하고 있어요",
  image_reviewing: "그림의 핵심 내용이 왜곡되지 않았는지 확인하고 있어요",
  image_revising: "검수에서 발견한 문제를 반영해 그림을 다시 그리고 있어요",
  image_failed: "이미지 생성 실패를 안내하고 있어요",
  image_fallback: "그림 대신 이해하기 쉬운 설명과 도식을 준비하고 있어요",
  retrying: "연결을 다시 시도하고 있어요",
} as const;
export type TutorProgressStage = keyof typeof tutorProgressLabels;
export type TutorStreamEvent = { type: "status"; stage: TutorProgressStage } | { type: "text"; text: string } | { type: "image"; id: string; markdown: string };
export const TUTOR_STREAM_TYPE = "application/x-ndjson";

/** Frame boundaries may split anywhere, including inside escaped text and Hangul bytes. */
export function createTutorEventDecoder(onEvent: (event: TutorStreamEvent) => void) {
  let pending = "";
  return (text: string, final = false) => {
    pending += text;
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    if (final && pending) { lines.push(pending); pending = ""; }
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as TutorStreamEvent;
      if (event.type === "text" && typeof event.text === "string") onEvent(event);
      else if (event.type === "image" && typeof event.id === "string" && typeof event.markdown === "string" && validImageUpdate(event.id, event.markdown)) onEvent(event);
      else if (event.type === "status" && Object.hasOwn(tutorProgressLabels, event.stage)) onEvent(event);
      else throw new Error("답변 진행 정보를 읽지 못했어요.");
    }
  };
}

export function isIllustrationPending(stage: TutorProgressStage) {
  return stage === "image_generating" || stage === "image_processing" || stage === "image_reviewing" || stage === "image_revising";
}
