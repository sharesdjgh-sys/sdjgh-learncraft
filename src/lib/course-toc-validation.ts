import { curriculumTitle } from "./curriculum-title";

/** Official catalog pages help discover a book, but cannot establish its TOC. */
export function isTextbookTocSource(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    if (!path || /(?:^|\/)(?:list|main_list|book-hi-car)(?:[/.]|$)/.test(path)) return false;
    if (/^\/(?:index|default|main|home)(?:\.[a-z]+)?$/.test(path)
      && !["bookId", "bookid", "id", "idx"].some((key) => parsed.searchParams.has(key))) return false;
    return !/^\/(?:high|middle|elementary|textbook|books\/\d{6})$/.test(path);
  } catch {
    return false;
  }
}

export type TocCoverage = {
  allChaptersReviewed: boolean;
  sourceKind: "TOC_DOCUMENT" | "BOOK_DETAIL" | "CATALOG_OR_UNKNOWN";
  chapters: Array<{ chapterTitle: string; topicCount: number }>;
};

/** Counts must come from the source review, not from the shortened extraction. */
export function hasCompleteTocCoverage(
  entries: Array<{ chapterTitle: string }>,
  coverage: TocCoverage | null | undefined,
) {
  if (!coverage?.allChaptersReviewed || coverage.sourceKind === "CATALOG_OR_UNKNOWN"
    || !coverage.chapters.length) return false;
  const actual = new Map<string, number>();
  for (const entry of entries) {
    const title = curriculumTitle(entry.chapterTitle);
    actual.set(title, (actual.get(title) ?? 0) + 1);
  }
  const expected = coverage.chapters.map((chapter) => curriculumTitle(chapter.chapterTitle));
  return new Set(expected).size === expected.length && actual.size === expected.length
    && coverage.chapters.every((chapter, index) => (
      Number.isInteger(chapter.topicCount) && chapter.topicCount > 0
      && [...actual.keys()][index] === expected[index]
      && actual.get(expected[index]) === chapter.topicCount
    ));
}
