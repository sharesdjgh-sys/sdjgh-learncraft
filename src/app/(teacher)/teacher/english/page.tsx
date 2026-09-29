import { EnglishGrammarLab } from "@/components/teacher/english-grammar-lab";
import { EnglishQuestionsLab } from "@/components/teacher/english-questions-lab";
import { EnglishReadingLab } from "@/components/teacher/english-reading-lab";
import { englishToolKeys, EnglishToolTabs, type EnglishTool } from "@/components/teacher/english-tool-tabs";
import { EnglishVocabularyLab } from "@/components/teacher/english-vocabulary-lab";
import { EnglishWordsLab } from "@/components/teacher/english-words-lab";
import { EnglishWritingLab } from "@/components/teacher/english-writing-lab";

export const metadata = { title: "영어 독해·교과 도구" };

// 영어는 교사 지원실 메뉴 하나에 변형 문제·어원 카드와 단어 시험지·문법·독해 학습지·쓰기·말하기 도구를 하위 탭으로 둡니다.
export default async function TeacherEnglishPage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current: EnglishTool = englishToolKeys.find(key => key === tool) ?? "questions";
  const tabs = <EnglishToolTabs current={current} />;
  return current === "vocabulary" ? <EnglishVocabularyLab tabs={tabs} />
    : current === "words" ? <EnglishWordsLab tabs={tabs} />
      : current === "grammar" ? <EnglishGrammarLab tabs={tabs} />
        : current === "reading" ? <EnglishReadingLab tabs={tabs} />
          : current === "writing" ? <EnglishWritingLab tabs={tabs} />
            : <EnglishQuestionsLab tabs={tabs} />;
}
