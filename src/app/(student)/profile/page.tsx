import { StudentProfile } from "@/components/profile/student-profile";
import { requireLearner } from "@/lib/auth";

export const metadata = { title: "내 정보" };

export default async function ProfilePage() {
  const user = await requireLearner();
  if (!user) return null;
  return <StudentProfile user={user} />;
}
