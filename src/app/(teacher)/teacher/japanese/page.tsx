import { Klee_One } from "next/font/google";
import { JapaneseKanaLab } from "@/components/teacher/japanese-kana-lab";
import { JapaneseTextLab } from "@/components/teacher/japanese-text-lab";
import { JapaneseToolTabs, type JapaneseTool } from "@/components/teacher/japanese-tool-tabs";
import { JapaneseVerbLab } from "@/components/teacher/japanese-verb-lab";

// 가나는 교과서체에 가까운 글꼴로 보여 줘야 획 모양을 바로 가르칠 수 있어, 이 페이지에서만 Klee One을 불러옵니다.
const jaFont = Klee_One({ variable: "--font-ja", weight: ["400", "600"], preload: false, display: "swap" });

export const metadata = { title: "일본어 학습지" };

export default async function TeacherJapanesePage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current: JapaneseTool = tool === "text" || tool === "verb" ? tool : "kana";
  const tabs = <JapaneseToolTabs current={current} />;
  return (
    <div className={jaFont.variable}>
      {current === "text" ? <JapaneseTextLab tabs={tabs} /> : current === "verb" ? <JapaneseVerbLab tabs={tabs} /> : <JapaneseKanaLab tabs={tabs} />}
    </div>
  );
}
