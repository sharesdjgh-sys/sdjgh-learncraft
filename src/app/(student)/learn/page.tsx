import { LearningWorkspace } from "@/components/tutor/learning-workspace";
import { learningUnits } from "@/data/curriculum";
import { requireStudent } from "@/lib/auth";

export const metadata = { title: "AI 학습" };

export default async function LearnPage() {
  const user = await requireStudent();
  return (
    <LearningWorkspace
      units={learningUnits}
      initialGrade={user?.learningGrade ?? user?.officialGrade ?? 1}
      studentName={user?.name ?? "학생"}
      schoolName={user?.schoolName ?? "서대전여자고등학교"}
    />
  );
}
