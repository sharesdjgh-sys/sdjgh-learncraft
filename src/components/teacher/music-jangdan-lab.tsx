"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  defaultJangdan, jangdanHits, jangdanHtml, jangdanPresets, jangdanSchema, jangdanStepSeconds, jangdanSteps, MAX_BEATS, mnemonicLine, padCells, presetDraft, strokeKeys, strokes,
  type JangdanDraft, type Stroke,
} from "@/features/teacher-activities/janggu";
import { ActivityInput, ActivityLayout, ActivityReady, ActivitySheet, useActivityDraft } from "./activity-shared";
import { Card, Range, Segmented, Toggle } from "./tool-panel";

const strokeTone: Record<Stroke, string> = {
  rest: "border-line bg-surface text-ink-4",
  dung: "border-[#a13e85]/40 bg-[#f9e7f4] text-[#7d2d66]",
  kung: "border-[#2f6db5]/35 bg-[#e6f0fb] text-[#23548c]",
  deok: "border-[#b8641c]/35 bg-[#fff1e3] text-[#8a4a12]",
  gideok: "border-[#b8641c]/35 bg-[#fff1e3] text-[#8a4a12]",
  roll: "border-[#6b8a1f]/35 bg-[#f0f6df] text-[#4d6516]",
};
const sameCells = (a: Stroke[], b: Stroke[]) => a.every((stroke, i) => stroke === b[i]);

export function MusicJangdanLab({ tabs }: { tabs: React.ReactNode }) { return <ActivityReady><Editor tabs={tabs} /></ActivityReady>; }
function Editor({ tabs }: { tabs: React.ReactNode }) {
  const [draft, setDraft, error] = useActivityDraft("learncraft_music_jangdan_v1", jangdanSchema, defaultJangdan);
  const [confirm, confirmDialog] = useConfirm();
  const [brush, setBrush] = useState<Stroke>("dung");
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [cycle, setCycle] = useState(0);
  const [audioError, setAudioError] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);
  const latest = useRef(draft);
  useEffect(() => { latest.current = draft; }, [draft]);
  const steps = jangdanSteps(draft);
  const preset = jangdanPresets.find(item => item.key === draft.preset);
  const edited = preset ? !sameCells(draft.cells, padCells(preset.cells)) || draft.beats !== preset.beats || draft.sub !== preset.sub : draft.cells.slice(0, steps).some(stroke => stroke !== "rest");

  function cleanup() {
    generation.current++;
    if (timer.current !== null) clearInterval(timer.current);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    timer.current = null; frame.current = null;
    const context = audio.current;
    audio.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }
  function stop() { cleanup(); setPlaying(false); setStep(-1); setCycle(0); }
  useEffect(() => {
    const onHidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onHidden);
    return () => { cleanup(); document.removeEventListener("visibilitychange", onHidden); };
    // 재생 자원은 모두 ref에 있고, 다른 도구로 옮겨 갈 때도 정리해야 합니다.
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
      const noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.12), context.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      // 북편: 음높이가 떨어지는 낮은 울림, 채편: 짧고 높은 타격음입니다. 실제 장구 소리가 아닌 구분용 합성음입니다.
      function kung(at: number) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(150, at); oscillator.frequency.exponentialRampToValueAtTime(70, at + 0.25);
        gain.gain.setValueAtTime(0.7, at); gain.gain.exponentialRampToValueAtTime(0.001, at + 0.45);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(at); oscillator.stop(at + 0.5);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }
      function deok(at: number, soft = false) {
        const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
        source.buffer = noise; filter.type = "bandpass"; filter.frequency.value = 2600; filter.Q.value = 0.9;
        gain.gain.setValueAtTime(soft ? 0.25 : 0.6, at); gain.gain.exponentialRampToValueAtTime(0.001, at + 0.07);
        source.connect(filter); filter.connect(gain); gain.connect(context.destination);
        source.start(at); source.stop(at + 0.1);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      }
      // 재생 중에 칸·빠르기·장단을 바꿔도 곧바로 들리도록, 예약할 때마다 최신 장단(latest)을 다시 읽습니다.
      // 이미 예약한 시각(until) 이후의 소리만 새로 예약하므로 같은 소리를 두 번 내지 않습니다.
      const start = context.currentTime + 0.12;
      const cycles = [{ start, count: 1 }];
      let until = start;
      function schedule() {
        const current = latest.current, horizon = context.currentTime + 0.2;
        const length = jangdanSteps(current) * jangdanStepSeconds(current), hits = jangdanHits(current);
        for (;;) {
          const cycleStart = cycles.at(-1)!.start;
          for (const hit of hits) {
            const at = cycleStart + hit.at;
            if (at >= until && at < horizon) { if (hit.part === "kung") kung(at); else deok(at, hit.soft); }
          }
          if (cycleStart + length >= horizon) break;
          cycles.push({ start: cycleStart + length, count: cycles.at(-1)!.count + 1 });
          if (cycles.length > 4) cycles.shift();
        }
        until = horizon;
      }
      function draw() {
        if (token !== generation.current) return;
        const now = context.currentTime, current = latest.current;
        const at = [...cycles].reverse().find(item => item.start <= now);
        if (at) { setStep(Math.min(jangdanSteps(current) - 1, Math.floor((now - at.start) / jangdanStepSeconds(current)))); setCycle(at.count); }
        frame.current = requestAnimationFrame(draw);
      }
      schedule(); timer.current = setInterval(schedule, 25); frame.current = requestAnimationFrame(draw);
    } catch { if (token === generation.current) { stop(); setAudioError("소리를 재생하지 못했어요. 브라우저의 오디오 사용을 확인한 뒤 다시 눌러 주세요."); } }
  }

  async function choose(next: JangdanDraft, label: string) {
    if (edited && !await confirm({ eyebrow: "장단 바꾸기", title: `${label}(으)로 바꿀까요?`, description: `지금 고친 ${steps}칸의 장단을 ${label} 기본형으로 덮어씁니다.`, note: "활동지 제목은 그대로 남습니다.", confirmLabel: "바꾸기", tone: "danger" })) return;
    setDraft({ ...next, title: draft.title, song: next.preset === "custom" ? draft.song : next.song });
  }
  const paint = (index: number) => setDraft({ ...draft, cells: draft.cells.map((stroke, i) => i === index ? stroke === brush ? "rest" : brush : stroke) });
  // 기본형과 달라진 설정입니다. 활동지 제목과 빈칸 포함 여부는 수업마다 정하는 것이라 비교하지 않습니다.
  const base = preset ? presetDraft(preset) : null;
  const changes = base ? [
    (!sameCells(draft.cells, base.cells) || draft.beats !== base.beats || draft.sub !== base.sub) && "장단 칸",
    draft.bpm !== base.bpm && "빠르기",
    draft.name !== base.name && "장단 이름",
    draft.song !== base.song && "함께 부를 노래",
  ].filter((item): item is string => Boolean(item)) : edited ? ["장단 칸"] : [];
  async function reset() {
    const label = preset ? `${preset.name} 기본형` : "빈 장단";
    if (!await confirm({ eyebrow: "기본값으로 되돌리기", title: `${label}으로 되돌릴까요?`, description: `바뀐 설정 ${changes.length}가지(${changes.join("·")})를 ${label}으로 되돌립니다.`, note: preset ? "활동지 제목과 ‘변형 장단 빈칸 포함’ 설정은 그대로 남습니다." : "박 수·나누는 수·빠르기·이름은 그대로 두고 칸만 비웁니다.", confirmLabel: "되돌리기", tone: "danger" })) return;
    setDraft(base ? { ...base, title: draft.title, blank: draft.blank } : { ...draft, cells: padCells([]) });
  }
  const custom = { ...draft, preset: "custom", name: draft.preset === "custom" ? draft.name : "나만의 장단", cells: padCells([]) };

  return <ActivityLayout subject="음악" title="국악 장단" description="장구 구음과 함께 장단을 익히고, 무릎 장단으로 치거나 노래에 맞춰 반주하세요. 칸을 눌러 변형 장단을 만들 수 있습니다. 재생음은 북편·채편을 구분하는 합성음입니다." tabs={tabs} error={error}>
    {confirmDialog}
    <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card title="장단 고르기" help="장단은 지역·가락에 따라 변형이 많습니다. 교과서의 표기와 다르면 칸을 눌러 맞춰 쓰세요."
          action={<Button variant="ghost" size="sm" disabled={!changes.length} onClick={() => void reset()} title={changes.length ? `바뀐 설정: ${changes.join(", ")}` : "기본값과 같아요"}><RotateCcw size={14} /> 기본값으로</Button>}>
          {changes.length > 0 && <p role="status" className="mb-2 text-[.76rem] text-ink-3">기본형에서 바뀜: <b className="text-brand-dark">{changes.join(" · ")}</b></p>}
          <div className="grid gap-2">
            {jangdanPresets.map(item => <button key={item.key} type="button" aria-pressed={draft.preset === item.key} onClick={() => void choose(presetDraft(item), item.name)}
              className={cn("rounded-xl border p-3 text-left transition-colors disabled:opacity-60", draft.preset === item.key ? "border-brand/40 bg-brand-page" : "border-line bg-surface hover:border-brand/30")}>
              <span className="block text-sm font-extrabold text-ink">{item.name}</span>
              <span className="block text-[.76rem] text-ink-3">{item.meter} · {item.feel}</span>
              <span className="block text-[.74rem] text-ink-4">예: {item.songs}</span>
            </button>)}
            <button type="button" aria-pressed={draft.preset === "custom"} onClick={() => void choose(custom, "빈 장단")}
              className={cn("rounded-xl border border-dashed p-3 text-left text-sm font-bold disabled:opacity-60", draft.preset === "custom" ? "border-brand/40 bg-brand-page text-brand-dark" : "border-line text-ink-3 hover:border-brand/30")}>+ 빈 장단에서 직접 만들기</button>
          </div>
        </Card>
        <Card title="장단 설정">
          <fieldset className="space-y-3">
            <ActivityInput label="활동지 제목" value={draft.title} maxLength={100} onChange={title => setDraft({ ...draft, title })} />
            <ActivityInput label="장단 이름" value={draft.name} maxLength={30} onChange={name => setDraft({ ...draft, name })} />
            <ActivityInput label="함께 부를 노래" value={draft.song} maxLength={100} onChange={song => setDraft({ ...draft, song })} />
            {draft.preset === "custom" && <>
              <div className="space-y-2"><p className="text-xs font-semibold text-ink-3">박 수</p><Segmented label="박 수" value={draft.beats} options={Array.from({ length: MAX_BEATS - 1 }, (_, i) => ({ value: i + 2, label: `${i + 2}박` }))} onChange={beats => setDraft({ ...draft, beats })} /></div>
              <div className="space-y-2"><p className="text-xs font-semibold text-ink-3">한 박을 나누는 수</p><Segmented label="한 박을 나누는 수" value={draft.sub} options={[{ value: 3, label: "셋 (3소박)" }, { value: 2, label: "둘 (2소박)" }]} onChange={sub => setDraft({ ...draft, sub: sub as 2 | 3 })} /></div>
            </>}
            <Range label="빠르기 · 한 박" value={draft.bpm} min={30} max={160} suffix=" BPM" onChange={bpm => setDraft({ ...draft, bpm })} />
            <Toggle label="변형 장단 만들기 빈칸 포함" checked={draft.blank} onChange={blank => setDraft({ ...draft, blank })} />
          </fieldset>
        </Card>
        <Card title="장구 구음과 연주법">
          <ul className="space-y-2 text-[.8rem] leading-5">{strokeKeys.filter(key => key !== "rest").map(key => <li key={key} className="flex gap-2">
            <span className={cn("grid h-7 min-w-14 shrink-0 place-items-center rounded-lg border px-1 text-xs font-extrabold", strokeTone[key])}>{strokes[key].name}</span>
            <span className="text-ink-3"><b className="text-ink-2">{strokes[key].hands}</b> · {strokes[key].play}</span>
          </li>)}</ul>
          <p className="mt-3 text-[.74rem] leading-5 text-ink-4">장구가 없으면 무릎 장단으로 칩니다. 덩은 두 손, 쿵은 왼손, 덕은 오른손으로 무릎을 칩니다.</p>
        </Card>
      </div>
      <div className="min-w-0 space-y-4">
        <Card title={draft.name || "장단"} action={<span className="text-xs font-bold text-ink-4">{draft.beats}박 · 한 박 {draft.sub}칸</span>}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => playing ? stop() : void play()}>{playing ? <Square size={16} /> : <Play size={16} />}{playing ? "정지" : "장단 치기"}</Button>
            <span role="status" className="text-sm font-bold text-brand-dark">{playing ? cycle > 0 ? `${cycle}번째 장단` : "곧 시작합니다" : "정지를 누를 때까지 장단을 되풀이합니다."}</span>
          </div>
          {audioError && <p role="alert" className="mb-3 text-sm text-danger">{audioError}</p>}
          <fieldset className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-3">칠 소리</span>
              {strokeKeys.map(key => <button key={key} type="button" aria-pressed={brush === key} onClick={() => setBrush(key)}
                className={cn("flex min-h-9 items-center gap-1 rounded-lg border px-3 text-sm font-bold", strokeTone[key], brush === key ? "ring-2 ring-brand/40" : "opacity-80")}>{key === "rest" && <Eraser size={14} />}{strokes[key].name}</button>)}
            </div>
            <div className="overflow-x-auto pb-1">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: draft.beats }, (_, beat) => <div key={beat} className="rounded-2xl border-2 border-ink/15 p-1.5">
                  <p className="mb-1 text-center text-xs font-bold text-ink-4">{beat + 1}박</p>
                  <div className="flex gap-1">{Array.from({ length: draft.sub }, (_, part) => {
                    const index = beat * draft.sub + part, stroke = draft.cells[index];
                    return <button key={part} type="button" onClick={() => paint(index)} aria-label={`${beat + 1}박 ${part + 1}번째 칸: ${strokes[stroke].name}`}
                      className={cn("grid h-16 w-16 place-items-center rounded-xl border text-sm font-extrabold transition-transform sm:h-20 sm:w-20 sm:text-base", strokeTone[stroke], step === index && "scale-105 ring-4 ring-brand/50")}>{strokes[stroke].mnemonic || "·"}</button>;
                  })}</div>
                </div>)}
              </div>
            </div>
          </fieldset>
          <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm font-bold tracking-wide text-ink-2">구음: {mnemonicLine(draft)}</p>
          <p className="mt-2 text-xs text-ink-4">고르려는 소리를 누른 뒤 칸을 누르세요. 같은 소리가 있는 칸을 다시 누르면 비웁니다. 장단을 치는 동안 고쳐도 바로 소리에 반영됩니다.</p>
        </Card>
        <ActivitySheet id="music-jangdan-print" html={jangdanHtml(draft)} disabled={!draft.cells.slice(0, steps).some(stroke => stroke !== "rest")} />
      </div>
    </div>
  </ActivityLayout>;
}
