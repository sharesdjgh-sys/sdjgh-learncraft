import { requireLearner } from "@/lib/auth";
import { getSchoolLearningUnit, getSchoolLearningUnits } from "@/data/school-curriculum";
import { reflectionSchema } from "@/features/learning-progress/model";
import { deleteReflection, getLearningProgress, learningToday, saveReflection } from "@/features/learning-progress/repository";
import { periodDates } from "@/features/usage/insights";
import { z } from "zod";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET(request: Request) {
  const user = await requireLearner();
  if (!user) return json({ error: "로그인이 필요해요." }, 401);
  const query = new URL(request.url).searchParams;
  try {
    if (query.get("options") === "units") {
      const units = await getSchoolLearningUnits(user.schoolId, { outlineOnly: true });
      return json({ units: units.map(unit => ({ id: unit.id, title: unit.title, courseTitle: unit.courseTitle })) });
    }
    const days = query.get("days") ?? "7";
    if (days !== "7" && days !== "30") return json({ error: "기간을 확인해 주세요." }, 400);
    return json(await getLearningProgress(user, days === "30" ? 30 : 7));
  } catch { return json({ error: "학습 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, 503); }
}
export async function POST(request: Request) {
  const user = await requireLearner();
  if (!user) return json({ error: "로그인이 필요해요." }, 401);
  const parsed = reflectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "단원, 날짜, 시간, 이해도와 필수 내용을 확인해 주세요." }, 400);
  if (!periodDates(learningToday(), 30).includes(parsed.data.learningDate)) return json({ error: "최근 30일 안의 학습을 기록해 주세요." }, 400);
  try {
    const unit = await getSchoolLearningUnit(user.schoolId, parsed.data.unitId);
    if (!unit) return json({ error: "사용할 수 없는 단원이에요." }, 404);
    await saveReflection(user, parsed.data, { unitTitle: unit.title, courseTitle: unit.courseTitle });
    return json({ saved: true });
  } catch { return json({ error: "기록을 저장하지 못했어요. 다시 시도해 주세요." }, 503); }
}
export async function DELETE(request: Request) {
  const user = await requireLearner();
  if (!user) return json({ error: "로그인이 필요해요." }, 401);
  const parsed = z.object({ id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "기록을 확인해 주세요." }, 400);
  try { return await deleteReflection(user, parsed.data.id) ? json({ deleted: true }) : json({ error: "기록을 찾을 수 없어요." }, 404); }
  catch { return json({ error: "삭제하지 못했어요. 다시 시도해 주세요." }, 503); }
}
