import { redirect } from "next/navigation";

// 수학 도구는 /teacher/math 아래 하위 탭(도형 제작, 공통수학 1·2, 대수, 미적분Ⅰ, 확률과 통계, 기하)으로 옮겼습니다. 예전 주소는 도형 제작 탭으로 보냅니다.
export default function TeacherMathFiguresPage() {
  redirect("/teacher/math?tool=figure");
}
