import { redirect } from "next/navigation";

// 수학 도형 도구는 교사 지원실에서만 제공합니다. 관리자도 교사 지원실에 들어갈 수 있어 예전 주소는 그쪽으로 보냅니다.
export default function AdminMathFiguresPage() {
  redirect("/teacher/math-figures");
}
