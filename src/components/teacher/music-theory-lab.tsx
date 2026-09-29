"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { LoaderCircle, Play, Shuffle, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { answerPage, escapeActivity as esc, sheetHeader } from "@/features/teacher-activities/content";
import {
  accidentalOf, buildChord, buildInterval, buildScale, chordQuestions, chordTypes, englishName, intervalBetween, intervalQuestions, intervalTypes, koreanName, majorKeys, midiOf,
  primaryChords, rootPitch, roots, scaleTypes, stepName, vexKeyOf,
  type ChordId, type IntervalId, type MajorKeyId, type Pitch, type RootId, type ScaleId, type TheoryQuestion,
} from "@/features/teacher-activities/music-theory";
import { ActivityInput, ActivityLayout, ActivityReady, ActivitySheet, useActivityDraft } from "./activity-shared";
import { Card, Segmented, Toggle } from "./tool-panel";

type Clef = "treble" | "bass";
const modes = { interval: "음정", chord: "화음", scale: "음계", primary: "주요 3화음" } as const;
type Mode = keyof typeof modes;
const ids = <T extends { id: string }>(items: readonly T[]) => items.map(item => item.id) as [T["id"], ...T["id"][]];
const schema = z.object({
  mode: z.enum(Object.keys(modes) as [Mode, ...Mode[]]),
  root: z.enum(ids(roots)), interval: z.enum(ids(intervalTypes)), chord: z.enum(ids(chordTypes)), scale: z.enum(ids(scaleTypes)), key: z.enum(ids(majorKeys)),
  sheet: z.object({
    title: z.string().max(100), kind: z.enum(["interval", "chord"]), count: z.number().int().min(3).max(24),
    intervals: z.array(z.enum(ids(intervalTypes))).max(14), chords: z.array(z.enum(ids(chordTypes))).max(5),
    accidentals: z.boolean(), harmonic: z.boolean(), clef: z.enum(["treble", "bass"]), answers: z.boolean(), seed: z.number().int().min(0).max(1000000),
  }),
});
type Draft = z.infer<typeof schema>;
const initial: Draft = {
  mode: "interval", root: "C", interval: "M3", chord: "major", scale: "major", key: "C",
  sheet: { title: "음정 이름 쓰기", kind: "interval", count: 12, intervals: ["M2", "m3", "M3", "P4", "P5", "M6", "P8"], chords: ["major", "minor"], accidentals: false, harmonic: false, clef: "treble", answers: true, seed: 1 },
};
const chipClass = (active: boolean) => cn("min-h-8 rounded-lg border px-2 py-1 text-[.78rem] font-semibold transition-colors",
  active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-3 hover:border-brand/30 hover:text-brand-dark");
const selectClass = "mt-1 w-full rounded-xl border border-line bg-surface p-2 text-sm text-ink";

/** 음표 묶음(동시에 울리는 음)들을 오선에 온음표로 그려 PNG로 돌려줍니다. 인쇄·한글 붙여 넣기에 함께 씁니다. */
async function staffImage(groups: Pitch[][], { clef, keySignature, labels = [] }: { clef: Clef; keySignature?: string; labels?: string[] }) {
  const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, CanvasContext } = await import("vexflow");
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
  const context = renderer.getContext();
  const probe = new Stave(0, 0, 200).addClef(clef);
  if (keySignature) probe.addKeySignature(keySignature);
  const modifiers = probe.getNoteStartX() - probe.getX();
  const width = Math.round(modifiers + groups.length * 70 + 24);
  const height = labels.length ? 176 : 150;
  if (context instanceof CanvasContext) {
    context.resize(width, height, 2);
    context.save(); context.setFillStyle("#ffffff"); context.fillRect(0, 0, width, height); context.restore();
  }
  const stave = new Stave(4, 24, width - 8).addClef(clef);
  if (keySignature) stave.addKeySignature(keySignature);
  stave.setContext(context).draw();
  const notes = groups.map(group => {
    const note = new StaveNote({ clef, keys: group.map(vexKeyOf), duration: "w" });
    if (!keySignature) group.forEach((pitch, i) => { if (pitch.alter) note.addModifier(new Accidental(accidentalOf(pitch)), i); });
    return note;
  });
  const voice = new Voice({ numBeats: groups.length * 4, beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables(notes);
  if (keySignature) Accidental.applyAccidentals([voice], keySignature);
  new Formatter().joinVoices([voice]).formatToStave([voice], stave);
  voice.draw(context, stave);
  if (labels.length) {
    context.save(); context.setFont("Pretendard, sans-serif", 13, "bold");
    notes.forEach((note, i) => { const text = labels[i] ?? ""; const x = (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2; context.fillText(text, x - context.measureText(text).width / 2, height - 12); });
    context.restore();
  }
  return { url: canvas.toDataURL("image/png"), width, height };
}

/* ───── 소리 ───── */
function useTone() {
  const audio = useRef<AudioContext | null>(null);
  const [error, setError] = useState("");
  useEffect(() => () => { const context = audio.current; audio.current = null; if (context && context.state !== "closed") void context.close().catch(() => {}); }, []);
  async function play(sequence: Pitch[][], gap = 0.7) {
    try {
      setError("");
      if (!audio.current || audio.current.state === "closed") audio.current = new AudioContext();
      const context = audio.current;
      await context.resume();
      const start = context.currentTime + 0.05;
      sequence.forEach((group, i) => group.forEach(pitch => {
        const at = start + i * gap, frequency = 440 * 2 ** ((midiOf(pitch) - 69) / 12);
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = "triangle"; oscillator.frequency.value = frequency;
        const volume = 0.22 / Math.sqrt(group.length);
        gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(volume, at + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, at + (i === sequence.length - 1 ? 1.6 : gap + 0.2));
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(at); oscillator.stop(at + 1.7);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }));
    } catch { setError("소리를 재생하지 못했어요. 브라우저의 오디오 사용을 확인해 주세요."); }
  }
  return { play, error };
}

/** 누른 음이 보이는 건반입니다. 음이 들어 있는 옥타브만큼 그립니다. */
function Keyboard({ notes, onPress }: { notes: Pitch[]; onPress: (midi: number) => void }) {
  const midis = notes.map(midiOf);
  const low = Math.floor(Math.min(...midis) / 12) * 12, high = Math.floor(Math.max(...midis) / 12) * 12 + 11;
  const keys = Array.from({ length: high - low + 1 }, (_, i) => low + i);
  const black = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);
  const whites = keys.filter(midi => !black(midi));
  const width = 100 / whites.length;
  return <div className="overflow-x-auto"><div className="relative h-28 min-w-[420px] select-none rounded-xl bg-[#2b2740] p-1">
    <div className="flex h-full gap-[2px]">{whites.map(midi => <button key={midi} type="button" aria-label={`건반 ${midi}`} onClick={() => onPress(midi)}
      className={cn("flex flex-1 items-end justify-center rounded-b-md pb-1 text-[.6rem] font-bold", midis.includes(midi) ? "bg-[#f3c6e6] text-[#7d2d66]" : "bg-white text-ink-4")}>{midi % 12 === 0 ? `C${midi / 12 - 1}` : ""}</button>)}</div>
    {keys.filter(black).map(midi => { const before = whites.filter(white => white < midi).length; return <button key={midi} type="button" aria-label={`건반 ${midi}`} onClick={() => onPress(midi)}
      style={{ left: `calc(${before * width}% - ${width * 0.3}% + 4px)`, width: `${width * 0.6}%` }}
      className={cn("absolute top-1 z-10 h-[58%] rounded-b-md", midis.includes(midi) ? "bg-[#c2579f]" : "bg-[#141220]")} />; })}
  </div></div>;
}

export function MusicTheoryLab({ tabs }: { tabs: React.ReactNode }) { return <ActivityReady><Editor tabs={tabs} /></ActivityReady>; }
function Editor({ tabs }: { tabs: React.ReactNode }) {
  const [draft, setDraft, error] = useActivityDraft("learncraft_music_theory_v1", schema, initial);
  const { play, error: toneError } = useTone();
  const sheet = draft.sheet;
  const setSheet = (patch: Partial<Draft["sheet"]>) => setDraft({ ...draft, sheet: { ...sheet, ...patch } });
  const toggleIn = <T,>(list: T[], item: T) => list.includes(item) ? list.filter(value => value !== item) : [...list, item];

  return <ActivityLayout subject="음악" title="음정·화음·음계" description="음정·화음·음계를 오선과 건반으로 함께 보여 주고 소리로 들려주세요. 고른 범위로 음정·화음 이름 쓰기 문제지를 만들 수 있습니다." tabs={tabs} error={error}>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0"><Explorer draft={draft} setDraft={setDraft} play={play} /></div>
      <Card title="문제지 설정">
        <div className="space-y-3">
          <ActivityInput label="문제지 제목" value={sheet.title} maxLength={100} onChange={title => setSheet({ title })} />
          <Segmented label="문제 종류" value={sheet.kind} options={[{ value: "interval", label: "음정 이름" }, { value: "chord", label: "화음 이름" }]} onChange={kind => setSheet({ kind, title: sheet.title === (sheet.kind === "interval" ? "음정 이름 쓰기" : "화음 이름 쓰기") ? kind === "interval" ? "음정 이름 쓰기" : "화음 이름 쓰기" : sheet.title })} />
          <div><p className="mb-1.5 text-xs font-semibold text-ink-3">출제할 {sheet.kind === "interval" ? "음정" : "화음"}</p>
            <div className="flex flex-wrap gap-1">{sheet.kind === "interval"
              ? intervalTypes.map(type => <button key={type.id} type="button" aria-pressed={sheet.intervals.includes(type.id)} className={chipClass(sheet.intervals.includes(type.id))} onClick={() => setSheet({ intervals: toggleIn(sheet.intervals, type.id) })}>{type.name}</button>)
              : chordTypes.map(type => <button key={type.id} type="button" aria-pressed={sheet.chords.includes(type.id)} className={chipClass(sheet.chords.includes(type.id))} onClick={() => setSheet({ chords: toggleIn(sheet.chords, type.id) })}>{type.name}</button>)}</div></div>
          <div className="space-y-2"><p className="text-xs font-semibold text-ink-3">문항 수</p><Segmented label="문항 수" value={sheet.count} options={[6, 9, 12, 15, 18].map(value => ({ value, label: `${value}` }))} onChange={count => setSheet({ count })} /></div>
          <div className="space-y-2"><p className="text-xs font-semibold text-ink-3">음자리표</p><Segmented label="음자리표" value={sheet.clef} options={[{ value: "treble", label: "높은음자리표" }, { value: "bass", label: "낮은음자리표" }]} onChange={clef => setSheet({ clef })} /></div>
          <Toggle label="올림·내림 밑음 포함" checked={sheet.accidentals} onChange={accidentals => setSheet({ accidentals })} help="끄면 밑음은 다·라·마·바·사·가·나에서만 고릅니다. 위의 음에는 올림·내림이 붙을 수 있습니다." />
          {sheet.kind === "interval" && <Toggle label="두 음을 겹쳐 쓰기 (화성 음정)" checked={sheet.harmonic} onChange={harmonic => setSheet({ harmonic })} />}
          <Toggle label="교사용 답안 포함" checked={sheet.answers} onChange={answers => setSheet({ answers })} />
          <Button variant="secondary" size="sm" onClick={() => setSheet({ seed: (sheet.seed + 1) % 1000001 })}><Shuffle size={14} /> 새 문제로 바꾸기</Button>
        </div>
      </Card>
    </div>
    {toneError && <p role="alert" className="text-sm text-danger">{toneError}</p>}
    <QuestionSheet sheet={sheet} />
  </ActivityLayout>;
}

function Explorer({ draft, setDraft, play }: { draft: Draft; setDraft: (draft: Draft) => void; play: (sequence: Pitch[][], gap?: number) => Promise<void> }) {
  const root = rootPitch(draft.root);
  let notes: Pitch[] | null = null;
  let groups: Pitch[][] = [], labels: string[] = [], sequence: Pitch[][] = [], keySignature: string | undefined, summary: React.ReactNode = null;
  if (draft.mode === "interval") {
    const upper = buildInterval(root, draft.interval);
    if (upper) {
      notes = [root, upper]; groups = [[root], [upper], [root, upper]]; labels = [koreanName(root), koreanName(upper), ""]; sequence = [[root], [upper], [root, upper]];
      const info = intervalBetween(root, upper)!;
      summary = <p><b className="text-lg text-ink">{info.name}</b> · 반음 {info.semitones}개 · {koreanName(root)}({englishName(root)}) → {koreanName(upper)}({englishName(upper)})</p>;
    }
  } else if (draft.mode === "chord") {
    notes = buildChord(root, draft.chord);
    if (notes) {
      groups = [...notes.map(note => [note]), notes]; labels = [...notes.map(koreanName), ""]; sequence = [...notes.map(note => [note]), notes];
      const type = chordTypes.find(item => item.id === draft.chord)!;
      summary = <p><b className="text-lg text-ink">{koreanName(root)} {type.name}</b> · {notes.map(note => `${koreanName(note)}(${englishName(note)})`).join(" · ")}<br /><span className="text-ink-3">{type.tip}</span></p>;
    }
  } else if (draft.mode === "scale") {
    notes = buildScale(root, draft.scale);
    if (notes) {
      groups = notes.map(note => [note]); labels = notes.map(koreanName); sequence = groups;
      const type = scaleTypes.find(item => item.id === draft.scale)!;
      summary = <div><p><b className="text-lg text-ink">{koreanName(root)} {type.name}</b> <span className="text-ink-3">· {type.tip}</span></p>
        <p className="mt-2 flex flex-wrap items-center gap-1 text-[.8rem]">{notes.map((note, i) => <span key={i} className="contents"><span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-bold text-ink-2">{koreanName(note)}</span>{i < notes!.length - 1 && <span className={cn("text-[.7rem]", midiOf(notes![i + 1]) - midiOf(note) === 2 ? "text-ink-4" : "font-bold text-brand-dark")}>{stepName(midiOf(notes![i + 1]) - midiOf(note))}</span>}</span>)}</p></div>;
    }
  } else {
    const key = majorKeys.find(item => item.id === draft.key)!;
    const chords = primaryChords(draft.key);
    notes = chords.flatMap(chord => chord.notes); groups = chords.map(chord => chord.notes); labels = chords.map(chord => chord.label); sequence = groups; keySignature = key.vex;
    summary = <ul className="grid gap-1 sm:grid-cols-2">{chords.map(chord => <li key={chord.label}><b className="text-ink">{chord.label} {chord.name}</b> · {chord.notes.map(koreanName).join("·")}</li>)}</ul>;
  }
  const imageKey = JSON.stringify([groups, labels, keySignature ?? null]);
  return <Card title="살펴보기" action={<Button size="sm" disabled={!notes} onClick={() => void play(sequence, draft.mode === "scale" ? 0.45 : 0.75)}><Play size={14} /> 들려주기</Button>}>
    <div className="space-y-3">
      <Segmented label="살펴볼 것" value={draft.mode} options={(Object.keys(modes) as Mode[]).map(value => ({ value, label: modes[value] }))} onChange={mode => setDraft({ ...draft, mode })} />
      <div className="grid gap-2 sm:grid-cols-2">
        {draft.mode === "primary"
          ? <label className="text-xs font-semibold text-ink-3">조<select className={selectClass} value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value as MajorKeyId })}>{majorKeys.map(key => <option key={key.id} value={key.id}>{key.name} ({key.id} major)</option>)}</select></label>
          : <label className="text-xs font-semibold text-ink-3">{draft.mode === "scale" ? "으뜸음" : "밑음"}<select className={selectClass} value={draft.root} onChange={e => setDraft({ ...draft, root: e.target.value as RootId })}>{roots.map(item => <option key={item.id} value={item.id}>{koreanName(item)} ({englishName(item)})</option>)}</select></label>}
        {draft.mode === "interval" && <label className="text-xs font-semibold text-ink-3">음정<select className={selectClass} value={draft.interval} onChange={e => setDraft({ ...draft, interval: e.target.value as IntervalId })}>{intervalTypes.map(type => <option key={type.id} value={type.id}>{type.name} · 반음 {type.semitones}개</option>)}</select></label>}
        {draft.mode === "chord" && <label className="text-xs font-semibold text-ink-3">화음<select className={selectClass} value={draft.chord} onChange={e => setDraft({ ...draft, chord: e.target.value as ChordId })}>{chordTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>}
        {draft.mode === "scale" && <label className="text-xs font-semibold text-ink-3">음계<select className={selectClass} value={draft.scale} onChange={e => setDraft({ ...draft, scale: e.target.value as ScaleId })}>{scaleTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>}
      </div>
      {notes ? <>
        <StaffPicture key={imageKey} spec={imageKey} />
        <div className="text-sm leading-6 text-ink-2">{summary}</div>
        <Keyboard notes={notes} onPress={midi => void play([[{ step: 0, alter: midi % 12, octave: Math.floor(midi / 12) - 1 }]])} />
        <p className="flex items-center gap-1 text-xs text-ink-4"><Volume2 size={13} /> 건반을 누르면 그 음을 들려줍니다. 분홍색 건반이 지금 보이는 음입니다.</p>
      </> : <p role="status" className="rounded-xl bg-surface-2 p-4 text-sm text-ink-3">이 밑음으로는 겹올림·겹내림보다 더 복잡한 철자가 필요해요. 다른 밑음을 골라 주세요.</p>}
    </div>
  </Card>;
}

function StaffPicture({ spec }: { spec: string }) {
  const [image, setImage] = useState<{ url: string; width: number } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const [groups, labels, keySignature] = JSON.parse(spec) as [Pitch[][], string[], string | null];
    staffImage(groups, { clef: "treble", keySignature: keySignature ?? undefined, labels }).then(result => { if (alive) setImage(result); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [spec]);
  if (failed) return <p role="alert" className="text-sm text-danger">오선을 그리지 못했어요. 새로 고침한 뒤 다시 시도해 주세요.</p>;
  // eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 바로 그린 data URL 그림입니다.
  return <div className="flex min-h-[150px] items-center justify-center overflow-x-auto rounded-xl border border-line bg-white p-2">{image ? <img src={image.url} alt="오선에 그린 음" style={{ width: Math.min(image.width * 1.2, 720) }} className="max-w-full" /> : <LoaderCircle size={18} className="animate-spin text-ink-4" />}</div>;
}

function QuestionSheet({ sheet }: { sheet: Draft["sheet"] }) {
  const [html, setHtml] = useState("");
  const [failed, setFailed] = useState(false);
  const octave = sheet.clef === "bass" ? 3 : 4;
  const questions: TheoryQuestion[] = sheet.kind === "interval"
    ? intervalQuestions({ count: sheet.count, seed: sheet.seed, pool: sheet.intervals, accidentals: sheet.accidentals, harmonic: sheet.harmonic, octave })
    : chordQuestions({ count: sheet.count, seed: sheet.seed, pool: sheet.chords, accidentals: sheet.accidentals, octave });
  const pool = sheet.kind === "interval" ? sheet.intervals : sheet.chords;
  const signature = JSON.stringify([sheet, questions]);
  useEffect(() => {
    let alive = true;
    const current = JSON.parse(signature)[1] as TheoryQuestion[];
    Promise.all(current.map(question => staffImage(question.harmonic ? [question.notes] : question.notes.map(note => [note]), { clef: sheet.clef }))).then(images => {
      if (!alive) return;
      const cells = current.map((question, i) => `<td style="border:1px solid #bbb;padding:2mm;vertical-align:top;width:33%"><p style="margin:0 0 1mm;font-weight:bold">(${i + 1})</p><img src="${images[i].url}" alt="" style="width:100%;max-width:${Math.round(images[i].width * 0.26)}mm"><p style="margin:2mm 0 0">답: ____________________</p></td>`);
      const rows = Array.from({ length: Math.ceil(cells.length / 3) }, (_, r) => `<tr style="break-inside:avoid">${cells.slice(r * 3, r * 3 + 3).join("")}${"<td style=\"border:1px solid #bbb\"></td>".repeat(Math.max(0, (r + 1) * 3 - cells.length))}</tr>`).join("");
      const instruction = sheet.kind === "interval" ? `다음 두 음 사이의 음정 이름을 쓰시오. (예: 장3도, 완전5도)` : `다음 화음의 밑음과 화음 이름을 쓰시오. (예: 다 장3화음)`;
      setHtml(sheetHeader(sheet.title || "음악 이론 문제지") + `<p style="font-weight:bold">${esc(instruction)}</p><table style="width:100%;border-collapse:collapse;table-layout:fixed">${rows}</table>`
        + (sheet.answers ? answerPage(`<ol style="padding-left:6mm;line-height:1.9">${current.map(question => `<li><b>${esc(question.answer)}</b> — ${esc(question.detail)}</li>`).join("")}</ol>`) : ""));
      setFailed(false);
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [signature, sheet.answers, sheet.clef, sheet.kind, sheet.title]);
  return <div className="space-y-2">
    {failed && <p role="alert" className="text-sm text-danger">문제지 오선을 그리지 못했어요. 새로 고침한 뒤 다시 시도해 주세요.</p>}
    {pool.length > 0 && questions.length < sheet.count && <p role="status" className="text-xs text-warn">고른 범위로는 {questions.length}문항만 만들 수 있어요. 출제할 항목을 늘려 주세요.</p>}
    <ActivitySheet id="music-theory-print" html={html} disabled={!pool.length || !html} />
  </div>;
}
