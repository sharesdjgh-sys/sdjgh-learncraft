import { config } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { sanitizeVocabularyTerms, vocabularyTermKey } from "../src/features/vocabulary/content";
import type { LearningUnit } from "../src/types";

type Arguments = {
  apply: boolean;
  verify: boolean;
  schoolId?: string;
};

type UnitChange = {
  id: string;
  courseId: string;
  before: string[];
  after: string[];
  removed: string[];
};

type CourseChange = {
  contentId: string;
  schoolId: string;
  schoolName: string;
  courseId: string;
  grade: number;
  subjectTitle: string;
  courseTitle: string;
  contentUpdatedAt: Date;
  unitsJsonBefore: LearningUnit[];
  unitsJsonAfter: LearningUnit[];
  unitChanges: UnitChange[];
  jsonUnitChanges: number;
  removed: string[];
};

function parseArguments(argv: string[]): Arguments {
  const result: Arguments = { apply: false, verify: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") result.apply = true;
    else if (argument === "--verify") result.verify = true;
    else if (argument === "--school-id") result.schoolId = argv[++index];
    else if (argument === "--help") {
      console.log([
        "사용법: npx tsx scripts/clean-vocabulary-keywords.ts [옵션]",
        "  기본 실행                 변경 예정 내용만 출력합니다.",
        "  --school-id <uuid>        한 학교만 검사합니다.",
        "  --verify                  변경 예정 항목이 있으면 실패 코드로 종료합니다.",
        "  --apply --school-id <uuid> 해당 학교의 변경 사항을 과정별 트랜잭션으로 적용합니다.",
      ].join("\n"));
      process.exit(0);
    } else throw new Error(`알 수 없는 옵션입니다: ${argument}`);
  }
  if (result.schoolId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.schoolId)) {
    throw new Error("--school-id에는 올바른 UUID를 입력해 주세요.");
  }
  if (result.apply && !result.schoolId) {
    throw new Error("데이터 변경에는 소유 범위를 확인할 --school-id가 반드시 필요합니다.");
  }
  return result;
}

function cleanKeywords(keywords: string[], labels: string[]) {
  return sanitizeVocabularyTerms(keywords, labels);
}

function sameKeywords(before: string[], after: string[]) {
  return before.length === after.length && before.every((term, index) => term === after[index]);
}

function removedTerms(before: string[], after: string[]) {
  const remaining = new Map<string, number>();
  for (const term of after) {
    const key = vocabularyTermKey(term);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  return before.filter(term => {
    const key = vocabularyTermKey(term);
    const count = remaining.get(key) ?? 0;
    if (count === 0) return true;
    remaining.set(key, count - 1);
    return false;
  });
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  config({ path: ".env.local", quiet: true });

  const [{ db }, schema] = await Promise.all([
    import("../src/db/index"),
    import("../src/db/schema"),
  ]);
  if (!db) {
    console.error("DATABASE_URL이 설정되지 않아 검사할 수 없습니다.");
    process.exitCode = 1;
    return;
  }
  const database = db;

  const schoolRows = await database.select({
    id: schema.schools.id,
    name: schema.schools.name,
    active: schema.schools.active,
  }).from(schema.schools)
    .where(args.schoolId ? eq(schema.schools.id, args.schoolId) : undefined);
  if (args.schoolId && schoolRows.length !== 1) throw new Error("지정한 학교를 찾지 못했습니다.");
  if (args.apply && !schoolRows[0]?.active) throw new Error("비활성 학교의 데이터는 변경할 수 없습니다.");
  const schoolNames = new Map(schoolRows.map(row => [row.id, row.name]));

  async function findChanges(): Promise<CourseChange[]> {
    const contents = await database.select({
      id: schema.generatedCourseContents.id,
      schoolId: schema.generatedCourseContents.schoolId,
      courseId: schema.generatedCourseContents.courseId,
      unitsJson: schema.generatedCourseContents.unitsJson,
      updatedAt: schema.generatedCourseContents.updatedAt,
      grade: schema.schoolCourseOfferings.grade,
      subjectTitle: schema.schoolCourseOfferings.subjectTitle,
      courseTitle: schema.schoolCourseOfferings.courseTitle,
    }).from(schema.generatedCourseContents)
      .innerJoin(schema.schoolCourseOfferings, eq(schema.schoolCourseOfferings.id, schema.generatedCourseContents.offeringId))
      .innerJoin(schema.schoolCurriculumVersions, eq(schema.schoolCurriculumVersions.id, schema.schoolCourseOfferings.versionId))
      .where(and(
        eq(schema.schoolCurriculumVersions.status, "PUBLISHED"),
        eq(schema.generatedCourseContents.status, "PUBLISHED"),
        eq(schema.schoolCourseOfferings.enabled, true),
        args.schoolId ? eq(schema.generatedCourseContents.schoolId, args.schoolId) : undefined,
      ));
    if (contents.length === 0) return [];

    const databaseUnits = await database.select({
      id: schema.units.id,
      courseId: schema.units.courseId,
      title: schema.units.title,
      chapterTitle: schema.units.chapterTitle,
      keywords: schema.units.keywords,
    }).from(schema.units).where(inArray(schema.units.courseId, [...new Set(contents.map(row => row.courseId))]));
    const unitsByCourse = new Map<string, typeof databaseUnits>();
    for (const unit of databaseUnits) {
      const members = unitsByCourse.get(unit.courseId) ?? [];
      members.push(unit);
      unitsByCourse.set(unit.courseId, members);
    }

    return contents.flatMap(content => {
      const databaseChanges: UnitChange[] = [];
      const removed: string[] = [];
      const removedKeys = new Set<string>();
      const recordRemoved = (terms: string[]) => {
        for (const term of terms) {
          const key = vocabularyTermKey(term);
          if (removedKeys.has(key)) continue;
          removedKeys.add(key);
          removed.push(term);
        }
      };
      for (const unit of unitsByCourse.get(content.courseId) ?? []) {
        const labels = [content.courseTitle];
        const after = cleanKeywords(unit.keywords, labels);
        if (!sameKeywords(unit.keywords, after)) {
          const unitRemoved = removedTerms(unit.keywords, after);
          recordRemoved(unitRemoved);
          databaseChanges.push({ id: unit.id, courseId: unit.courseId, before: unit.keywords, after, removed: unitRemoved });
        }
      }

      let jsonUnitChanges = 0;
      const unitsJsonAfter = content.unitsJson.map(unit => {
        const labels = [content.courseTitle];
        const keywords = cleanKeywords(unit.keywords ?? [], labels);
        if (sameKeywords(unit.keywords ?? [], keywords)) return unit;
        jsonUnitChanges += 1;
        recordRemoved(removedTerms(unit.keywords ?? [], keywords));
        return { ...unit, keywords };
      });
      if (databaseChanges.length === 0 && jsonUnitChanges === 0) return [];
      return [{
        contentId: content.id,
        schoolId: content.schoolId,
        schoolName: schoolNames.get(content.schoolId) ?? content.schoolId,
        courseId: content.courseId,
        grade: content.grade,
        subjectTitle: content.subjectTitle,
        courseTitle: content.courseTitle,
        contentUpdatedAt: content.updatedAt,
        unitsJsonBefore: content.unitsJson,
        unitsJsonAfter,
        unitChanges: databaseChanges,
        jsonUnitChanges,
        removed,
      }];
    });
  }

  function report(changes: CourseChange[]) {
    if (changes.length === 0) {
      console.log("정리할 어휘가 없습니다.");
      return;
    }
    for (const change of changes) {
      const terms = change.removed.join(", ");
      console.log(`[${change.schoolName}] ${change.grade}학년 ${change.subjectTitle} · ${change.courseTitle}`);
      console.log(`  DB 단원 ${change.unitChanges.length}개, 저장 JSON 단원 ${change.jsonUnitChanges}개 변경 예정`);
      console.log(`  제거: ${terms || "중복·공백 표기만 정리"}`);
    }
    console.log(`총 ${changes.length}개 과정이 변경 대상입니다.`);
  }

  const changes = await findChanges();
  report(changes);
  if (!args.apply) {
    if (args.verify && changes.length > 0) process.exitCode = 2;
    else if (changes.length > 0) console.log("dry-run입니다. 실제 적용에는 --apply와 --school-id를 함께 사용하세요.");
    return;
  }

  for (const change of changes) {
    if (change.schoolId !== args.schoolId) throw new Error("학교 소유 범위를 벗어난 변경을 감지했습니다.");
    const [currentContent] = await database.select({
      unitsJson: schema.generatedCourseContents.unitsJson,
      updatedAt: schema.generatedCourseContents.updatedAt,
    }).from(schema.generatedCourseContents).where(and(
      eq(schema.generatedCourseContents.id, change.contentId),
      eq(schema.generatedCourseContents.schoolId, args.schoolId),
      eq(schema.generatedCourseContents.courseId, change.courseId),
      eq(schema.generatedCourseContents.status, "PUBLISHED"),
    )).limit(1);
    const contentUnchanged = currentContent
      && currentContent.updatedAt.getTime() === change.contentUpdatedAt.getTime()
      && JSON.stringify(currentContent.unitsJson) === JSON.stringify(change.unitsJsonBefore);
    if (!contentUnchanged) {
      throw new Error(`${change.courseTitle} 콘텐츠가 검사 후 수정되어 적용을 중단했습니다. dry-run부터 다시 실행해 주세요.`);
    }
    const statements: BatchItem<"pg">[] = change.unitChanges.map(unit => database.update(schema.units).set({
      keywords: unit.after,
      updatedAt: new Date(),
    }).where(and(
      eq(schema.units.id, unit.id),
      eq(schema.units.courseId, change.courseId),
      eq(schema.units.keywords, unit.before),
    )).returning({ id: schema.units.id }));
    statements.push(database.update(schema.generatedCourseContents).set({
      unitsJson: change.unitsJsonAfter,
      updatedAt: new Date(),
    }).where(and(
      eq(schema.generatedCourseContents.id, change.contentId),
      eq(schema.generatedCourseContents.schoolId, args.schoolId),
      eq(schema.generatedCourseContents.courseId, change.courseId),
    )).returning({ id: schema.generatedCourseContents.id }));
    const results = await database.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
    if ((results as unknown[]).some(result => !Array.isArray(result) || result.length !== 1)) {
      throw new Error(`${change.courseTitle} 갱신 중 소유 범위 또는 동시 수정 검증에 실패했습니다.`);
    }
  }

  const remaining = await findChanges();
  if (remaining.length > 0) {
    report(remaining);
    throw new Error("적용 후 재검증에서 정리되지 않은 어휘가 발견됐습니다.");
  }
  console.log(`적용 완료: ${changes.length}개 과정을 갱신했고 재검증을 통과했습니다.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
