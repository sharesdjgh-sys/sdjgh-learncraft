const romanNumeralPrefix = /^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]+(?:(?=\d)|[.)．、:：]\s*|\s+)/;
const asciiRomanNumeralPrefix = /^(?:XII|XI|IX|VIII|VII|VI|IV|V|III|II|I)(?:(?=\d)|[.)．、:：]\s*|\s+)/i;
const hierarchicalNumberPrefix = /^\d{1,3}(?:\s*[.-]\s*\d{1,3})+\s*[.)．、:：]?\s+/;
const decimalNumberPrefix = /^\d{1,3}\s*[.)．、:：]\s*/;
const circledNumberPrefix = /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/;

/** Remove TOC numbering already represented by the normalized order columns. */
export function curriculumTitle(value: string) {
  const original = value.trim();
  let title = original;

  for (let index = 0; index < 4; index += 1) {
    const normalized = title
      .replace(romanNumeralPrefix, "")
      .replace(asciiRomanNumeralPrefix, "")
      .replace(hierarchicalNumberPrefix, "")
      .replace(decimalNumberPrefix, "")
      .replace(circledNumberPrefix, "")
      .trim();
    if (normalized === title) break;
    title = normalized;
  }

  return title || original;
}
