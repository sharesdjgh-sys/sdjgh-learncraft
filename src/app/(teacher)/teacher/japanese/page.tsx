import "@fontsource/klee-one/400.css";
import "@fontsource/klee-one/600.css";
import { CultureLab } from "@/components/teacher/culture-lab";
import { JapaneseKanaLab } from "@/components/teacher/japanese-kana-lab";
import { StudyTextLab } from "@/components/teacher/text-lab";
import { JapaneseToolTabs, type JapaneseTool } from "@/components/teacher/japanese-tool-tabs";
import { JapaneseVerbLab } from "@/components/teacher/japanese-verb-lab";
import { isOpenAiImageConfigured } from "@/lib/env";
import { isGeminiImageReady } from "@/lib/gemini-image";

// 가나 자형을 유지하는 Klee One 파일을 이 페이지에서만 앱의 정적 자산으로 불러옵니다.

export const metadata = { title: "일본어·일본문화 학습지" };

export default async function TeacherJapanesePage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current: JapaneseTool = tool === "text" || tool === "verb" || tool === "culture" ? tool : "kana";
  const tabs = <JapaneseToolTabs current={current} />;
  return (
    <div>
      {current === "text" ? <StudyTextLab profileId="japanese" tabs={tabs} /> : current === "verb" ? <JapaneseVerbLab tabs={tabs} /> : current === "culture" ? <CultureLab profileId="japan" tabs={tabs} imageReady={{ gpt: isOpenAiImageConfigured, gemini: isGeminiImageReady() }} /> : <JapaneseKanaLab tabs={tabs} />}
    </div>
  );
}
