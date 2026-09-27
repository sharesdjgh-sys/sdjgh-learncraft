import { KoreanGrammarLab } from "@/components/teacher/korean-grammar-lab";
import { KoreanLiteratureLab } from "@/components/teacher/korean-literature-lab";
import { KoreanReadingLab } from "@/components/teacher/korean-reading-lab";
import { KoreanSpeechLab } from "@/components/teacher/korean-speech-lab";
import { koreanToolKeys, KoreanToolTabs, type KoreanTool } from "@/components/teacher/korean-tool-tabs";
import { KoreanVocabularyLab } from "@/components/teacher/korean-vocabulary-lab";

export const metadata = { title: "국어 어휘 카드·교과 도구" };

// 국어는 교사 지원실 메뉴 하나에 어휘 카드와 문법·문학·화법·작문·독서 도구를 하위 탭으로 둡니다. 학년 구분 없이 영역별로 모았습니다.
export default async function TeacherKoreanPage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current: KoreanTool = koreanToolKeys.find(key => key === tool) ?? "vocabulary";
  const tabs = <KoreanToolTabs current={current} />;
  return current === "grammar" ? <KoreanGrammarLab tabs={tabs} />
    : current === "literature" ? <KoreanLiteratureLab tabs={tabs} />
      : current === "speech" ? <KoreanSpeechLab tabs={tabs} />
        : current === "reading" ? <KoreanReadingLab tabs={tabs} />
          : <KoreanVocabularyLab tabs={tabs} />;
}
