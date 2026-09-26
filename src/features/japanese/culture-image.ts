import { z } from "zod";
import { imageSizes, imageStyles, type ImageSize, type ImageStyle } from "@/lib/ai-figure/image-prompt";
import { cultureTopic, stripRuby, type CultureTopic } from "./culture";

/* 일본문화 수업 그림을 GPT나 Gemini 이미지 모델로 만들 때 보낼 설명(프롬프트)입니다. 두 모델에 같은 설명을 보냅니다. 그림 모양·크기는 인공지능 기초 도구와 같은 목록을 씁니다.
   AI 그림이 틀리기 쉬운 문화 요소(기모노 여밈, 다른 나라 풍습과 섞기, 저작권 캐릭터)를 분명히 적습니다. */

export const MAX_CULTURE_IMAGE_REQUEST = 1000;
export const imageTextModes = {
  none: { label: "글자 없이", prompt: "Do not draw any text, letters, numbers, signs, captions or calligraphy anywhere in the image." },
  ja: { label: "일본어 낱말 이름표", prompt: "Label a few key items with small, clean name tags using ONLY the Japanese words listed below, copied exactly (correct kanji and kana). No other text." },
  ko: { label: "한국어 이름표", prompt: "Label a few key items with small, clean name tags in Korean, spelled exactly as listed below. No other text." },
} as const;
export type ImageTextMode = keyof typeof imageTextModes;

export const imageProviders = { gpt: "GPT", gemini: "Gemini" } as const;
export type ImageProvider = keyof typeof imageProviders;

export const cultureImageRequestSchema = z.object({
  provider: z.enum(["gpt", "gemini"]).default("gpt"),
  topicId: z.string().max(40).default(""),
  style: z.enum(imageStyles.map(style => style.id) as [ImageStyle, ...ImageStyle[]]),
  size: z.enum(Object.keys(imageSizes) as [ImageSize, ...ImageSize[]]),
  large: z.boolean().default(false),
  text: z.enum(Object.keys(imageTextModes) as [ImageTextMode, ...ImageTextMode[]]),
  request: z.string().trim().min(4, "어떤 그림을 만들지 조금 더 자세히 적어 주세요.").max(MAX_CULTURE_IMAGE_REQUEST, `그림 설명은 ${MAX_CULTURE_IMAGE_REQUEST.toLocaleString()}자까지 적을 수 있어요.`),
});
export type CultureImageRequest = z.infer<typeof cultureImageRequestSchema>;

/** 주제를 고르면 채워 넣는 그림 설명 초안입니다. 선생님이 고쳐 쓸 수 있습니다. */
export function topicImageRequest(topic: CultureTopic) {
  return [
    `일본의 ${topic.title}(${stripRuby(topic.ja)})${topic.when ? `, ${topic.when}` : ""} 장면.`,
    topic.summary,
    `그림에 담을 것: ${topic.words.map(word => `${word.word}(${word.meaning})`).join(", ")}.`,
  ].join("\n");
}

const rules = [
  "Audience: Korean high school students in the course '일본문화' (Japanese culture). The image is for a classroom slide or worksheet.",
  "Depict Japanese customs, clothing, food, buildings and places accurately and respectfully, as they really are in present-day Japan (or in the stated period). Do not mix in Chinese or Korean elements, and avoid stereotypes, exaggeration or caricature.",
  "If anyone wears a kimono or yukata, the left front panel overlaps the right front panel (seen from the viewer the collar forms a lowercase 'y'). Never draw right-over-left.",
  "Do not depict real, identifiable people, celebrities, brand logos or existing copyrighted characters (for example anime or manga characters); use original, generic characters.",
  "Keep the composition simple and clear with a clean background so it prints well.",
];

/** 서버가 GPT에 보낼 최종 설명입니다. 이름표를 달 때는 주제 낱말을 그대로 적게 합니다. */
export function buildCultureImagePrompt(input: CultureImageRequest) {
  const look = imageStyles.find(item => item.id === input.style) ?? imageStyles[0];
  const topic = input.topicId ? cultureTopic(input.topicId) : undefined;
  const parts = [
    `Create ${look.prompt}.`,
    `What to draw (written by the teacher in Korean): ${input.request.trim().slice(0, MAX_CULTURE_IMAGE_REQUEST)}`,
  ];
  if (topic) parts.push(`Topic: ${topic.title} (${stripRuby(topic.ja)}). Background facts to keep accurate: ${topic.summary} ${topic.points.join(" ")}`);
  parts.push(imageTextModes[input.text].prompt);
  if (input.text !== "none" && topic) parts.push(`Labels: ${topic.words.map(word => `"${input.text === "ja" ? word.word : word.meaning}"`).join(", ")}.`);
  parts.push(rules.join("\n"));
  return parts.join("\n\n");
}
