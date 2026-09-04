import { renderToStaticMarkup } from "react-dom/server";
import { InlineMarkdown, Markdown } from "../src/components/ui/markdown";

const strongCases = [
  "**돈(화폐)**",
  "**돈(화폐)**의 기능",
  String.raw`\*\*돈(화폐)\*\*`,
  "핵심 개념: **시장 가격**",
  "1.∗∗一日/不讀/書∗∗",
  "1.＊＊一日/不讀/書＊＊",
];

for (const markdown of strongCases) {
  for (const [renderer, output] of [
    ["inline", renderToStaticMarkup(<InlineMarkdown>{markdown}</InlineMarkdown>)],
    ["block", renderToStaticMarkup(<Markdown>{markdown}</Markdown>)],
  ] as const) {
    if (!output.includes("<strong")) {
      throw new Error(`${renderer} Markdown에서 굵게 문법을 렌더링하지 못했습니다: ${markdown}`);
    }
    if (output.includes("**돈(화폐)**") || output.includes(String.raw`\*\*돈(화폐)\*\*`)) {
      throw new Error(`${renderer} Markdown에 굵게 표시 문자가 그대로 남았습니다: ${markdown}`);
    }
    if (output.includes("∗∗") || output.includes("＊＊") || output.includes("katex-display")) {
      throw new Error(`${renderer} Markdown에서 유니코드 굵게 문법을 본문으로 처리하지 못했습니다: ${markdown}`);
    }
  }
}

console.log(`Markdown 렌더링 검증 완료: 굵게 문법 ${strongCases.length}개 입력 × 2개 렌더러`);
