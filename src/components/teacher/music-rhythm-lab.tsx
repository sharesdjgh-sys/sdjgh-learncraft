"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Plus, Square, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { beatLabel, defaultRhythm, MAX_RHYTHM_TRACKS, newRhythmTrack, trackFrequencies, rhythmHtml, rhythmSchema, rhythmSteps, stepSeconds } from "@/features/teacher-activities/content";
import { ActivityInput, ActivityLayout, ActivityReady, ActivitySheet, useActivityDraft } from "./activity-shared";
import { Card, Range, Segmented } from "./tool-panel";

export function MusicRhythmLab({ tabs }: { tabs: React.ReactNode }) { return <ActivityReady><Editor tabs={tabs} /></ActivityReady>; }
function Editor({ tabs }: { tabs: React.ReactNode }) {
  const [draft, setDraft, error] = useActivityDraft("learncraft_music_rhythm_v1", rhythmSchema, defaultRhythm);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [bar, setBar] = useState(-1);
  const [audioError, setAudioError] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);
  const [confirm, confirmDialog] = useConfirm();
  const steps = rhythmSteps(draft);
  async function removeTrack(row: number) {
    const track = draft.tracks[row];
    const beats = track.cells.slice(0, steps).filter(Boolean).length;
    if (beats && !await confirm({ eyebrow: "파트 삭제", title: `‘${track.name || `${row + 1}번 파트`}’ 파트를 지울까요?`, description: `이 파트에 입력한 리듬 ${beats}칸이 함께 지워집니다.`, note: "다른 파트의 리듬은 그대로 남습니다.", confirmLabel: "파트 지우기", tone: "danger" })) return;
    setDraft({ ...draft, tracks: draft.tracks.filter((_, i) => i !== row) });
  }
  function cleanup() {
    generation.current++;
    if (timer.current !== null) clearInterval(timer.current);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    timer.current = null; frame.current = null;
    const context = audio.current;
    audio.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }
  function stop() { cleanup(); setPlaying(false); setStep(-1); setBar(-1); }
  useEffect(() => {
    const onHidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onHidden);
    return () => { cleanup(); document.removeEventListener("visibilitychange", onHidden); };
    // All playback resources live in refs; cleanup must also run when switching tools.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function play() {
    stop(); setAudioError("");
    const token = generation.current;
    try {
      const context = new AudioContext(); audio.current = context;
      setPlaying(true);
      await context.resume();
      if (token !== generation.current) return;
      const duration = stepSeconds(draft);
      const start = context.currentTime + 0.12;
      const total = steps * 5; // One count-in bar, then four practice bars.
      let next = 0;
      function tone(at: number, frequency: number, volume: number) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = "sine"; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(0.001, at + 0.07);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(at); oscillator.stop(at + 0.08);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }
      function schedule() {
        while (next < total && start + next * duration < context.currentTime + 0.15) {
          const at = start + next * duration, index = next % steps;
          if (index % draft.subdivision === 0) tone(at, index === 0 ? 1400 : 1000, 0.07);
          if (next >= steps) draft.tracks.forEach((track, i) => { if (track.enabled && track.cells[index]) tone(at, trackFrequencies[i % trackFrequencies.length], 0.15); });
          next++;
        }
      }
      function draw() {
        if (token !== generation.current) return;
        const current = Math.floor((context.currentTime - start) / duration);
        if (current >= total) { stop(); return; }
        if (current >= 0) { setStep(current % steps); setBar(Math.floor(current / steps)); }
        frame.current = requestAnimationFrame(draw);
      }
      schedule(); timer.current = setInterval(schedule, 25); frame.current = requestAnimationFrame(draw);
    } catch { if (token === generation.current) { stop(); setAudioError("소리를 재생하지 못했어요. 브라우저의 오디오 사용을 확인한 뒤 다시 눌러 주세요."); } }
  }
  return <ActivityLayout subject="음악" title="박자·리듬 합주" description="한 마디 리듬을 여러 파트(최대 8개)로 만들고 몸 타악기로 합주하세요. 한 마디 예비박 뒤 네 번 반복합니다. 재생음은 파트 구분용 전자음입니다." tabs={tabs} error={error}>
    {confirmDialog}
    <Card title="합주 설정"><fieldset disabled={playing} className="grid gap-5 md:grid-cols-4"><ActivityInput label="활동지 제목" value={draft.title} maxLength={100} onChange={title => setDraft({ ...draft, title })} /><div className="space-y-2"><p className="text-xs font-semibold text-ink-3">박자</p><Segmented label="박자" value={draft.beats} options={[2, 3, 4].map(value => ({ value, label: `${value}/4` }))} onChange={beats => setDraft({ ...draft, beats })} /></div><div className="space-y-2"><p className="text-xs font-semibold text-ink-3">한 칸의 길이</p><Segmented label="리듬 단위" value={draft.subdivision} options={[{ value: 1, label: "한 박" }, { value: 2, label: "반 박" }]} onChange={subdivision => setDraft({ ...draft, subdivision: subdivision as 1 | 2 })} /></div><Range label="빠르기 · ♩" value={draft.bpm} min={40} max={200} suffix=" BPM" onChange={bpm => setDraft({ ...draft, bpm })} /></fieldset></Card>
    <Card title="파트별 리듬" help="●는 소리 내기, —는 쉬기입니다. 박자나 단위를 줄이면 뒤쪽 칸은 숨겨지며 다시 늘리면 복원됩니다."><div className="mb-4 flex flex-wrap items-center gap-3"><Button onClick={() => playing ? stop() : void play()}>{playing ? <Square size={16} /> : <Play size={16} />}{playing ? "정지" : "예비박 후 합주"}</Button><span role="status" className="text-sm font-bold text-brand-dark">{playing ? bar <= 0 ? "예비박" : `${bar} / 4번째 마디` : "메트로놈과 함께 일정한 박을 느껴 보세요."}</span></div>{audioError && <p role="alert" className="mb-3 text-sm text-danger">{audioError}</p>}<fieldset disabled={playing} className="min-w-0 overflow-x-auto"><table className="w-full min-w-[540px] border-separate border-spacing-2"><thead><tr><th className="w-40 text-left text-xs text-ink-3">파트 · 재생/인쇄 포함</th><th className="w-11"><span className="sr-only">삭제</span></th>{Array.from({ length: steps }, (_, i) => <th key={i} className={cn("rounded-lg py-2 text-sm", step === i ? "bg-brand text-white" : "bg-surface-2 text-ink-3")}>{beatLabel(i, draft.subdivision)}</th>)}</tr></thead><tbody>{draft.tracks.map((track, row) => <tr key={row}><th><div className="flex items-center gap-2"><input type="checkbox" aria-label={`${row + 1}번 파트 포함`} checked={track.enabled} onChange={e => setDraft({ ...draft, tracks: draft.tracks.map((t, i) => i === row ? { ...t, enabled: e.target.checked } : t) })} /><input aria-label={`${row + 1}번 파트 이름`} className="w-28 rounded-lg border border-line bg-surface p-2 text-sm" maxLength={30} value={track.name} onChange={e => setDraft({ ...draft, tracks: draft.tracks.map((t, i) => i === row ? { ...t, name: e.target.value } : t) })} /></div></th><td><Button variant="ghost" size="icon" aria-label={`${track.name || `${row + 1}번 파트`} 삭제`} disabled={draft.tracks.length <= 1} onClick={() => void removeTrack(row)}><Trash2 size={16} /></Button></td>{track.cells.slice(0, steps).map((on, column) => <td key={column}><button type="button" aria-label={`${track.name || `${row + 1}번 파트`}, ${Math.floor(column / draft.subdivision) + 1}박${column % draft.subdivision ? ' 뒷부분' : ''}`} aria-pressed={on} onClick={() => setDraft({ ...draft, tracks: draft.tracks.map((t, i) => i === row ? { ...t, cells: t.cells.map((c, j) => j === column ? !c : c) } : t) })} className={cn("min-h-12 w-full rounded-xl border text-xl", on ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-4", !track.enabled && "opacity-40")}>{on ? "●" : "—"}</button></td>)}</tr>)}</tbody></table><Button variant="secondary" size="sm" className="mt-2" disabled={draft.tracks.length >= MAX_RHYTHM_TRACKS} onClick={() => setDraft({ ...draft, tracks: [...draft.tracks, newRhythmTrack(draft.tracks.length)] })}><Plus size={14} /> 파트 추가 ({draft.tracks.length}/{MAX_RHYTHM_TRACKS})</Button></fieldset><p className="mt-3 text-xs text-ink-4">편집하려면 재생을 정지하세요. 파트는 1~{MAX_RHYTHM_TRACKS}개까지 둘 수 있고, 파트마다 다른 높이의 소리로 재생합니다. 모든 파트를 끄면 메트로놈만 재생합니다.</p></Card>
    <ActivitySheet id="music-rhythm-print" html={rhythmHtml(draft)} disabled={!draft.tracks.some(t => t.enabled)} />
  </ActivityLayout>;
}
