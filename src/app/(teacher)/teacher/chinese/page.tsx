import { Noto_Serif_SC } from "next/font/google";
import { ChineseHanziLab } from "@/components/teacher/chinese-hanzi-lab";
import { ChinesePinyinLab } from "@/components/teacher/chinese-pinyin-lab";
import { ChineseToolTabs, type ChineseTool } from "@/components/teacher/chinese-tool-tabs";
import { CultureLab } from "@/components/teacher/culture-lab";
import { StudyTextLab } from "@/components/teacher/text-lab";
import { isOpenAiImageConfigured } from "@/lib/env";
import { isGeminiImageReady } from "@/lib/gemini-image";

// 간체자는 자형이 정확해야 해서 간체 전용 Noto Serif SC를 이 페이지에서만 불러옵니다.
const zhFont = Noto_Serif_SC({ variable: "--font-zh", weight: ["400", "600"], preload: false, display: "swap" });

export const metadata = { title: "중국어·중국문화 학습지" };

export default async function TeacherChinesePage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current: ChineseTool = tool === "text" || tool === "hanzi" || tool === "culture" ? tool : "pinyin";
  const tabs = <ChineseToolTabs current={current} />;
  return (
    <div className={zhFont.variable}>
      {current === "text" ? <StudyTextLab profileId="chinese" tabs={tabs} />
        : current === "hanzi" ? <ChineseHanziLab tabs={tabs} />
          : current === "culture" ? <CultureLab profileId="china" tabs={tabs} imageReady={{ gpt: isOpenAiImageConfigured, gemini: isGeminiImageReady() }} />
            : <ChinesePinyinLab tabs={tabs} />}
    </div>
  );
}
