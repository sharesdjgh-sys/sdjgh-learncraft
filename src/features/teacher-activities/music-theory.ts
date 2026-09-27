/* 음정·화음·음계 계산입니다. 음은 글자(다~나)와 올림·내림으로 적어, 같은 소리라도 철자가 다른 음(올림바·내림사)을 구분합니다. */

export type Pitch = { step: number; alter: number; octave: number };

const stepSemis = [0, 2, 4, 5, 7, 9, 11] as const;
const koreanLetters = ["다", "라", "마", "바", "사", "가", "나"] as const;
const englishLetters = ["C", "D", "E", "F", "G", "A", "B"] as const;
const alterKorean: Record<number, string> = { [-2]: "겹내림", [-1]: "내림", 0: "", 1: "올림", 2: "겹올림" };
const alterSymbol: Record<number, string> = { [-2]: "bb", [-1]: "b", 0: "", 1: "#", 2: "##" };
const alterGlyph: Record<number, string> = { [-2]: "♭♭", [-1]: "♭", 0: "", 1: "♯", 2: "♯♯" };

export const midiOf = (pitch: Pitch) => 12 * (pitch.octave + 1) + stepSemis[pitch.step] + pitch.alter;
export const koreanName = (pitch: Pick<Pitch, "step" | "alter">) => `${alterKorean[pitch.alter]}${koreanLetters[pitch.step]}`;
export const englishName = (pitch: Pick<Pitch, "step" | "alter">) => `${englishLetters[pitch.step]}${alterGlyph[pitch.alter]}`;
export const vexKeyOf = (pitch: Pitch) => `${"cdefgab"[pitch.step]}${alterSymbol[pitch.alter]}/${pitch.octave}`;
export const accidentalOf = (pitch: Pitch) => alterSymbol[pitch.alter];

/** 흔히 쓰는 철자로 적은 으뜸음(밑음) 목록입니다. */
export const roots = [
  { id: "C", step: 0, alter: 0 }, { id: "C#", step: 0, alter: 1 }, { id: "Db", step: 1, alter: -1 }, { id: "D", step: 1, alter: 0 },
  { id: "Eb", step: 2, alter: -1 }, { id: "E", step: 2, alter: 0 }, { id: "F", step: 3, alter: 0 }, { id: "F#", step: 3, alter: 1 },
  { id: "G", step: 4, alter: 0 }, { id: "Ab", step: 5, alter: -1 }, { id: "A", step: 5, alter: 0 }, { id: "Bb", step: 6, alter: -1 }, { id: "B", step: 6, alter: 0 },
] as const;
export type RootId = (typeof roots)[number]["id"];
export const naturalRootIds: RootId[] = ["C", "D", "E", "F", "G", "A", "B"];
export const rootPitch = (id: RootId, octave = 4): Pitch => { const root = roots.find(item => item.id === id) ?? roots[0]; return { step: root.step, alter: root.alter, octave }; };

/** 두 음(아래 → 위)의 음정 이름입니다. 도수와 반음 수로 완전·장·단·증·감을 가립니다. */
export function intervalBetween(lower: Pitch, upper: Pitch) {
  const number = upper.step + 7 * upper.octave - (lower.step + 7 * lower.octave) + 1;
  const semitones = midiOf(upper) - midiOf(lower);
  if (number < 1) return null;
  const simple = (number - 1) % 7, octaves = Math.floor((number - 1) / 7);
  const diff = semitones - stepSemis[simple] - 12 * octaves;
  const perfect = simple === 0 || simple === 3 || simple === 4;
  const quality = perfect
    ? ({ [-2]: "겹감", [-1]: "감", 0: "완전", 1: "증", 2: "겹증" } as Record<number, string>)[diff]
    : ({ [-3]: "겹감", [-2]: "감", [-1]: "단", 0: "장", 1: "증", 2: "겹증" } as Record<number, string>)[diff];
  if (!quality) return null;
  return { number, semitones, quality, name: `${quality}${number}도` };
}

export const intervalTypes = [
  { id: "P1", name: "완전1도", number: 1, semitones: 0 }, { id: "m2", name: "단2도", number: 2, semitones: 1 }, { id: "M2", name: "장2도", number: 2, semitones: 2 },
  { id: "m3", name: "단3도", number: 3, semitones: 3 }, { id: "M3", name: "장3도", number: 3, semitones: 4 }, { id: "P4", name: "완전4도", number: 4, semitones: 5 },
  { id: "A4", name: "증4도", number: 4, semitones: 6 }, { id: "d5", name: "감5도", number: 5, semitones: 6 }, { id: "P5", name: "완전5도", number: 5, semitones: 7 },
  { id: "m6", name: "단6도", number: 6, semitones: 8 }, { id: "M6", name: "장6도", number: 6, semitones: 9 }, { id: "m7", name: "단7도", number: 7, semitones: 10 },
  { id: "M7", name: "장7도", number: 7, semitones: 11 }, { id: "P8", name: "완전8도", number: 8, semitones: 12 },
] as const;
export type IntervalId = (typeof intervalTypes)[number]["id"];

/** 아래 음 위로 음정을 쌓습니다. 겹올림·겹내림보다 더 필요한 철자면 null입니다. */
export function above(lower: Pitch, number: number, semitones: number): Pitch | null {
  const index = lower.step + number - 1;
  const step = index % 7, octave = lower.octave + Math.floor(index / 7);
  const alter = midiOf(lower) + semitones - midiOf({ step, alter: 0, octave });
  return Math.abs(alter) > 2 ? null : { step, alter, octave };
}
export function buildInterval(lower: Pitch, id: IntervalId) {
  const type = intervalTypes.find(item => item.id === id)!;
  return above(lower, type.number, type.semitones);
}

export const chordTypes = [
  { id: "major", name: "장3화음", parts: [[3, 4], [5, 7]], tip: "밑음 위에 장3도, 그 위에 단3도를 쌓습니다. 밝은 느낌입니다." },
  { id: "minor", name: "단3화음", parts: [[3, 3], [5, 7]], tip: "밑음 위에 단3도, 그 위에 장3도를 쌓습니다. 어두운 느낌입니다." },
  { id: "diminished", name: "감3화음", parts: [[3, 3], [5, 6]], tip: "단3도를 두 번 쌓습니다. 밑음과 맨 위 음은 감5도입니다." },
  { id: "augmented", name: "증3화음", parts: [[3, 4], [5, 8]], tip: "장3도를 두 번 쌓습니다. 밑음과 맨 위 음은 증5도입니다." },
  { id: "dominant7", name: "딸림7화음", parts: [[3, 4], [5, 7], [7, 10]], tip: "장3화음 위에 밑음에서 단7도인 음을 더합니다. 으뜸화음으로 가려는 힘이 강합니다." },
] as const;
export type ChordId = (typeof chordTypes)[number]["id"];
export function buildChord(root: Pitch, id: ChordId): Pitch[] | null {
  const type = chordTypes.find(item => item.id === id)!;
  const notes = type.parts.map(([number, semitones]) => above(root, number, semitones));
  return notes.every(Boolean) ? [root, ...notes as Pitch[]] : null;
}

export const scaleTypes = [
  { id: "major", name: "장음계", intervals: [0, 2, 4, 5, 7, 9, 11, 12], tip: "3~4음, 7~8음 사이가 반음입니다." },
  { id: "natural", name: "자연 단음계", intervals: [0, 2, 3, 5, 7, 8, 10, 12], tip: "2~3음, 5~6음 사이가 반음입니다." },
  { id: "harmonic", name: "화성 단음계", intervals: [0, 2, 3, 5, 7, 8, 11, 12], tip: "자연 단음계의 7음을 반음 올려 이끎음을 만듭니다. 6~7음 사이가 증2도입니다." },
  { id: "melodic", name: "가락 단음계(올라갈 때)", intervals: [0, 2, 3, 5, 7, 9, 11, 12], tip: "올라갈 때 6음과 7음을 반음씩 올립니다. 내려올 때는 자연 단음계로 돌아옵니다." },
] as const;
export type ScaleId = (typeof scaleTypes)[number]["id"];
export function buildScale(root: Pitch, id: ScaleId): Pitch[] | null {
  const type = scaleTypes.find(item => item.id === id)!;
  const notes = type.intervals.map((semitones, i) => above(root, i + 1, semitones));
  return notes.every(Boolean) ? notes as Pitch[] : null;
}
export const stepName = (semitones: number) => semitones === 1 ? "반음" : semitones === 2 ? "온음" : semitones === 3 ? "온음 반" : `${semitones}반음`;

/** 장조의 주요 3화음(I·IV·V)과 딸림7화음(V7)입니다. */
export const majorKeys = [
  { id: "C", name: "다장조", root: "C", vex: "C" }, { id: "G", name: "사장조", root: "G", vex: "G" }, { id: "D", name: "라장조", root: "D", vex: "D" },
  { id: "A", name: "가장조", root: "A", vex: "A" }, { id: "F", name: "바장조", root: "F", vex: "F" }, { id: "Bb", name: "내림나장조", root: "Bb", vex: "Bb" }, { id: "Eb", name: "내림마장조", root: "Eb", vex: "Eb" },
] as const satisfies readonly { id: string; name: string; root: RootId; vex: string }[];
export type MajorKeyId = (typeof majorKeys)[number]["id"];
export function primaryChords(keyId: MajorKeyId) {
  const key = majorKeys.find(item => item.id === keyId)!;
  // 으뜸음이 높으면 화음이 오선 위로 너무 올라가므로 가~나 장조는 한 옥타브 아래에서 시작합니다.
  const tonic = rootPitch(key.root, ["A", "Bb"].includes(key.root) ? 3 : 4);
  const scale = buildScale(tonic, "major")!;
  return [
    { label: "I", name: "으뜸화음", notes: buildChord(scale[0], "major")! },
    { label: "IV", name: "버금딸림화음", notes: buildChord(scale[3], "major")! },
    { label: "V", name: "딸림화음", notes: buildChord(scale[4], "major")! },
    { label: "V7", name: "딸림7화음", notes: buildChord(scale[4], "dominant7")! },
  ];
}

/* ───── 문제지 ───── */
export type TheoryQuestion = { notes: Pitch[]; harmonic: boolean; answer: string; detail: string };
function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
}
export function intervalQuestions({ count, seed, pool, accidentals, harmonic, octave }: { count: number; seed: number; pool: IntervalId[]; accidentals: boolean; harmonic: boolean; octave: number }): TheoryQuestion[] {
  const next = random(seed), ids = pool.length ? pool : ["M3"] as IntervalId[];
  const rootIds = accidentals ? roots.map(root => root.id) : naturalRootIds;
  const questions: TheoryQuestion[] = [];
  for (let tries = 0; questions.length < count && tries < count * 20; tries++) {
    const id = ids[Math.floor(next() * ids.length)], lower = rootPitch(rootIds[Math.floor(next() * rootIds.length)], octave);
    const upper = buildInterval(lower, id);
    if (!upper || Math.abs(upper.alter) > 1) continue;
    const previous = questions.at(-1);
    if (previous && previous.notes.every((note, i) => midiOf(note) === midiOf(i ? upper : lower))) continue;
    const name = intervalTypes.find(item => item.id === id)!.name;
    questions.push({ notes: [lower, upper], harmonic, answer: name, detail: `${koreanName(lower)}–${koreanName(upper)} · 반음 ${midiOf(upper) - midiOf(lower)}개` });
  }
  return questions;
}
export function chordQuestions({ count, seed, pool, accidentals, octave }: { count: number; seed: number; pool: ChordId[]; accidentals: boolean; octave: number }): TheoryQuestion[] {
  const next = random(seed), ids = pool.length ? pool : ["major"] as ChordId[];
  const rootIds = accidentals ? roots.map(root => root.id) : naturalRootIds;
  const questions: TheoryQuestion[] = [];
  for (let tries = 0; questions.length < count && tries < count * 20; tries++) {
    const id = ids[Math.floor(next() * ids.length)], root = rootPitch(rootIds[Math.floor(next() * rootIds.length)], octave);
    const notes = buildChord(root, id);
    if (!notes || notes.some(note => Math.abs(note.alter) > 1)) continue;
    const name = chordTypes.find(item => item.id === id)!.name;
    questions.push({ notes, harmonic: true, answer: `${koreanName(root)} ${name}`, detail: notes.map(koreanName).join("·") });
  }
  return questions;
}
