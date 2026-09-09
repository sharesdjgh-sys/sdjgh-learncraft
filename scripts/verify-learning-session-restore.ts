import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual storage effects with browser/state doubles, including write ordering.
const source = readFileSync("src/components/tutor/learning-workspace.tsx", "utf8");
const ast = ts.createSourceFile("workspace.tsx", source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const effects: string[] = [];
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect") effects.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const restore = effects.find((effect) => effect.includes("sessionStorage.getItem(learningCacheKey)"))!;
const save = effects.find((effect) => effect.includes("sessionStorage.setItem(learningCacheKey"))!;
assert(restore && save);
const helpers = source.slice(source.indexOf('const learningCacheKey ='), source.indexOf('type LearningWorkspaceProps ='));
const compile = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function harness(initial: unknown, quota = Infinity) {
  let raw = initial === null ? null : JSON.stringify(initial);
  const state: Record<string, unknown> = {
    units: [{ id: "unit-2", grade: 2, subjectCode: "SCIENCE" }],
    grade: 1, selectedUnitId: "initial", homeOpen: true, conversationOpen: false,
    courseOverviewOpen: false, vocabularyOpen: false, learningLevel: "FOUNDATION", messages: [], sessionReady: false,
    unitSessionsRef: { current: new Map() },
    isSupportedGrade: (grade: unknown) => grade === 1 || grade === 2 || grade === 3,
    supportedGrade: (grade: number) => grade,
    useEffect: (effect: () => void) => effect(),
    window: { setTimeout: (fn: () => void) => { fn(); return 1; }, clearTimeout: () => {} },
    sessionStorage: {
      getItem: () => raw,
      setItem: (_key: string, value: string) => { if (value.length > quota) throw new Error("quota"); raw = value; },
      removeItem: () => { raw = null; },
    },
  };
  for (const name of ["Grade", "Subject", "SelectedUnitId", "HomeOpen", "CourseOverviewOpen", "VocabularyOpen", "LearningLevel", "Messages", "ConversationOpen", "SessionReady"]) {
    state[`set${name}`] = (value: unknown) => { state[name[0].toLowerCase() + name.slice(1)] = value; };
  }
  const context = vm.createContext(state);
  vm.runInContext(compile(helpers), context);
  return { state, run: (effect: string) => vm.runInContext(compile(effect), context), stored: () => raw ? JSON.parse(raw) : null };
}
const messages = [{ id: "answer", role: "assistant", content: "답변", completed: true }];
const base = { version: 2, activeUnitId: "unit-2", courseOverviewOpen: false, sessions: { "unit-2": { learningLevel: "ADVANCED", messages } } };
for (const [name, flags, expectedHome, expectedOverview, expectedConversation] of [
  ["legacy v2 chat", {}, false, false, true],
  ["unit introduction", { conversationOpen: false }, false, false, false],
  ["course overview", { courseOverviewOpen: true, conversationOpen: true }, false, true, false],
  ["home", { homeOpen: true, conversationOpen: true }, true, false, false],
] as const) {
  const test = harness({ ...base, ...flags });
  test.run(save);
  assert.equal(test.stored().activeUnitId, "unit-2", "Do not overwrite before restoration");
  test.run(restore);
  assert.equal(test.state.selectedUnitId, "unit-2", name);
  assert.equal(test.state.grade, 2); assert.equal(test.state.subject, "SCIENCE");
  assert.equal(test.state.homeOpen, expectedHome); assert.equal(test.state.courseOverviewOpen, expectedOverview);
  assert.equal(test.state.conversationOpen, expectedConversation); assert.equal(test.state.learningLevel, "ADVANCED");
  test.run(save);
  const reloaded = harness(test.stored()); reloaded.run(restore);
  assert.equal(reloaded.state.selectedUnitId, "unit-2");
  assert.equal(reloaded.state.homeOpen, expectedHome);
  assert.equal(reloaded.state.conversationOpen, expectedConversation);
}
const legacy = harness({ unitId: "unit-2", learningLevel: "STANDARD", messages }); legacy.run(restore);
const vocabulary = harness({ ...base, vocabularyOpen: true, conversationOpen: true });
vocabulary.run(restore); vocabulary.run(save);
const vocabularyReloaded = harness(vocabulary.stored()); vocabularyReloaded.run(restore);
assert.equal(vocabularyReloaded.state.vocabularyOpen, true, "Keep the vocabulary panel open after refresh");
for (const flags of [{ homeOpen: true }, { courseOverviewOpen: true }]) {
  const otherPanel = harness({ ...base, vocabularyOpen: true, ...flags }); otherPanel.run(restore);
  assert.equal(otherPanel.state.vocabularyOpen, false, "Hide vocabulary on home or course overview");
}
assert.equal(legacy.state.selectedUnitId, "unit-2"); assert.equal(legacy.state.conversationOpen, true);
const stale = harness({ ...base, activeUnitId: "deleted-unit" }); stale.run(restore);
assert.equal(stale.state.homeOpen, true); assert.equal(stale.state.sessionReady, true);
const oversized = harness({ ...base, sessions: { "unit-2": { learningLevel: "ADVANCED", messages: [{ ...messages[0], content: "x".repeat(2000) }] } } }, 700);
oversized.run(restore); oversized.run(save);
assert.equal(oversized.stored().activeUnitId, "unit-2"); assert.equal(oversized.stored().conversationOpen, false);
assert.equal(oversized.stored().sessions["unit-2"].messages.length, 0);
const next = harness(oversized.stored()); next.run(restore);
assert.equal(next.state.homeOpen, false); assert.equal(next.state.selectedUnitId, "unit-2");
const disabled = harness(null, 0); disabled.run(restore); disabled.run(save);
assert.equal(disabled.state.sessionReady, true);
console.log("PASS: actual learning cache effects restore course/unit/chat/home, preserve legacy caches, ignore removed units, and retain position on quota failure.");
