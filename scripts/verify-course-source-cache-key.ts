import assert from "node:assert/strict";
import {
  legacyCourseSourceFingerprint,
  sharedCourseSourceFingerprint,
  type CourseSourceCacheIdentity,
} from "../src/lib/course-source-cache-key";

const textbook: CourseSourceCacheIdentity = {
  academicYear: 2026,
  grade: 1,
  subjectTitle: "사회",
  courseTitle: "세계 시민과 지리",
  publisherName: "(주) 비상교육",
  textbookTitle: "세계 시민과 지리",
};

const anotherSchoolOffering: CourseSourceCacheIdentity = {
  ...textbook,
  academicYear: 2027,
  grade: 2,
  subjectTitle: "사회(선택)",
  courseTitle: "사회 선택 과목",
};

assert.equal(
  sharedCourseSourceFingerprint(textbook),
  sharedCourseSourceFingerprint(anotherSchoolOffering),
  "교과서명이 같으면 학교의 연도·학년·교과 분류와 시간표 과목명이 달라도 캐시를 공유해야 합니다.",
);
assert.equal(
  sharedCourseSourceFingerprint(textbook),
  sharedCourseSourceFingerprint({
    ...textbook,
    textbookTitle: "세계시민과지리",
    publisherName: "비상교육",
  }),
  "공백과 출판사 법인 표기 차이는 같은 교과서로 정규화해야 합니다.",
);
assert.notEqual(
  sharedCourseSourceFingerprint(textbook),
  sharedCourseSourceFingerprint({ ...textbook, publisherName: "미래엔" }),
  "출판사가 다르면 캐시를 공유하면 안 됩니다.",
);
assert.notEqual(
  sharedCourseSourceFingerprint(textbook),
  sharedCourseSourceFingerprint({ ...textbook, textbookTitle: "지리부도" }),
  "교과서명이 다르면 캐시를 공유하면 안 됩니다.",
);
assert.notEqual(
  legacyCourseSourceFingerprint(textbook),
  legacyCourseSourceFingerprint(anotherSchoolOffering),
  "기존 학교별 키는 연도·학년·교과 분류 차이를 반영해야 합니다.",
);

console.log("Shared course source cache fingerprint checks passed.");
