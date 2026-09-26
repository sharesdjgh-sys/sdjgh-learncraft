import { HanjaLab } from "@/components/teacher/hanja-lab";
import { HanmunLab } from "@/components/teacher/hanmun-lab";
import { HanmunToolTabs } from "@/components/teacher/hanmun-tool-tabs";

export const metadata = { title: "한문 학습지" };

export default async function TeacherHanmunPage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current = tool === "hanja" ? "hanja" : "text";
  const tabs = <HanmunToolTabs current={current} />;
  return current === "hanja" ? <HanjaLab tabs={tabs} /> : <HanmunLab tabs={tabs} />;
}
