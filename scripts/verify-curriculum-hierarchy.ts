import assert from "node:assert/strict";
import {
  formatCurriculumUnitNumber,
  groupCurriculumUnits,
  hasDistinctTopicLevel,
} from "../src/lib/curriculum-hierarchy";

const threeLevel = {
  chapterOrder: 2,
  sectionOrder: 1,
  topicOrder: 3,
  sectionTitle: "근대 이전 한국사의 이해",
  title: "삼국과 가야의 성립과 발전",
};
const twoLevel = {
  chapterOrder: 3,
  sectionOrder: 2,
  topicOrder: 1,
  sectionTitle: "2. 미술 비평과 가치 판단",
  title: "미술 비평과 가치 판단",
};

assert.equal(hasDistinctTopicLevel(threeLevel), true);
assert.equal(formatCurriculumUnitNumber(threeLevel), "2.1.3");
assert.equal(hasDistinctTopicLevel(twoLevel), false);
assert.equal(formatCurriculumUnitNumber(twoLevel), "3.2");

const grouped = groupCurriculumUnits([
  { ...threeLevel, chapterTitle: "한국사 1" },
  { ...threeLevel, chapterTitle: "한국사 1", topicOrder: 1, title: "선사 문화" },
]);
assert.deepEqual(grouped[0]?.sections[0]?.units.map((unit) => unit.topicOrder), [1, 3]);

console.log("Curriculum hierarchy formatting checks passed.");
