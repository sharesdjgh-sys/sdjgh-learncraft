import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { learningUnits, subjects as subjectSource } from "../src/data/curriculum";
import { sampleStudentAccounts } from "../src/data/student-accounts";
import {
  courses,
  curriculumVersions,
  pricingConfigs,
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
  id: subjectIds[subject.code],
  code: subject.code,
  title: subject.title,
  displayOrder: index + 1,
}))).onConflictDoNothing();

const inputPrice = Number(process.env.GEMINI_INPUT_USD_PER_MILLION);
const outputPrice = Number(process.env.GEMINI_OUTPUT_USD_PER_MILLION);
const cachedInputPrice = Number(process.env.GEMINI_CACHED_INPUT_USD_PER_MILLION);
if ([inputPrice, outputPrice, cachedInputPrice].every(Number.isFinite)) {
  await db.insert(pricingConfigs).values({
    id: "ffffffff-ffff-4fff-8fff-000000000001",
    provider: "google",
    modelId: process.env.GEMINI_MODEL_ID ?? "gemini-3.6-flash",
    effectiveFrom: new Date("2026-08-26T00:00:00Z"),
    inputUsdPerMillion: String(inputPrice),
    outputUsdPerMillion: String(outputPrice),
    cachedInputUsdPerMillion: String(cachedInputPrice),
  }).onConflictDoNothing();
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
    subjectId: subjectIds[courseUnit.subjectCode],
    grade: courseUnit.grade,
    code: `COURSE-${courseUnit.courseCode}`,
    title: courseUnit.courseTitle,
    displayOrder: courseUnit.courseOrder,
  }).onConflictDoUpdate({
    target: [courses.curriculumVersionId, courses.code],
    set: {
      subjectId: subjectIds[courseUnit.subjectCode],
      grade: courseUnit.grade,
      title: courseUnit.courseTitle,
      displayOrder: courseUnit.courseOrder,
    },
  }).returning({ id: courses.id });
  if (!savedCourse) throw new Error(`${courseUnit.courseTitle} 과정을 저장하지 못했습니다.`);
  courseIds.set(courseKey, savedCourse.id);
}

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

console.log(`LearnCraft seed 완료: 학교 1개, 사용자 2명, 과정 ${courseIds.size}개, 단원 ${learningUnits.length}개`);
}

main().catch((error) => {
  console.error("LearnCraft seed 실패", error);
  process.exitCode = 1;
});
