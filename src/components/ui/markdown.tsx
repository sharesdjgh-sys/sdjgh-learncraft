"use client";

import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-4 text-balance text-2xl leading-[1.35] font-extrabold tracking-[-0.025em] text-ink first:mt-0 sm:text-[1.65rem]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-7 mb-3 border-b border-line pb-2 text-balance text-xl leading-[1.4] font-extrabold tracking-[-0.02em] text-ink first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 mb-2.5 text-lg leading-[1.45] font-bold tracking-[-0.015em] text-ink first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-5 mb-2 text-base leading-7 font-bold text-ink first:mt-0">{children}</h4>
  ),
  p: ({ children }) => <p className="my-3 leading-[1.82] first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-extrabold text-[#203676]">{children}</strong>,
  em: ({ children }) => <em className="text-ink-soft">{children}</em>,
  del: ({ children }) => <del className="text-ink-soft decoration-[#91a09c]">{children}</del>,
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-6 marker:text-brand">{children}</ul>
  ),
  ol: ({ children, start }) => (
    <ol start={start} className="my-3 list-decimal space-y-1.5 pl-6 marker:font-bold marker:text-brand">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-[1.75] [&>p]:my-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-5 rounded-r-xl border-l-4 border-brand bg-brand-soft/55 px-4 py-2.5 text-[#3d4963] [&>p]:my-1">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-7 border-0 border-t border-line" />,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:text-brand-dark hover:decoration-brand focus-visible:rounded-sm"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => (
    <code
      className={`${className ?? ""} rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[0.88em] leading-relaxed text-brand-dark [word-break:break-word]`}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="scrollbar-subtle my-5 overflow-x-auto rounded-xl border border-line bg-[#172033] p-4 text-[0.84rem] leading-6 text-[#eef1f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [tab-size:2] [&>code]:block [&>code]:min-w-max [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div
      className="scrollbar-subtle my-5 max-w-full overflow-x-auto rounded-xl border border-line"
      role="region"
      aria-label="가로로 스크롤할 수 있는 표"
      tabIndex={0}
    >
      <table className="w-full min-w-[32rem] border-collapse text-left text-[0.88rem] leading-6">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-muted text-ink">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-line bg-white">{children}</tbody>,
  tr: ({ children }) => <tr className="transition-colors hover:bg-[#f7f8fb]">{children}</tr>,
  th: ({ children }) => (
    <th scope="col" className="border-r border-line px-3.5 py-2.5 font-bold last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-r border-line px-3.5 py-2.5 align-top last:border-r-0">{children}</td>
  ),
  img: ({ src, alt }) => (
    // Markdown URLs still pass through react-markdown's safe default URL transform.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      className="my-5 h-auto max-w-full rounded-xl border border-line bg-surface-muted"
    />
  ),
};

/**
 * Gemini and GPT models frequently use TeX's \(...\) and \[...\] delimiters.
 * remark-math expects dollar delimiters, so translate them without touching
 * fenced code blocks or inline code spans that may be teaching the syntax.
 */
function normalizeMathDelimiters(markdown: string) {
  let output = "";
  let plainText = "";
  let cursor = 0;
  let fenceCharacter = "";
  let fenceLength = 0;

  while (cursor < markdown.length) {
    const nextLineBreak = markdown.indexOf("\n", cursor);
    const lineEnd = nextLineBreak === -1 ? markdown.length : nextLineBreak + 1;
    const line = markdown.slice(cursor, lineEnd);

    if (!fenceCharacter) {
      const openingFence = line.match(/^ {0,3}(`{3,}|~{3,})/);

      if (openingFence) {
        output += normalizeInlineCodeAwareText(plainText);
        plainText = "";
        output += line;
        fenceCharacter = openingFence[1][0];
        fenceLength = openingFence[1].length;
      } else {
        plainText += line;
      }
    } else {
      output += line;
      const closingFence = line.match(/^ {0,3}(`{3,}|~{3,})[\t ]*(?:\r?\n)?$/);

      if (
        closingFence &&
        closingFence[1][0] === fenceCharacter &&
        closingFence[1].length >= fenceLength
      ) {
        fenceCharacter = "";
        fenceLength = 0;
      }
    }

    cursor = lineEnd;
  }

  return output + normalizeInlineCodeAwareText(plainText);
}

function normalizeInlineCodeAwareText(value: string) {
  let output = "";
  let plainTextStart = 0;
  let cursor = 0;

  while (cursor < value.length) {
    if (value[cursor] !== "`") {
      cursor += 1;
      continue;
    }

    const openingStart = cursor;
    while (value[cursor] === "`") cursor += 1;
    const delimiterLength = cursor - openingStart;
    const closingStart = findExactBacktickRun(value, cursor, delimiterLength);

    if (closingStart === -1) continue;

    output += normalizePlainMath(value.slice(plainTextStart, openingStart));
    const closingEnd = closingStart + delimiterLength;
    output += value.slice(openingStart, closingEnd);
    plainTextStart = closingEnd;
    cursor = closingEnd;
  }

  return output + normalizePlainMath(value.slice(plainTextStart));
}

function findExactBacktickRun(value: string, from: number, length: number) {
  const delimiter = "`".repeat(length);
  let match = value.indexOf(delimiter, from);

  while (match !== -1) {
    const hasBacktickBefore = match > 0 && value[match - 1] === "`";
    const hasBacktickAfter = value[match + length] === "`";

    if (!hasBacktickBefore && !hasBacktickAfter) return match;
    match = value.indexOf(delimiter, match + 1);
  }

  return -1;
}

function normalizePlainMath(value: string) {
  const emphasisNormalized = normalizeKoreanEmphasisBoundaries(value);
  const shortDisplayMathNormalized = normalizeShortDisplayMath(emphasisNormalized);
  const displayMathNormalized = shortDisplayMathNormalized.replace(
    /(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g,
    (match, expression: string) => {
      const trimmedExpression = expression.trim();
      return trimmedExpression ? `\n\n$$\n${trimmedExpression}\n$$\n\n` : match;
    },
  );

  return displayMathNormalized.replace(
    /(?<!\\)\\\(([^\r\n]*?)(?<!\\)\\\)/g,
    (match, expression: string) => {
      const trimmedExpression = expression.trim();
      return trimmedExpression ? `$${trimmedExpression}$` : match;
    },
  );
}

/**
 * CommonMark does not close emphasis when its content ends in punctuation and
 * a Korean particle immediately follows it: **각도(입력값)**에. A skipped HTML
 * comment gives the parser a punctuation boundary without adding a visible
 * space between the noun and its particle.
 */
function normalizeKoreanEmphasisBoundaries(value: string) {
  return value.replace(
    /(\*\*[^*\r\n]+?\*\*)(?=[가-힣])/g,
    "$1<!--learncraft-emphasis-boundary-->",
  );
}

/**
 * Models occasionally put a single number or a very short expression in a
 * display block while it is still part of a Korean sentence. That breaks
 * surrounding emphasis and creates an awkward three-line sentence. Keep real
 * display equations intact, but bring these accidental short blocks inline.
 */
function normalizeShortDisplayMath(value: string) {
  const betweenSentenceText = /(?<=\S)[\t ]*\r?\n[\t ]*\$\$[\t ]*(?:\r?\n[\t ]*)?([^$\r\n]{1,24}?)[\t ]*(?:\r?\n[\t ]*)?\$\$[\t ]*\r?\n[\t ]*(?=\S)/g;
  const texDisplayBetweenSentenceText = /(?<=\S)[\t ]*\r?\n[\t ]*\\\[[\t ]*([^\]$\r\n]{1,24}?)[\t ]*\\\][\t ]*\r?\n[\t ]*(?=\S)/g;

  return value
    .replace(betweenSentenceText, (_, expression: string) => ` $${expression.trim()}$`)
    .replace(texDisplayBetweenSentenceText, (_, expression: string) => ` $${expression.trim()}$`);
}

export function Markdown({ children }: { children: string }) {
  const normalizedMarkdown = useMemo(() => normalizeMathDelimiters(children), [children]);

  return (
    <div className="learncraft-markdown min-w-0 max-w-none break-words text-[0.965rem] leading-[1.78] text-[#303b52] [word-break:keep-all]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
        skipHtml
      >
        {normalizedMarkdown}
      </ReactMarkdown>
    </div>
  );
}
