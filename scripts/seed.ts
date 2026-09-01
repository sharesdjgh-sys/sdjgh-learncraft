import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { learningUnits, subjects as subjectSource } from "../src/data/curriculum";
import { defaultSelectedSchoolCourseKeys, schoolCourseCatalog } from "../src/data/school-course-catalog";
import { sampleStudentAccounts } from "../src/data/student-accounts";
import {
  courses,
  curriculumVersions,
  pricingConfigs,
  schoolCourseOfferings,
  schoolCourseSelections,
  schoolCurriculumVersions,
  schools,
  subjects,
  unitContents,
  units,
  users,
} from "../src/db/schema";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL을 .env.local 또는 환경 변수에 설정해 주세요.");
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

const SCHOOL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VERSION_2015_ID = "bbbbbbbb-bbbb-4bbb-8bbb-000000000015";
const VERSION_2022_ID = "bbbbbbbb-bbbb-4bbb-8bbb-000000000022";
const subjectIds = {
  KOREAN: "cccccccc-cccc-4ccc-8ccc-000000000001",
  ENGLISH: "cccccccc-cccc-4ccc-8ccc-000000000002",
  MATH: "cccccccc-cccc-4ccc-8ccc-000000000003",
} as const;

async function main() {
await db.insert(schools).values({
  id: SCHOOL_ID,
  name: "서대전여자고등학교",
  timezone: "Asia/Seoul",
  dailyAiLimit: 20,
}).onConflictDoUpdate({
  target: schools.id,
  set: { name: "서대전여자고등학교", updatedAt: new Date() },
});

for (const { user } of sampleStudentAccounts) {
  await db.insert(users).values({
    id: user.id,
    schoolId: user.schoolId,
    externalId: user.externalId,
    name: user.name,
    role: user.role,
    officialGrade: user.officialGrade,
    learningGrade: user.learningGrade,
  }).onConflictDoUpdate({
    target: users.id,
    set: {
      externalId: user.externalId,
      name: user.name,
      role: user.role,
      officialGrade: user.officialGrade,
      learningGrade: user.learningGrade,
      updatedAt: new Date(),
    },
  });
}

await db.insert(users).values({
  id: "22222222-2222-4222-8222-222222222222",
  schoolId: SCHOOL_ID,
  externalId: "lifeprof",
  name: "LearnCraft 관리자",
  role: "ADMIN",
}).onConflictDoUpdate({
  target: users.id,
  set: {
    externalId: "lifeprof",
    name: "LearnCraft 관리자",
    role: "ADMIN",
    officialGrade: null,
    learningGrade: null,
    updatedAt: new Date(),
  },
});

await db.insert(curriculumVersions).values([
  { id: VERSION_2015_ID, code: "2015_REVISED", title: "2015 개정 교육과정", active: true },
  { id: VERSION_2022_ID, code: "2022_REVISED", title: "2022 개정 교육과정", active: true },
]).onConflictDoNothing();

await db.insert(subjects).values(subjectSource.map((subject, index) => ({
  id: subjectIds[subject.code as keyof typeof subjectIds],
  code: subject.code,
  title: subject.title,
  displayOrder: index + 1,
}))).onConflictDoNothing();

const promotionalPrices = {
  input: Number(process.env.GEMINI_INPUT_USD_PER_MILLION || "0.75"),
  output: Number(process.env.GEMINI_OUTPUT_USD_PER_MILLION || "3.75"),
  cachedInput: Number(process.env.GEMINI_CACHED_INPUT_USD_PER_MILLION || "0.075"),
};
const standardPrices = { input: 1.5, output: 7.5, cachedInput: 0.15 };

if (Object.values(promotionalPrices).every(Number.isFinite)) {
  const pricedModels = [
    {
      promotionalId: "ffffffff-ffff-4fff-8fff-000000000001",
      standardId: "ffffffff-ffff-4fff-8fff-000000000003",
      modelId: process.env.GEMINI_FALLBACK_MODEL_ID ?? "gemini-3.6-flash",
    },
    {
      promotionalId: "ffffffff-ffff-4fff-8fff-000000000002",
      standardId: "ffffffff-ffff-4fff-8fff-000000000004",
      modelId: process.env.GEMINI_PRIMARY_MODEL_ID ?? "gemini-3.7-flash",
    },
  ];

  for (const model of pricedModels) {
    const pricePeriods = [
      {
        id: model.promotionalId,
        effectiveFrom: new Date("2026-08-26T00:00:00Z"),
        effectiveTo: new Date("2027-01-01T00:00:00Z"),
        prices: promotionalPrices,
      },
      {
        id: model.standardId,
        effectiveFrom: new Date("2027-01-01T00:00:00Z"),
        effectiveTo: null,
        prices: standardPrices,
      },
    ];

    for (const period of pricePeriods) {
      await db.insert(pricingConfigs).values({
        id: period.id,
        provider: "google",
        modelId: model.modelId,
        effectiveFrom: period.effectiveFrom,
        effectiveTo: period.effectiveTo,
        inputUsdPerMillion: String(period.prices.input),
        outputUsdPerMillion: String(period.prices.output),
        cachedInputUsdPerMillion: String(period.prices.cachedInput),
      }).onConflictDoUpdate({
        target: pricingConfigs.id,
        set: {
          modelId: model.modelId,
          effectiveFrom: period.effectiveFrom,
          effectiveTo: period.effectiveTo,
          inputUsdPerMillion: String(period.prices.input),
          outputUsdPerMillion: String(period.prices.output),
          cachedInputUsdPerMillion: String(period.prices.cachedInput),
        },
      });
    }
  }
}

const courseKeys = Array.from(new Set(learningUnits.map((unit) => (
  `${unit.curriculum}:${unit.subjectCode}:${unit.courseCode}`
))));
const courseIds = new Map<string, string>();

for (const courseKey of courseKeys) {
  const courseUnit = learningUnits.find((unit) => (
    `${unit.curriculum}:${unit.subjectCode}:${unit.courseCode}` === courseKey
  ));
  if (!courseUnit) continue;
  const versionId = courseUnit.curriculum.startsWith("2015") ? VERSION_2015_ID : VERSION_2022_ID;
  const [savedCourse] = await db.insert(courses).values({
    curriculumVersionId: versionId,
    subjectId: subjectIds[courseUnit.subjectCode as keyof typeof subjectIds],
    grade: courseUnit.grade,
    code: `COURSE-${courseUnit.courseCode}`,
    title: courseUnit.courseTitle,
    displayOrder: courseUnit.courseOrder,
  }).onConflictDoUpdate({
    target: [courses.curriculumVersionId, courses.code],
    set: {
      subjectId: subjectIds[courseUnit.subjectCode as keyof typeof subjectIds],
      grade: courseUnit.grade,
      title: courseUnit.courseTitle,
      displayOrder: courseUnit.courseOrder,
    },
  }).returning({ id: courses.id });
  if (!savedCourse) throw new Error(`${courseUnit.courseTitle} 과정을 저장하지 못했습니다.`);
  courseIds.set(courseKey, savedCourse.id);
}

const defaultSelectedSet = new Set(defaultSelectedSchoolCourseKeys);
await db.insert(schoolCourseSelections).values(schoolCourseCatalog.map((item) => ({
  schoolId: SCHOOL_ID,
  catalogKey: item.key,
  academicYear: item.academicYear,
  grade: item.grade,
  subjectCode: item.subjectCode,
  courseTitle: item.courseTitle,
  publisherName: item.publisherName,
  contentCourseCode: item.contentCourseCode ?? null,
  enabled: defaultSelectedSet.has(item.key),
}))).onConflictDoNothing();

const [savedSchoolCurriculum] = await db.insert(schoolCurriculumVersions).values({
  schoolId: SCHOOL_ID,
  academicYear: 2026,
  revision: 1,
  title: "2026학년도 교육과정",
  status: "PUBLISHED",
  sourceFileName: "2026학년도 서대전여고 검인정 교과서 선정결과.pdf",
  publishedAt: new Date(),
}).onConflictDoUpdate({
  target: [
    schoolCurriculumVersions.schoolId,
    schoolCurriculumVersions.academicYear,
    schoolCurriculumVersions.revision,
  ],
  set: {
    title: "2026학년도 교육과정",
    updatedAt: new Date(),
  },
}).returning({ id: schoolCurriculumVersions.id });
if (!savedSchoolCurriculum) throw new Error("학교 교육과정 버전을 저장하지 못했습니다.");

await db.insert(schoolCourseOfferings).values(schoolCourseCatalog.map((item, displayOrder) => ({
  versionId: savedSchoolCurriculum.id,
  rowKey: item.key,
  grade: item.grade,
  subjectCode: item.subjectCode,
  subjectTitle: item.subjectTitle,
  courseTitle: item.courseTitle,
  publisherName: item.publisherName,
  contentCourseCode: item.contentCourseCode ?? null,
  enabled: defaultSelectedSet.has(item.key),
  confidence: 100,
  reviewRequired: false,
  displayOrder,
}))).onConflictDoNothing();

for (const [index, unit] of learningUnits.entries()) {
  const courseKey = `${unit.curriculum}:${unit.subjectCode}:${unit.courseCode}`;
  const courseId = courseIds.get(courseKey);
  if (!courseId) throw new Error(`${unit.courseTitle} 과정 ID를 만들지 못했습니다.`);
  await db.insert(units).values({
    id: unit.id,
    courseId,
    code: unit.code,
    title: unit.title,
    displayOrder: index + 1,
    scopeIncluded: unit.keyPoints,
    scopeExcluded: unit.scopeExcluded,
    prerequisites: unit.prerequisites,
    tutorPrompt: unit.tutorInstructions,
    promptVersion: 4,
    status: "DEVELOPER_REVIEWED",
    reviewerName: "LearnCraft 교육과정 정리",
    reviewedAt: new Date(),
  }).onConflictDoUpdate({
    target: units.id,
    set: {
      courseId,
      code: unit.code,
      title: unit.title,
      displayOrder: index + 1,
      scopeIncluded: unit.keyPoints,
      scopeExcluded: unit.scopeExcluded,
      prerequisites: unit.prerequisites,
      tutorPrompt: unit.tutorInstructions,
      promptVersion: 4,
      status: "DEVELOPER_REVIEWED",
      reviewerName: "LearnCraft 교육과정 정리",
      reviewedAt: new Date(),
      updatedAt: new Date(),
    },
  });
  const contentId = unit.id.replace(
    /^(10000000|20000000)/,
    unit.subjectCode === "MATH" ? "41000000" : "42000000",
  );
  await db.insert(unitContents).values({
    id: contentId,
    unitId: unit.id,
    version: 1,
    summaryMarkdown: unit.summary,
    keyPoints: unit.keyPoints,
    formulas: unit.formulas,
    examples: unit.examples,
    status: "DEVELOPER_REVIEWED",
    reviewerName: "LearnCraft 교육과정 정리",
    reviewedAt: new Date(),
  }).onConflictDoUpdate({
    target: [unitContents.unitId, unitContents.version],
    set: {
      unitId: unit.id,
      summaryMarkdown: unit.summary,
      keyPoints: unit.keyPoints,
      formulas: unit.formulas,
      examples: unit.examples,
      status: "DEVELOPER_REVIEWED",
      reviewerName: "LearnCraft 교육과정 정리",
      reviewedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

console.log(`LearnCraft seed 완료: 학교 1개, 사용자 ${sampleStudentAccounts.length + 1}명, 과정 ${courseIds.size}개, 단원 ${learningUnits.length}개`);
}

main().catch((error) => {
  console.error("LearnCraft seed 실패", error);
  process.exitCode = 1;
});
