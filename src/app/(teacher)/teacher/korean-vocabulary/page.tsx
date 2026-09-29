import { redirect } from "next/navigation";

// 국어 도구는 /teacher/korean 아래 하위 탭(어휘 카드, 문법, 문학, 화법·작문, 독서)으로 옮겼습니다. 예전 주소는 어휘 카드 탭으로 보냅니다.
export default function TeacherKoreanVocabularyPage() {
  redirect("/teacher/korean?tool=vocabulary");
}
