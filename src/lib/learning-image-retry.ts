import { illustrationInputSchema } from "./learning-illustration-brief";
import type { VisualOf } from "./learning-visual";

/** Older saved failures have no original visual plan; recover their learning content. */
export function retryIllustrationBrief(slot: VisualOf<"image-slot">) {
  if (slot.retryBrief) return illustrationInputSchema.parse(slot.retryBrief);
  const sections = slot.textContent?.sections ?? [];
  return illustrationInputSchema.parse({
    title: slot.title, description: slot.description, aspectRatio: slot.aspectRatio,
    learningGoal: `핵심 개념을 그림으로 이해하기: ${slot.title}`.slice(0, 240),
    prompt: `학습용 인포그래픽을 다시 그립니다. 주제: ${slot.title}. ${slot.description}. 핵심 개념을 큰 그림과 짧은 라벨로 표현하고 자세한 문장은 본문에 맡깁니다.`,
    sections: sections.length >= 2 ? sections.map(section => ({
      ...section, explanation: `그림에서 설명할 핵심 개념: ${section.explanation}`.slice(0, 120),
      visual: `다음 의미를 구체적인 장면으로 표현: ${section.explanation}`.slice(0, 240),
    })) : [
      { heading: "핵심 개념", explanation: `주제의 기본 개념: ${slot.title}`.slice(0, 120), visual: `주제의 핵심을 보여주는 장면: ${slot.description}`.slice(0, 240) },
      { heading: "개념 이해", explanation: `주제의 의미를 이해하기: ${slot.description}`.slice(0, 120), visual: `기본 개념을 설명하는 구체적 예시: ${slot.title}`.slice(0, 240) },
    ],
    connections: slot.textContent?.connections.length ? slot.textContent.connections.map(text => `관계: ${text}`.slice(0, 120)) : ["기본 개념과 구체적인 예시를 연결한다."],
  });
}
