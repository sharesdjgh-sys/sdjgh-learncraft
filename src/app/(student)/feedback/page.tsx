import { FeedbackBoard } from "@/components/feedback/feedback-board";

export const metadata = { title: "피드백" };
export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ unit?: string | string[] }> }) {
  const unit = (await searchParams).unit;
  const initialUnitId = typeof unit === "string" ? unit.slice(0, 200) : undefined;
  return <FeedbackBoard initialUnitId={initialUnitId} />;
}
