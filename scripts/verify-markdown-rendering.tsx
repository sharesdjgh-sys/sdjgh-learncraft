import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
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

const hintMarkdown = `## 문제
원의 넓이를 구해 보세요.

## 풀이 전략
반지름부터 찾아보세요.

### 사용할 식
$A = \\pi r^2$

## 힌트 1: 반지름을 이용하세요
반지름은 2예요.

## 다음 문제
삼각형의 넓이를 구해 보세요.`;
const folded = renderToStaticMarkup(<Markdown collapseHints>{hintMarkdown}</Markdown>);
const sections = [...folded.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)];
assert.equal(sections.length, 2);
assert.doesNotMatch(folded, /<details[^>]*\bopen(?:=|\s|>)/);
assert.match(sections[0][1], /반지름부터/);
assert.match(sections[0][1], /class="katex"/);
assert.match(sections[1][1], /반지름은 2/);
assert.doesNotMatch(sections[1][1].match(/<summary[^>]*>([\s\S]*?)<\/summary>/)![1], /반지름/);
const visible = folded.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, "");
assert.match(visible, /원의 넓이/);
assert.match(visible, /삼각형의 넓이/);
assert.doesNotMatch(visible, /반지름/);
assert.doesNotMatch(renderToStaticMarkup(<Markdown>{hintMarkdown}</Markdown>), /<details/);

const legacy = renderToStaticMarkup(<Markdown collapseHints>{"**힌트:** 양변을 제곱하세요.\n\n**다음 문제**\n\n새로운 문제예요."}</Markdown>);
assert.match(legacy, /<details[\s\S]*양변을 제곱하세요[\s\S]*<\/details>/);
assert.match(legacy, /<\/details>[\s\S]*새로운 문제예요/);
const codeAndMention = renderToStaticMarkup(<Markdown collapseHints>{"힌트 없이 풀어보세요.\n\n```text\n## 힌트\n이것은 코드입니다.\n```"}</Markdown>);
assert.doesNotMatch(codeAndMention, /<details/);
for (const partial of ["## 힌트\n\n반", "## 힌트\n\n반지름은 $r", "## 힌트\n\n반지름은 $r$예요."]) {
  const streamed = renderToStaticMarkup(<Markdown collapseHints>{partial}</Markdown>);
  assert.match(streamed, /<details/);
  assert.doesNotMatch(streamed.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, ""), /반지름|반/);
}
console.log("힌트 접기 검증 완료: 기본 닫힘, 섹션 경계, 수식, 기존 굵은 제목, 스트리밍, 코드 블록 제외");
