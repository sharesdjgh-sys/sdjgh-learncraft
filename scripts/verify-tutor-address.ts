import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { learningUnits } from "../src/data/curriculum";
import { sampleStudentAccounts } from "../src/data/student-accounts";
import type { SessionUser, TutorAction } from "../src/types";

type Input = { unit: typeof learningUnits[number]; student: SessionUser; action: TutorAction; learningLevel: "STANDARD"; recentMessages: { role: "user"; content: string }[] };
const exported: Record<string, (input: Input) => string> = {};
const modules: Record<string, unknown> = { "server-only": {}, "./figure-prompt": { LEARNING_FIGURE_GUIDE: "figure guide" } };
vm.runInNewContext(ts.transpileModule(readFileSync("src/features/tutor/prompt.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports: exported, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
});
const student = sampleStudentAccounts[0].user;
for (const action of ["QUESTION", "EASIER", "DEEPER", "REVEAL", "QUIZ"] as const) {
  const input: Input = { unit: learningUnits[0], student, action, learningLevel: "STANDARD", recentMessages: [{ role: "user", content: "Example question" }] };
  const studentPrompt = exported.buildTutorSystemPrompt(input);
  assert.match(studentPrompt, /학생을 부를 필요가 있을 때/);
  const teacherInput = { ...input, student: { ...student, name: "김민수", role: "TEACHER" as const } };
  const teacherPrompt = exported.buildTutorSystemPrompt(teacherInput);
  assert.ok(teacherPrompt.includes("김민수 선생님"));
  assert.ok(teacherPrompt.includes("사용자에게 '학생'이라는 호칭을 붙이지 마세요"));
  assert.ok(!teacherPrompt.includes("김민수 학생"));
  assert.ok(teacherPrompt.includes("설명 수준과 학습 기능은 학생과 동일하게 유지"));
  assert.ok(exported.buildTutorUserPrompt(teacherInput).includes("선생님: Example question"));
  assert.ok(exported.buildTutorUserPrompt(input).includes("학생: Example question"));
}
console.log("Teacher and student forms of address passed for all five tutor actions.");
