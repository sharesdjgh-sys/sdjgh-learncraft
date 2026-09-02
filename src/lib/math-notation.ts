/**
 * Render superscripts and subscripts in TeX's scriptscript style. Unlike a
 * CSS font-size override, this lets KaTeX recalculate fraction height,
 * baselines, and nested-script spacing together.
 */
export function compactMathScripts(expression: string) {
  let output = "";
  let cursor = 0;

  while (cursor < expression.length) {
    const character = expression[cursor];
    const escaped = cursor > 0 && expression[cursor - 1] === "\\";
    if ((character !== "^" && character !== "_") || escaped) {
      output += character;
      cursor += 1;
      continue;
    }

    output += character;
    const argumentStart = cursor + 1;
    if (expression[argumentStart] === "{") {
      const argumentEnd = matchingBrace(expression, argumentStart);
      if (argumentEnd === -1) {
        cursor += 1;
        continue;
      }
      const argument = expression.slice(argumentStart + 1, argumentEnd);
      output += argument.trimStart().startsWith("\\scriptscriptstyle")
        ? `{${argument}}`
        : `{\\scriptscriptstyle ${argument}}`;
      cursor = argumentEnd + 1;
      continue;
    }

    if (argumentStart < expression.length && expression[argumentStart] !== "\\") {
      output += `{\\scriptscriptstyle ${expression[argumentStart]}}`;
      cursor = argumentStart + 1;
      continue;
    }

    cursor += 1;
  }

  return output;
}

function matchingBrace(value: string, openingIndex: number) {
  let depth = 0;
  for (let index = openingIndex; index < value.length; index += 1) {
    if (value[index] === "{" && value[index - 1] !== "\\") depth += 1;
    if (value[index] === "}" && value[index - 1] !== "\\") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

export function compactDollarMath(markdown: string) {
  let output = "";
  let textStart = 0;
  let cursor = 0;
  let delimiterLength = 0;

  while (cursor < markdown.length) {
    if (markdown[cursor] !== "$" || (cursor > 0 && markdown[cursor - 1] === "\\")) {
      cursor += 1;
      continue;
    }

    const runLength = markdown[cursor + 1] === "$" ? 2 : 1;
    if (delimiterLength === 0) {
      output += markdown.slice(textStart, cursor + runLength);
      delimiterLength = runLength;
      cursor += runLength;
      textStart = cursor;
    } else if (runLength === delimiterLength) {
      output += compactMathScripts(markdown.slice(textStart, cursor));
      output += "$".repeat(runLength);
      delimiterLength = 0;
      cursor += runLength;
      textStart = cursor;
    } else {
      cursor += runLength;
    }
  }

  return output + markdown.slice(textStart);
}

/** Wrap a stored raw TeX expression as display math without duplicating delimiters. */
export function displayMathMarkdown(expression: string) {
  let value = expression.trim();
  if (value.startsWith("$$") && value.endsWith("$$")) value = value.slice(2, -2).trim();
  else if (value.startsWith("\\[") && value.endsWith("\\]")) value = value.slice(2, -2).trim();
  else if (value.startsWith("$") && value.endsWith("$")) value = value.slice(1, -1).trim();
  return `$$\n${value}\n$$`;
}
