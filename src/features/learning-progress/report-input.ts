import type { SessionUser } from "@/types";
import { summarizeProgress, type ProgressData } from "./model";

/** Whitelist learning evidence; account identifiers never belong in the model context. */
export function buildLearningReportInput(data: ProgressData, user: SessionUser) {
  const identifiers = [user.name, user.externalId, user.id, user.schoolId, user.schoolName].filter(Boolean).sort((a, b) => b.length - a.length);
  const clean = (value: string) => identifiers.reduce((text, identifier) => text.split(identifier).join("[개인정보 제외]"), value);
  const summary = summarizeProgress(data);
  const selected = summary.slice(0, 60);
  const unitIds = new Set(selected.map(unit => unit.unitId));
  return {
    days: data.days, date: data.date, timeZone: data.timeZone,
    coverage: { totalUnits: summary.length, includedUnits: selected.length, totalReflections: data.reflections.length,
      includedReflections: Math.min(20, data.reflections.length),
      note: "복습 필요/질문 수 순 상위 60개 단원, 최신 성찰 20개. 오답은 선택 기간에 저장된 문제의 현재 상태. 시간·이해도는 자기보고." },
    units: selected.map(unit => ({ unit: clean(unit.unitTitle), course: clean(unit.courseTitle), questions: unit.questions,
      minutes: unit.minutes, confidence: unit.confidence, unresolved: unit.unresolved, resolved: unit.resolved, nextStep: clean(unit.nextStep) })),
    mistakes: data.mistakes.filter(unit => unitIds.has(unit.unitId)).map(unit => ({ unit: clean(unit.unitTitle), course: clean(unit.courseTitle),
      count: unit.count, unresolved: unit.unresolved, hints: unit.hints, attempts: unit.attempts, confusions: unit.confusions.slice(0, 12).map(clean) })),
    reflections: data.reflections.slice(0, 20).map(record => ({ date: record.learningDate, unit: clean(record.unitTitle), course: clean(record.courseTitle),
      confidence: record.confidence, learned: clean(record.learned), difficulty: clean(record.difficulty), nextStep: clean(record.nextStep) })),
  };
}
