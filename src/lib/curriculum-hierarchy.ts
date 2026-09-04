import { curriculumTitle } from "@/lib/curriculum-title";

export type CurriculumHierarchyItem = {
  title: string;
  chapterOrder: number;
  sectionTitle: string;
  sectionOrder: number;
  topicOrder: number;
};

function comparableTitle(value: string) {
  return curriculumTitle(value)
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s*_`~]/g, "");
}

/** Two-level source TOCs are stored with the section repeated as their sole topic. */
export function hasDistinctTopicLevel(item: CurriculumHierarchyItem) {
  return item.topicOrder > 1
    || comparableTitle(item.sectionTitle) !== comparableTitle(item.title);
}

export function formatCurriculumUnitNumber(item: CurriculumHierarchyItem) {
  const sectionNumber = `${item.chapterOrder}.${item.sectionOrder}`;
  return hasDistinctTopicLevel(item)
    ? `${sectionNumber}.${item.topicOrder}`
    : sectionNumber;
}

export function groupCurriculumUnits<
  T extends CurriculumHierarchyItem & { chapterTitle: string },
>(units: readonly T[]) {
  const chapters = new Map<number, {
    order: number;
    title: string;
    sections: Map<number, { order: number; title: string; units: T[] }>;
  }>();

  for (const unit of units) {
    const chapter = chapters.get(unit.chapterOrder) ?? {
      order: unit.chapterOrder,
      title: unit.chapterTitle,
      sections: new Map(),
    };
    const section = chapter.sections.get(unit.sectionOrder) ?? {
      order: unit.sectionOrder,
      title: unit.sectionTitle,
      units: [],
    };
    section.units.push(unit);
    chapter.sections.set(unit.sectionOrder, section);
    chapters.set(unit.chapterOrder, chapter);
  }

  return [...chapters.values()]
    .sort((left, right) => left.order - right.order)
    .map((chapter) => ({
      ...chapter,
      sections: [...chapter.sections.values()]
        .sort((left, right) => left.order - right.order)
        .map((section) => ({
          ...section,
          units: section.units.sort((left, right) => left.topicOrder - right.topicOrder),
        })),
    }));
}
