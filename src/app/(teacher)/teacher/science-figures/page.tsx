import { redirect } from "next/navigation";

// 과학 도구는 /teacher/science 아래 하위 탭(실험 그림, 물리학, 화학, 생명과학, 지구과학)으로 옮겼습니다. 예전 주소는 실험 그림 탭으로 보냅니다.
export default function TeacherScienceFiguresPage() {
  redirect("/teacher/science?tool=figure");
}
