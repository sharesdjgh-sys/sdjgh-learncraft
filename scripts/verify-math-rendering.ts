import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { InlineMarkdown, Markdown, normalizeMathDelimiters } from "../src/components/ui/markdown";
import { mathLearningUnits } from "../src/data/math-curriculum";
import { compactMathScripts, displayMathMarkdown } from "../src/lib/math-notation";

assert.equal(displayMathMarkdown(String.raw`d=c\times t`), "$$\nd=c\\times t\n$$");
assert.equal(displayMathMarkdown(String.raw`$$v=\frac{d}{t}$$`), "$$\nv=\\frac{d}{t}\n$$");
assert.equal(displayMathMarkdown(String.raw`\[F=ma\]`), "$$\nF=ma\n$$");

const generatedFormulaCases = [
  {
    name: "다항식의 나눗셈",
    expression: String.raw`P(x)=A(x)Q(x)+R(x)`,
    explanation: "나머지의 차수는 나누는 다항식의 차수보다 작습니다.",
  },
  {
    name: "빛의 속도와 거리의 관계",
    expression: String.raw`$$d = c \times t$$`,
    explanation: "거리 $d$는 진공에서의 빛의 속도 $c$와 빛이 이동한 시간 $t$의 곱으로 정의됩니다.",
  },
] as const;

for (const formula of generatedFormulaCases) {
  const expressionHtml = renderToStaticMarkup(createElement(Markdown, {
    children: displayMathMarkdown(formula.expression),
  }));
  const explanationHtml = renderToStaticMarkup(createElement(Markdown, {
    children: formula.explanation,
  }));

  assert.equal(
    (expressionHtml.match(/class="katex-display"/g) ?? []).length,
    1,
    `${formula.name}: 블록 수식으로 렌더링되지 않았습니다.`,
  );
  assert.doesNotMatch(expressionHtml, /\$\$/, `${formula.name}: 수식 구분자가 화면에 남았습니다.`);
  if (formula.explanation.includes("$")) {
    assert.ok(
      (explanationHtml.match(/class="katex"/g) ?? []).length >= 3,
      `${formula.name}: 설명의 인라인 수식이 렌더링되지 않았습니다.`,
    );
  }
}

const inlineSubjectContent = "센서(Sensors): 사람의 **눈·귀·피부(오감)**처럼 주변 환경의 정보를 감지하고 받아들여요.";
const inlineSubjectHtml = renderToStaticMarkup(createElement(InlineMarkdown, {
  children: inlineSubjectContent,
}));
assert.match(inlineSubjectHtml, /<strong[^>]*>눈·귀·피부\(오감\)<\/strong>/, "강조 문법이 렌더링되지 않았습니다.");
assert.doesNotMatch(inlineSubjectHtml, /\*\*/, "마크다운 강조 기호가 화면에 남았습니다.");

const generatedScienceExplanation = String.raw`초기 속도가 $0\,\text{m/s}$일 때 낙하 거리 $s$([$s$] = \text{m})와 시간 $t$([$t$] = \text{s})의 관계를 나타내며, $g$는 중력 가속도([$g$] = \text{m/s}^2, 약 $9.8\,\text{m/s}^2$)입니다.`;
const normalizedScienceExplanation = normalizeMathDelimiters(generatedScienceExplanation);
assert.match(normalizedScienceExplanation, /\$\[s\] = \\text\{m\}\$/, "거리의 단위식 전체가 인라인 수식이어야 합니다.");
assert.match(normalizedScienceExplanation, /\$\[t\] = \\text\{s\}\$/, "시간의 단위식 전체가 인라인 수식이어야 합니다.");
assert.match(normalizedScienceExplanation, /\$\[g\] = \\text\{m\/s\}\^\{\\scriptscriptstyle 2\}\$/, "가속도의 단위식 전체가 인라인 수식이어야 합니다.");
const generatedScienceHtml = renderToStaticMarkup(createElement(Markdown, { children: generatedScienceExplanation }));
assert.doesNotMatch(generatedScienceHtml, /katex-error/, "과학 단위식에 KaTeX 오류가 없어야 합니다.");

const normalizationCases = [
  ["x², aₙ, v⃗", String.raw`$x^{\scriptscriptstyle 2}$, $a_{\scriptscriptstyle n}$, $\vec{v}$`],
  ["log₃ 81", String.raw`$\log_{\scriptscriptstyle 3}$ 81`],
  ["sin²x", String.raw`$\sin^{\scriptscriptstyle 2}x$`],
  ["x²₁", String.raw`$x_{\scriptscriptstyle 1}^{\scriptscriptstyle 2}$`],
  ["AB⃗", String.raw`$\overrightarrow{AB}$`],
  [String.raw`\vec AB`, "\n\n$$\n" + String.raw`\overrightarrow{AB}` + "\n$$\n\n"],
  [String.raw`\vector{v}`, "\n\n$$\n" + String.raw`\vec{v}` + "\n$$\n\n"],
  [String.raw`\(\vec{a}\)`, String.raw`$\vec{a}$`],
] as const;

for (const [input, expected] of normalizationCases) {
  assert.equal(normalizeMathDelimiters(input), expected, `정규화 실패: ${input}`);
}

const protectedMarkdown = [
  "`x²와 $x^2$`",
  "```text\nx²와 $x^2$\n```",
  "    x²와 $x^2$",
].join("\n");
assert.equal(normalizeMathDelimiters(protectedMarkdown), protectedMarkdown, "코드 영역을 변경하면 안 됩니다.");
assert.equal(normalizeMathDelimiters("가격은 $100입니다."), "가격은 $100입니다.", "통화 표기를 수식으로 바꾸면 안 됩니다.");

const latexCorpus = [
  String.raw`x_i^2`,
  String.raw`x^{\frac{1}{2}}`,
  String.raw`a_{n+1}^{\frac{k}{m}}`,
  String.raw`\vec{a}`,
  String.raw`\overrightarrow{AB}`,
  String.raw`\vec{v}_i`,
  String.raw`\frac{x_1+x_2}{2}`,
  String.raw`\sqrt[n]{a^m}`,
  String.raw`\log_a b=c\iff a^c=b`,
  String.raw`\sin^2\theta+\cos^2\theta=1`,
  String.raw`\sum_{k=1}^{n}k`,
  String.raw`\lim_{x\to0}\frac{\sin x}{x}=1`,
  String.raw`\int_a^b f(x)\,dx`,
  String.raw`A\subseteq B,\quad x\in A`,
  String.raw`P(A\mid B)=\frac{P(A\cap B)}{P(B)}`,
  String.raw`\begin{pmatrix}a&b\\c&d\end{pmatrix}`,
  String.raw`f(x)=\begin{cases}x^2&x\ge0\\-x&x<0\end{cases}`,
  String.raw`\begin{aligned}x+y&=3\\x-y&=1\end{aligned}`,
];

for (const expression of latexCorpus) {
  const html = katex.renderToString(compactMathScripts(expression), {
    displayMode: true,
    output: "htmlAndMathml",
    strict: "error",
    throwOnError: true,
  });
  assert.match(html, /class="katex"/, `KaTeX 결과가 없습니다: ${expression}`);
  assert.doesNotMatch(html, /katex-error/, `KaTeX 오류가 있습니다: ${expression}`);
}

let curriculumFormulaCount = 0;
for (const unit of mathLearningUnits) {
  for (const formula of unit.formulas) {
    curriculumFormulaCount += 1;
    assert.doesNotThrow(
      () => katex.renderToString(compactMathScripts(formula.expression), {
        displayMode: true,
        output: "htmlAndMathml",
        strict: "error",
        throwOnError: true,
      }),
      `${unit.code} · ${formula.name}: ${formula.expression}`,
    );
  }
}

const malformedModelAnswer = String.raw`풀이 전략: 로그의 값을
x로 두고, 지수식으로 바꾸어 방정식을 풀면 돼요.

log
3
​
81=x라고 두면, 로그의 정의에 따라 지수식으로 바꿀 수 있어요. $3^x = 81
81 = 3^4$이므로 $x = 4$가 돼요. 따라서 $\log_3 81 = 4$예요. 2. $\log_5 \sqrt{5} = x$라고 두면, 마찬가지로 지수식으로 바꿀 수 있어요. $5^x = \sqrt{5}
\sqrt{5} = 5^{\frac{1}{2}}
이므로 x = \frac{1}{2}
이 돼요. 따라서 \log_5 \sqrt{5} = \frac{1}{2}$이에요.`;

const markdownCases = [
  "벡터 $\\overrightarrow{AB}$와 $\\vec{a}_i$를 비교해요.",
  "분수 지수 $a_{n+1}^{\\frac{k}{m}}$는 서로 겹치면 안 돼요.",
  "$$\\begin{aligned}x+y&=3\\\\x-y&=1\\end{aligned}$$",
  String.raw`값은 $3^4이므로 x=4가 돼요. 따라서 \log_3 81=4$예요.`,
  malformedModelAnswer,
];

const consecutiveDisplayMath = String.raw`3. **외접원의 반지름($R$) 구하기**
   $\sin 30^\circ = \frac{1}{2}$이므로 식을 정리하면 다음과 같아요.
   $$\frac{4}{\frac{1}{2}} = 2R$$
   $$8 = 2R$$
   $$R = 4$$`;

markdownCases.push(consecutiveDisplayMath);

for (const input of markdownCases) {
  const normalized = normalizeMathDelimiters(input);
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...values: unknown[]) => warnings.push(values);
  let html: string;
  try {
    html = renderToStaticMarkup(createElement(Markdown, { children: input }));
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 0, `KaTeX strict 경고:\n${normalized}\n${warnings.flat().join(" ")}`);
  assert.doesNotMatch(html, /katex-error/, `Markdown KaTeX 오류:\n${normalized}`);
  assert.doesNotMatch(html, /<annotation[^>]*>[^<]*[가-힣][^<]*<\/annotation>/, `한글 문장이 수식 안에 들어갔습니다:\n${normalized}`);
  if (input === consecutiveDisplayMath) {
    assert.equal((html.match(/class="katex-display"/g) ?? []).length, 3, "연속된 display 수식 3개가 유지되어야 합니다.");
    assert.doesNotMatch(normalized, /^\s*\$(?:8 = 2R|R = 4)\s*$/gm, "display 수식의 달러 기호가 하나로 줄면 안 됩니다.");
  }
}

assert.match(normalizeMathDelimiters(malformedModelAnswer), /\\frac\{1\}\{2\}/, "실제 깨진 로그 응답의 분수 수식이 보존되어야 합니다.");

console.log(`수학 렌더링 검증 완료: 정규화 ${normalizationCases.length}건, 표현식 ${latexCorpus.length}건, 교육과정 공식 ${curriculumFormulaCount}건, Markdown ${markdownCases.length}건`);
