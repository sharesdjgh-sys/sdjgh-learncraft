import { EnglishQuestionsLab } from "@/components/teacher/english-questions-lab";
import { EnglishToolTabs } from "@/components/teacher/english-tool-tabs";
import { EnglishVocabularyLab } from "@/components/teacher/english-vocabulary-lab";

export const metadata = { title: "영어 독해" };

export default async function TeacherEnglishPage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current = tool === "vocabulary" ? "vocabulary" : "questions";
  const tabs = <EnglishToolTabs current={current} />;
  return current === "vocabulary" ? <EnglishVocabularyLab tabs={tabs} /> : <EnglishQuestionsLab tabs={tabs} />;
}
