"use client";

import { z } from "zod";
import { listeningPresets, escapeActivity as esc, question, sheetHeader } from "@/features/teacher-activities/content";
import { ActivityInput, ActivityLayout, ActivityReady, ActivitySheet, useActivityDraft } from "./activity-shared";
import { Card, Toggle } from "./tool-panel";
import { Button } from "@/components/ui/button";

const schema = z.object({ title: z.string().max(100), works: z.string().max(300), goal: z.string().max(300), prompts: z.array(z.string().max(300)).length(4), reflection: z.boolean() });
const initial = { title: "음악을 듣고 근거로 이야기하기", works: "", goal: "음악의 특징을 듣고, 구체적인 장면을 근거로 나의 생각을 설명할 수 있다.", prompts: listeningPresets.elements, reflection: true };
export function MusicListeningLab({ tabs }: { tabs: React.ReactNode }) { return <ActivityReady><Editor tabs={tabs} /></ActivityReady>; }
function Editor({ tabs }: { tabs: React.ReactNode }) {
  const [draft, setDraft, error] = useActivityDraft("learncraft_music_listening_v1", schema, initial);
  const html = sheetHeader(draft.title || "음악 감상 활동지") + `<p><b>감상·연주곡</b> ${esc(draft.works || "________________________")}</p><p><b>학습 목표</b> ${esc(draft.goal)}</p>` + draft.prompts.filter(p => p.trim()).map((p, i) => question(`${i + 1}. ${p}`)).join("") + (draft.reflection ? question("스스로 점검하기", "<p>각 항목에 표시하세요: 잘함 / 보통 / 더 연습</p><p>□ 음악적 특징을 구체적으로 설명했다.<br>□ 들은 장면을 근거로 생각을 표현했다.<br>□ 친구의 의견을 듣고 나의 생각을 돌아보았다.</p><p>다음 시간에 더 알아보고 싶은 것:</p>", 1) : "");
  return <ActivityLayout subject="음악" title="감상·연주 활동지" description="느낌 쓰기에서 한 걸음 더 나아가, 들은 장면을 근거로 설명하는 활동을 설계하세요. 음원은 수업에서 별도로 재생합니다." tabs={tabs} error={error}>
    <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]"><div className="space-y-4"><Card title="활동 설정"><div className="space-y-3"><ActivityInput label="활동지 제목" value={draft.title} maxLength={100} onChange={title => setDraft({ ...draft, title })} /><ActivityInput label="곡명 · 작곡가 · 연주자 (비교 감상은 두 곡)" value={draft.works} onChange={works => setDraft({ ...draft, works })} /><ActivityInput label="학습 목표" value={draft.goal} multiline onChange={goal => setDraft({ ...draft, goal })} /><Toggle label="자기 점검 포함" checked={draft.reflection} onChange={reflection => setDraft({ ...draft, reflection })} /></div></Card><Card title="질문 편집" help="예시 버튼은 아래 네 질문을 교체합니다. 곡과 학급 수준에 맞게 고쳐 쓰세요."><div className="mb-4 flex flex-wrap gap-2">{([['elements', '요소 탐색'], ['compare', '비교 감상'], ['performance', '연주 성찰']] as const).map(([key, label]) => <Button key={key} variant="secondary" size="sm" onClick={() => setDraft({ ...draft, prompts: [...listeningPresets[key]] })}>{label}</Button>)}</div><div className="space-y-3">{draft.prompts.map((p, i) => <ActivityInput key={i} label={`질문 ${i + 1} · 비우면 제외`} value={p} multiline onChange={value => setDraft({ ...draft, prompts: draft.prompts.map((old, j) => i === j ? value : old) })} />)}</div></Card></div><ActivitySheet id="music-listening-print" html={html} disabled={!draft.prompts.some(p => p.trim())} /></div>
  </ActivityLayout>;
}
