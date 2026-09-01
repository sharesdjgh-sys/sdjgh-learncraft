"use client";

import { Children, isValidElement, useMemo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { FunctionGraph } from "@/components/ui/function-graph";
import { compactDollarMath } from "@/lib/math-notation";

function nodeText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(nodeText).join("");
  return "";
}

function MarkdownPre({ children }: { children?: ReactNode }) {
  const child = Children.toArray(children)[0];
  if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    const language = child.props.className ?? "";
    if (/\blanguage-(?:learncraft-)?graph\b/.test(language)) {
      return <FunctionGraph source={nodeText(child.props.children).trim()} />;
    }
  }

  return (
    <pre className="scrollbar-subtle my-5 overflow-x-auto rounded-[11px] border border-line bg-surface-3 p-4 text-[0.84rem] leading-6 text-ink-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] [tab-size:2] [&>code]:block [&>code]:min-w-max [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit">
      {children}
    </pre>
  );
}

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
  pre: MarkdownPre,
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
  tbody: ({ children }) => <tbody className="divide-y divide-line bg-surface">{children}</tbody>,
  tr: ({ children }) => <tr className="transition-colors hover:bg-surface-2">{children}</tr>,
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
export function normalizeMathDelimiters(markdown: string) {
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
      } else if (/^(?: {4}|\t)/.test(line)) {
        output += normalizeInlineCodeAwareText(plainText);
        plainText = "";
        output += line;
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
  const texAliasNormalized = normalizeTexAliases(value);
  const texInlineDelimiterNormalized = texAliasNormalized.replace(
    /(?<!\\)\\\(([^\r\n]*?)(?<!\\)\\\)/g,
    (match, expression: string) => expression.trim() ? `$${expression.trim()}$` : match,
  );
  const escapedStrongNormalized = normalizeEscapedStrongMarkers(texInlineDelimiterNormalized);
  const emphasisNormalized = normalizeKoreanEmphasisBoundaries(escapedStrongNormalized);
  const brokenLineMathNormalized = normalizeBrokenLineMath(emphasisNormalized);
  const adjacentMathNormalized = normalizeAdjacentDollarMath(brokenLineMathNormalized);
  const unclosedLineMathNormalized = normalizeUnclosedLineMath(adjacentMathNormalized);
  const shortDisplayMathNormalized = normalizeShortDisplayMath(unclosedLineMathNormalized);
  const displayMathNormalized = shortDisplayMathNormalized.replace(
    /(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g,
    (match, expression: string) => {
      const trimmedExpression = expression.trim();
      return trimmedExpression ? `\n\n$$\n${trimmedExpression}\n$$\n\n` : match;
    },
  );

  const dollarDisplayMathNormalized = normalizeDollarDisplayMath(displayMathNormalized);

  const texInlineMathNormalized = dollarDisplayMathNormalized.replace(
    /(?<!\\)\\\(([^\r\n]*?)(?<!\\)\\\)/g,
    (match, expression: string) => {
      const trimmedExpression = expression.trim();
      return trimmedExpression ? `$${trimmedExpression}$` : match;
    },
  );

  const looseMathNormalized = normalizeLooseMathNotation(texInlineMathNormalized);
  return compactDollarMath(separateKoreanFromDollarMath(looseMathNormalized));
}

function repairKoreanInsideMath(expression: string, delimiter: "$" | "$$") {
  const protectedCommands: string[] = [];
  const protectedExpression = expression.replace(
    /\\(?:text|textrm|textbf|operatorname)\s*\{[^{}]*\}/g,
    (command) => {
      const index = protectedCommands.push(command) - 1;
      return `LEARNCRAFTTEXT${index}TOKEN`;
    },
  );

  if (!/[가-힣]/.test(protectedExpression)) return null;

  const restoreCommands = (value: string) => value.replace(
    /LEARNCRAFTTEXT(\d+)TOKEN/g,
    (_, index: string) => protectedCommands[Number(index)] ?? "",
  );

  return protectedExpression
    .split(/([가-힣]+(?:[ \t]+[가-힣]+)*(?:[.!?]+)?)/g)
    .map((part) => {
      if (!part) return "";
      const restored = restoreCommands(part);
      if (/[가-힣]/.test(part)) return restored;

      const trimmed = restored.trim();
      if (!trimmed || !/(?:\\[A-Za-z]+|[A-Za-z0-9]|[_^=<>≤≥+*/÷×])/.test(trimmed)) {
        return restored;
      }

      const leadingSpace = restored.match(/^\s*/)?.[0] ?? "";
      const trailingSpace = restored.match(/\s*$/)?.[0] ?? "";
      return `${leadingSpace}${delimiter}${trimmed}${delimiter}${trailingSpace}`;
    })
    .join("");
}

/** Keep Korean prose outside math even when a model closes `$` several sentences late. */
function separateKoreanFromDollarMath(value: string) {
  let output = "";
  let textStart = 0;
  let openingStart = -1;
  let delimiter: "$" | "$$" | "" = "";
  let cursor = 0;

  while (cursor < value.length) {
    if (value[cursor] !== "$" || (cursor > 0 && value[cursor - 1] === "\\")) {
      cursor += 1;
      continue;
    }

    const foundDelimiter: "$" | "$$" = value[cursor + 1] === "$" ? "$$" : "$";
    if (!delimiter) {
      output += value.slice(textStart, cursor);
      delimiter = foundDelimiter;
      openingStart = cursor;
      cursor += foundDelimiter.length;
      textStart = cursor;
      continue;
    }

    if (foundDelimiter !== delimiter) {
      cursor += foundDelimiter.length;
      continue;
    }

    const expression = value.slice(textStart, cursor);
    const repaired = repairKoreanInsideMath(expression, delimiter);
    output += repaired ?? `${delimiter}${expression}${delimiter}`;
    cursor += delimiter.length;
    textStart = cursor;
    openingStart = -1;
    delimiter = "";
  }

  return output + value.slice(openingStart === -1 ? textStart : openingStart);
}

function looksLikeMathExpression(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0
    && !/[가-힣]/.test(trimmed)
    && /(?:\\[A-Za-z]+|[_^=<>≤≥]|[+*/÷×]|\d\s*-\s*\d)/.test(trimmed);
}

function singleDollarIndexes(value: string) {
  const indexes: number[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    if (value[cursor] !== "$" || (cursor > 0 && value[cursor - 1] === "\\")) {
      cursor += 1;
      continue;
    }
    if (value[cursor + 1] === "$" || (cursor > 0 && value[cursor - 1] === "$")) {
      cursor += 1;
      continue;
    }
    indexes.push(cursor);
    cursor += 1;
  }

  return indexes;
}

/**
 * Repair streaming answers where a model lets inline math cross a newline or
 * emits the closing dollar without its opening pair on the next line.
 */
function normalizeBrokenLineMath(value: string) {
  return value.split(/(\r?\n)/).map((line) => {
    if (line === "\n" || line === "\r\n" || line.includes("$$")) return line;
    let repaired = line;

    repaired = repaired.replace(
      /^(\s*)([^$]+?)\$(?=[가-힣])/,
      (match, indentation: string, expression: string) => (
        looksLikeMathExpression(expression)
          ? `${indentation}$${expression.trim()}$`
          : match
      ),
    );

    repaired = repaired.replace(
      /^(.*[가-힣])((?:\\[A-Za-z]+)[^$]*?)\$(?=[가-힣])/,
      (_, sentence: string, expression: string) => (
        looksLikeMathExpression(expression)
          ? `${sentence.trimEnd()} $${expression.trim()}$`
          : `${sentence}${expression}$`
      ),
    );

    if (!repaired.includes("$")) {
      if (looksLikeMathExpression(repaired)) return `$$${repaired.trim()}$$`;

      const mixed = repaired.match(/^(.*[가-힣])((?:[A-Za-z]|\\[A-Za-z]+).*)$/);
      if (mixed && looksLikeMathExpression(mixed[2])) {
        return `${mixed[1].trimEnd()} $${mixed[2].trim()}$`;
      }
    }

    const indexes = singleDollarIndexes(repaired);
    if (indexes.length % 2 === 0) return repaired;

    const lastDollar = indexes.at(-1)!;
    const trailing = repaired.slice(lastDollar + 1);
    if (looksLikeMathExpression(trailing)) return `${repaired}$`;

    return repaired;
  }).join("");
}

/** Normalize common model aliases before KaTeX parses the expression. */
function normalizeTexAliases(value: string) {
  return value
    .replace(/\\vector\s*\{([^{}]+)\}/g, String.raw`\vec{$1}`)
    .replace(/\\vec\s+([A-Z]{2,3})\b/g, String.raw`\overrightarrow{$1}`);
}

const superscriptCharacters: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁺": "+", "⁻": "-", "⁼": "=", "⁽": "(", "⁾": ")",
  "ⁿ": "n", "ⁱ": "i",
};

const subscriptCharacters: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  "₊": "+", "₋": "-", "₌": "=", "₍": "(", "₎": ")",
  "ₐ": "a", "ₑ": "e", "ₕ": "h", "ᵢ": "i", "ⱼ": "j", "ₖ": "k",
  "ₗ": "l", "ₘ": "m", "ₙ": "n", "ₒ": "o", "ₚ": "p", "ᵣ": "r",
  "ₛ": "s", "ₜ": "t", "ₓ": "x",
};

const superscriptRun = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ";
const subscriptRun = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜₓ";

function translateCharacters(value: string, map: Record<string, string>) {
  return Array.from(value, (character) => map[character] ?? character).join("");
}

function normalizeLooseTextMath(value: string) {
  return value
    .replace(
      /\\overrightarrow\s*(?:\{[^{}]+\}|[A-Za-z]{1,3})/g,
      (expression) => `$${expression}$`,
    )
    .replace(/\\vec\s*([A-Z]{2,3})\b/g, (_, symbols: string) => `$\\overrightarrow{${symbols}}$`)
    .replace(/\\vec\s*(?:\{[^{}]+\}|[A-Za-z])/g, (expression) => `$${expression}$`)
    .replace(/([A-Z]{2,3})⃗/g, (_, symbols: string) => `$\\overrightarrow{${symbols}}$`)
    .replace(/([A-Za-zΑ-Ωα-ω])⃗/g, (_, symbol: string) => `$\\vec{${symbol}}$`)
    .replace(
      new RegExp(`\\b(log|ln|sin|cos|tan)([${subscriptRun}${superscriptRun}]+)([A-Za-z0-9]?)`, "g"),
      (_, name: string, scripts: string, argument: string) => {
        const subscript = Array.from(scripts).filter((character) => character in subscriptCharacters).map((character) => subscriptCharacters[character]).join("");
        const superscript = Array.from(scripts).filter((character) => character in superscriptCharacters).map((character) => superscriptCharacters[character]).join("");
        return `$\\${name}${subscript ? `_{${subscript}}` : ""}${superscript ? `^{${superscript}}` : ""}${argument}$`;
      },
    )
    .replace(
      new RegExp(`((?:[A-Za-zΑ-Ωα-ω]|[0-9]+))([${subscriptRun}${superscriptRun}]+)`, "g"),
      (match, base: string, scripts: string) => {
        const translatedSubscript = translateCharacters(Array.from(scripts).filter((character) => character in subscriptCharacters).join(""), subscriptCharacters);
        const translatedSuperscript = translateCharacters(Array.from(scripts).filter((character) => character in superscriptCharacters).join(""), superscriptCharacters);
        if (!translatedSubscript && !translatedSuperscript) return match;
        return `$${base}${translatedSubscript ? `_{${translatedSubscript}}` : ""}${translatedSuperscript ? `^{${translatedSuperscript}}` : ""}$`;
      },
    );
}

/** Convert loose Unicode notation only outside existing dollar math blocks. */
function normalizeLooseMathNotation(value: string) {
  let output = "";
  let textStart = 0;
  let cursor = 0;
  let delimiterLength = 0;

  while (cursor < value.length) {
    if (value[cursor] !== "$" || (cursor > 0 && value[cursor - 1] === "\\")) {
      cursor += 1;
      continue;
    }

    const runLength = value[cursor + 1] === "$" ? 2 : 1;
    if (delimiterLength === 0) {
      output += normalizeLooseTextMath(value.slice(textStart, cursor));
      output += "$".repeat(runLength);
      delimiterLength = runLength;
      cursor += runLength;
      textStart = cursor;
    } else if (runLength === delimiterLength) {
      output += value.slice(textStart, cursor + runLength);
      delimiterLength = 0;
      cursor += runLength;
      textStart = cursor;
    } else {
      cursor += runLength;
    }
  }

  return output + (delimiterLength === 0
    ? normalizeLooseTextMath(value.slice(textStart))
    : value.slice(textStart));
}

/** Models occasionally escape both Markdown strong markers, making ** visible. */
function normalizeEscapedStrongMarkers(value: string) {
  return value.replace(
    /\\\*\\\*([^*\r\n]+?)\\\*\\\*/g,
    (_, content: string) => `**${content}**`,
  );
}

/**
 * Repair a standalone equation when a model emits only the opening dollar,
 * for example "$D=36-4(k+2)". Restrict this to lines containing clear math
 * operators so ordinary currency text is left unchanged.
 */
function normalizeUnclosedLineMath(value: string) {
  return value.replace(
    /^([\t ]*)\$([^$\r\n]+?)[\t ]*$/gm,
    (match, indentation: string, expression: string) => {
      const trimmedExpression = expression.trim();
      const looksLikeEquation = /(?:=|[_^]|[+\-*/×÷<>≤≥]|\\(?:frac|dfrac|sqrt|sum|lim|begin)\b)/.test(
        trimmedExpression,
      );

      if (!looksLikeEquation) return match;
      return `${indentation}$$\n${trimmedExpression}\n${indentation}$$`;
    },
  );
}

/**
 * Streaming models sometimes join neighboring math blocks without whitespace,
 * producing runs such as $$$$ or an inline close immediately followed by a
 * display open ($$$). Restore explicit block boundaries before remark-math
 * parses the Markdown.
 */
function normalizeAdjacentDollarMath(value: string) {
  return value
    .replace(
      /(?<!\\)\$\$([^$\r\n]+?)\${3}([^$\r\n]+?)\$(?!\$)/g,
      (_, displayExpression: string, inlineExpression: string) => (
        `$$${displayExpression.trim()}$$\n\n$${inlineExpression.trim()}$`
      ),
    )
    .replace(
      /(?<!\\)\$([^$\r\n]+?)\${3}(?!\$)/g,
      (_, inlineExpression: string) => `$${inlineExpression.trim()}$\n\n$$`,
    )
    .replace(/(?<!\\)\${4}(?!\$)/g, () => "$$\n\n$$")
    .replace(/(?<!\\)\$\$[\t ]+\$\$(?!\$)/g, () => "$$\n\n$$");
}

/** Keep complete dollar-delimited display equations on their own lines. */
function normalizeDollarDisplayMath(value: string) {
  return value.replace(
    /(?<!\\)\$\$([\s\S]*?)(?<!\\)\$\$/g,
    (match, expression: string) => {
      const trimmedExpression = expression.trim();
      return trimmedExpression ? `\n\n$$\n${trimmedExpression}\n$$\n\n` : match;
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
