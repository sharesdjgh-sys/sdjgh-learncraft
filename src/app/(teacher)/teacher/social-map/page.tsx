import { redirect } from "next/navigation";

// 사회 도구는 /teacher/social 아래 하위 탭(지도 제작, 역사, 지리, 정치·법, 경제, 윤리)으로 옮겼습니다. 예전 주소는 지도 제작 탭으로 보냅니다.
export default function TeacherSocialMapPage() {
  redirect("/teacher/social?tool=map");
}
