import { HanjaLab } from "@/components/teacher/hanja-lab";
import { HanmunLab } from "@/components/teacher/hanmun-lab";
import { HanmunToolTabs } from "@/components/teacher/hanmun-tool-tabs";
import { HanmunGrammarLab } from "@/components/teacher/hanmun-grammar-lab";
import { HanmunIdiomsLab, HanmunSentenceLab } from "@/components/teacher/hanmun-activities-lab";

export const metadata = { title: "한문 학습지" };

export default async function TeacherHanmunPage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current = tool === "hanja" || tool === "grammar" || tool === "idioms" || tool === "sentence" ? tool : "text";
  const tabs = <HanmunToolTabs current={current} />;
  if (current === "grammar") return <HanmunGrammarLab tabs={tabs} />;
  if (current === "idioms") return <HanmunIdiomsLab tabs={tabs} />;
  if (current === "sentence") return <HanmunSentenceLab tabs={tabs} />;
  return current === "hanja" ? <HanjaLab tabs={tabs} /> : <HanmunLab tabs={tabs} />;
}
