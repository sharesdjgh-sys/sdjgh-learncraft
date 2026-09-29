import type { Element, Root, RootContent } from "hast";

function textContent(node: RootContent): string {
  if (node.type === "text") return node.value;
  return "children" in node ? node.children.map(textContent).join("") : "";
}

function classNames(node: Element) {
  const value: unknown = node.properties?.className;
  return Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/\s+/) : [];
}

const blockTags = new Set(["p", "li", "blockquote", "pre", "table", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "div"]);

/** Plain text that keeps math delimiters, so the grader sees the same formulas as the student. */
function markdownText(node: RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element") return "";
  const classes = classNames(node);
  if (classes.includes("math-display")) return `\n$$${textContent(node)}$$\n`;
  if (classes.includes("math-inline")) return `$${textContent(node)}$`;
  if (node.tagName === "br") return "\n";
  const inner = node.children.map(markdownText).join("");
  return blockTags.has(node.tagName) ? `${inner}\n` : inner;
}

function sectionMarker(node: RootContent) {
  if (node.type !== "element") return null;
  if (/^h[1-6]$/.test(node.tagName)) {
    return { depth: Number(node.tagName[1]), title: textContent(node) };
  }
  if (node.tagName === "p") {
    const first = node.children.find((child) => child.type !== "text" || child.value.trim());
    if (first?.type === "element" && first.tagName === "strong") {
      return { depth: 7, title: textContent(first) };
    }
  }
  return null;
}

function hintLabel(title: string) {
  const normalized = title.replace(/^[\s\p{Extended_Pictographic}️\d.()\[\]:-]+/u, "").trim();
  if (/^(?:풀이\s*전략|접근\s*전략)(?:\s|[:：(\d]|$)/.test(normalized)) return "풀이 전략";
  if (/^(?:(?:단계별|작은|첫\s*번째|두\s*번째|추가)\s*)?힌트(?:\s|[:：(\d]|$)/.test(normalized)) return "힌트";
  if (/^확인\s*(?:정답|해설)(?:\s|[:：(\d]|$)/.test(normalized)) return "정답";
  return null;
}

const questionTitlePattern = /확인\s*(?:질문|문제)|생각해\s*볼\s*질문|질문/;

/** The question text right before a folded answer: its own section, or the nearest few blocks. */
function precedingQuestion(output: RootContent[]) {
  const parts: string[] = [];
  let blocks = 0;
  for (let index = output.length - 1; index >= 0 && blocks < 6; index -= 1) {
    const node = output[index];
    if (node.type !== "element") continue;
    if (node.tagName === "details") continue;
    const marker = sectionMarker(node);
    if (marker) {
      const rest = markdownText(node).replace(marker.title, "").trim();
      if (questionTitlePattern.test(marker.title) || marker.depth === 7) {
        if (rest) parts.unshift(rest);
      } else if (!parts.length && rest) parts.unshift(rest);
      break;
    }
    parts.unshift(markdownText(node).trim());
    blocks += 1;
  }
  return parts.filter(Boolean).join("\n").trim().slice(0, 1500);
}

/** Fold parsed sections, leaving code fences and ordinary mentions untouched. */
export function rehypeFoldHints() {
  return (tree: Root) => {
    let checkIndex = 0;
    function fold(parent: Root | Element) {
      const output: RootContent[] = [];
      for (let index = 0; index < parent.children.length; index += 1) {
        const node = parent.children[index];
        const marker = sectionMarker(node);
        const label = marker && hintLabel(marker.title);
        if (!marker || !label) {
          if (node.type === "element" && !["pre", "code", "details"].includes(node.tagName)) fold(node);
          output.push(node);
          continue;
        }
        const content = [node];
        while (index + 1 < parent.children.length) {
          const next = parent.children[index + 1];
          const nextMarker = sectionMarker(next);
          if (nextMarker && (nextMarker.depth <= marker.depth || hintLabel(nextMarker.title))) break;
          content.push(next);
          index += 1;
        }
        const properties: Element["properties"] = {};
        if (label === "정답") {
          const answer = content.map(markdownText).join("").replace(marker.title, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 3000);
          const question = precedingQuestion(output);
          if (question && answer) {
            properties.dataCheckIndex = checkIndex;
            properties.dataCheckQuestion = question;
            properties.dataCheckAnswer = answer;
            checkIndex += 1;
          }
        }
        output.push({
          type: "element", tagName: "details", properties,
          children: [
            { type: "element", tagName: "summary", properties: {}, children: [{ type: "text", value: `${label} 보기` }] },
            { type: "element", tagName: "div", properties: {}, children: content as Element["children"] },
          ],
        });
      }
      parent.children = output as Element["children"];
    }
    fold(tree);
  };
}
