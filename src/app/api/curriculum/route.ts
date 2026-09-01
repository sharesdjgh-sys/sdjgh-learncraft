import { NextResponse } from "next/server";
import { getSchoolLearningUnits } from "@/data/school-curriculum";
import { getSession } from "@/lib/auth";
import type { SubjectCode } from "@/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const grade = Number(params.get("grade")) || undefined;
  const subject = params.get("subject") as SubjectCode | null;
  const course = params.get("course") || undefined;
  const schoolUnits = await getSchoolLearningUnits(session.schoolId);
  const filteredUnits = schoolUnits.filter((unit) => (
    (!grade || unit.recommendedGrades.includes(grade as 1 | 2 | 3))
    && (!subject || unit.subjectCode === subject)
    && (!course || unit.courseCode === course)
  ));
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
  return NextResponse.json({
    courses: courseOptions,
    units: filteredUnits,
  });
}
