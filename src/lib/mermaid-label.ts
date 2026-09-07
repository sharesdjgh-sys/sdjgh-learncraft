import { decodeHTMLStrict } from "entities";

/** Normalize model-written entities/line breaks as text, never as HTML. */
export function normalizeMermaidLabel(value: string) {
  let text = value;
  for (let pass = 0; pass < 4; pass++) {
    const decoded = decodeHTMLStrict(text);
    if (decoded === text) break;
    text = decoded;
  }
  return text.replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\r\n?|[\u2028\u2029]/g, "\n")
    .replace(/[\t\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
}

export function mermaidLabel(value: string) {
  // Quoted Mermaid labels accept punctuation and LF. Only syntax/HTML-sensitive
  // characters need protection; percent also blocks embedded Mermaid directives.
  return normalizeMermaidLabel(value).replace(/["#&<>`\\|%]/g,
    char => `#${char.codePointAt(0)};`);
}

/** Mermaid's SVG renderer can emit literal entities. Decode text nodes ONLY,
 * after DOMPurify: decoded <...> stays inert text, never markup or attributes. */
export function restoreMermaidLabelText(root: Element) {
  for (const label of root.querySelectorAll("text")) {
    const walker = label.ownerDocument.createTreeWalker(label, 4 /* SHOW_TEXT */);
    const nodes: { node: Node; start: number; end: number }[] = [];
    let original = "";
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const start = original.length;
      original += node.nodeValue ?? "";
      nodes.push({ node, start, end: original.length });
    }
    // Mermaid can wrap one entity across several tspans. Decode the joined text
    // while keeping every existing text node and its layout/position intact.
    const replacements = Array.from(original.matchAll(/&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/gi))
      .map(match => ({ start: match.index, end: match.index + match[0].length, text: decodeHTMLStrict(match[0]) }))
      .filter(item => item.text !== original.slice(item.start, item.end));
    for (const item of nodes) {
      let cursor = item.start;
      let value = "";
      for (const replacement of replacements) {
        if (replacement.end <= item.start) continue;
        if (replacement.start >= item.end) break;
        value += original.slice(cursor, Math.max(cursor, replacement.start));
        if (replacement.start >= item.start) value += replacement.text;
        cursor = Math.min(item.end, replacement.end);
      }
      item.node.nodeValue = value + original.slice(cursor, item.end);
    }
  }
}
