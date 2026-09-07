import { requireLearner } from "@/lib/auth";
import { getCommonsImage } from "@/lib/commons-media";

export async function GET(request: Request) {
  if (!await requireLearner()) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const file = new URL(request.url).searchParams.get("file") ?? "";
  if (!/^File:[^\r\n<>|]{1,235}$/.test(file)) return Response.json({ error: "자료 이름을 확인해 주세요." }, { status: 400 });
  try {
    const image = await getCommonsImage(file);
    return image ? Response.json({ image }, { headers: { "Cache-Control": "private, max-age=3600" } })
      : Response.json({ error: "표시할 이미지나 이용 조건을 확인하지 못했어요." }, { status: 404 });
  } catch {
    return Response.json({ error: "참고 이미지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
