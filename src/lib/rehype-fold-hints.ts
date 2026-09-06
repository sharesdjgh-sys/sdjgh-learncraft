import type { Element, Root, RootContent } from "hast";

function textContent(node: RootContent): string {
  if (node.type === "text") return node.value;
  return "children" in node ? node.children.map(textContent).join("") : "";
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
  const normalized = title.replace(/^[\s\p{Extended_Pictographic}\uFE0F\d.()\[\]:-]+/u, "").trim();
  if (/^(?:풀이\s*전략|접근\s*전략)(?:\s|[:：(\d]|$)/.test(normalized)) return "풀이 전략";
  if (/^(?:(?:단계별|작은|첫\s*번째|두\s*번째|추가)\s*)?힌트(?:\s|[:：(\d]|$)/.test(normalized)) return "힌트";
  return null;
}

/** Fold parsed sections, leaving code fences and ordinary mentions untouched. */
export function rehypeFoldHints() {
  return (tree: Root) => {
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
        output.push({
          type: "element", tagName: "details", properties: {},
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
