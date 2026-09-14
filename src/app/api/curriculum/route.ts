import { NextResponse } from "next/server";
import { getSchoolLearningUnit, getSchoolLearningUnits } from "@/data/school-curriculum";
import { getSession } from "@/lib/auth";
import { packLearningOutline } from "@/lib/learning-outline";
import type { SubjectCode } from "@/types";
import { observedJson } from "@/lib/observability";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const grade = Number(params.get("grade")) || undefined;
  const subject = params.get("subject") as SubjectCode | null;
  const course = params.get("course") || undefined;
  const unitId = params.get("unit")?.slice(0, 100);
  const outlineOnly = params.get("view") === "outline";
  const vocabularyOnly = params.get("view") === "vocabulary";
  if (unitId) {
    const unit = await getSchoolLearningUnit(session.schoolId, unitId);
    return unit
      ? observedJson({ units: [unit] }, { route: "curriculum.unit", budgetBytes: 64_000, headers: { "Cache-Control": "private, no-store" } })
      : NextResponse.json({ error: { code: "UNIT_NOT_AVAILABLE" } }, { status: 404 });
  }
  const schoolUnits = await getSchoolLearningUnits(session.schoolId, {
    outlineOnly,
    vocabularyOnly,
    courseCode: course,
  });
  const filteredUnits = schoolUnits.filter((unit) => (
    (!grade || unit.recommendedGrades.includes(grade as 1 | 2 | 3))
    && (!subject || unit.subjectCode === subject)
    && (!course || unit.courseCode === course)
  ));
  if (outlineOnly) {
    return observedJson({ outline: packLearningOutline(filteredUnits) }, {
      route: "curriculum.outline", budgetBytes: 256_000, headers: { "Cache-Control": "private, no-store" },
    });
  }
  if (vocabularyOnly) {
    return observedJson({ units: filteredUnits }, { route: "curriculum.vocabulary", budgetBytes: 256_000, headers: { "Cache-Control": "private, no-store" } });
  }
  const seenCourses = new Set<string>();
  const courseOptions = schoolUnits
    .filter((unit) => (
      (!grade || unit.recommendedGrades.includes(grade as 1 | 2 | 3))
      && (!subject || unit.subjectCode === subject)
    ))
    .filter((unit) => {
      if (seenCourses.has(unit.courseCode)) return false;
      seenCourses.add(unit.courseCode);
      return true;
    })
    .map((unit) => ({
      code: unit.courseCode,
      title: unit.courseTitle,
      category: unit.courseCategory,
      order: unit.courseOrder,
      publisherName: unit.publisherName,
      schoolAdopted: unit.schoolAdopted,
      schoolPublisherName: unit.schoolPublisherName,
      topicCount: schoolUnits.filter((candidate) => candidate.courseCode === unit.courseCode).length,
    }))
    .sort((left, right) => left.order - right.order);
  return observedJson({
    courses: courseOptions,
    units: filteredUnits,
  }, { route: "curriculum.course", budgetBytes: 256_000, headers: { "Cache-Control": "private, no-store" } });
}
