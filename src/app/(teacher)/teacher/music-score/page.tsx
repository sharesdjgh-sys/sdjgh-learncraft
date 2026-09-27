import { MusicScoreLab } from "@/components/teacher/music-score-lab";
import { MusicRhythmLab } from "@/components/teacher/music-rhythm-lab";
import { MusicListeningLab } from "@/components/teacher/music-listening-lab";
import { MusicJangdanLab } from "@/components/teacher/music-jangdan-lab";
import { MusicTheoryLab } from "@/components/teacher/music-theory-lab";
import { MusicToolTabs } from "@/components/teacher/music-tool-tabs";

export const metadata = { title: "음악 수업 도구" };

export default async function TeacherMusicScorePage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current = tool === "rhythm" || tool === "jangdan" || tool === "theory" || tool === "listening" ? tool : "score";
  const tabs = <MusicToolTabs current={current} />;
  if (current === "rhythm") return <MusicRhythmLab tabs={tabs} />;
  if (current === "jangdan") return <MusicJangdanLab tabs={tabs} />;
  if (current === "theory") return <MusicTheoryLab tabs={tabs} />;
  if (current === "listening") return <MusicListeningLab tabs={tabs} />;
  return <MusicScoreLab tabs={tabs} />;
}
