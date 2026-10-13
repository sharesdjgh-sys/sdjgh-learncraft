import { FeedbackBoard } from "@/components/feedback/feedback-board";
import { redirect } from "next/navigation";
import { requireLearner } from "@/lib/auth";

export const metadata = { title: "피드백" };
export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ unit?: string | string[] }> }) {
  const user = await requireLearner();
  if (user?.role === "ADMIN") redirect("/admin/feedback");
  const unit = (await searchParams).unit;
  const initialUnitId = typeof unit === "string" ? unit.slice(0, 200) : undefined;
  return <FeedbackBoard initialUnitId={initialUnitId} />;
}
