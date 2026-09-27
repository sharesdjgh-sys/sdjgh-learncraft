import assert from "node:assert/strict";
import { defaultRhythm, rhythmSchema, rhythmSteps, stepSeconds, rhythmHtml, shuffledIndices, escapeActivity, idiomLibrary, MAX_RHYTHM_TRACKS, newRhythmTrack, trackFrequencies } from "../src/features/teacher-activities/content";
import { blankText, grammarFormKeys, grammarItems, grammarSheetHtml, grammarSheetTypeKeys, markedText } from "../src/features/teacher-activities/hanmun-grammar";
import { defaultJangdan, jangdanHits, jangdanHtml, jangdanPresets, jangdanSchema, jangdanStepSeconds, jangdanSteps, mnemonicLine, padCells, presetDraft } from "../src/features/teacher-activities/janggu";
import { buildChord, buildInterval, buildScale, chordQuestions, intervalBetween, intervalQuestions, intervalTypes, koreanName, majorKeys, midiOf, primaryChords, rootPitch, roots } from "../src/features/teacher-activities/music-theory";

for (const beats of [2, 3, 4]) for (const subdivision of [1, 2] as const) {
  const draft = { ...defaultRhythm, beats, subdivision };
  assert.equal(rhythmSteps(draft) * stepSeconds(draft), beats * 60 / draft.bpm, "subdivision must not change bar duration");
  assert.equal((rhythmHtml(draft).match(/<td /g) ?? []).length, beats * subdivision * 3, "print only visible steps");
}
assert.equal(rhythmSchema.safeParse({ ...defaultRhythm, bpm: 0 }).success, false);
assert.equal(rhythmSchema.safeParse({ ...defaultRhythm, tracks: [] }).success, false);
assert.equal(rhythmSchema.safeParse({ ...defaultRhythm, subdivision: 3 }).success, false);
assert.equal(rhythmSchema.safeParse({ ...defaultRhythm, tracks: [defaultRhythm.tracks[0]] }).success, true, "a single part is allowed");
assert.equal(rhythmSchema.safeParse({ ...defaultRhythm, tracks: Array.from({ length: MAX_RHYTHM_TRACKS }, (_, i) => newRhythmTrack(i)) }).success, true, "up to the max parts");
assert.equal(rhythmSchema.safeParse({ ...defaultRhythm, tracks: Array.from({ length: MAX_RHYTHM_TRACKS + 1 }, (_, i) => newRhythmTrack(i)) }).success, false);
assert.equal(new Set(trackFrequencies).size, MAX_RHYTHM_TRACKS, "each part has its own pitch");
const five = { ...defaultRhythm, tracks: [...defaultRhythm.tracks, newRhythmTrack(3), { ...newRhythmTrack(4), cells: Array(8).fill(true) }] };
assert.equal((rhythmHtml(five).match(/<td /g) ?? []).length, rhythmSteps(five) * 5, "added parts are printed");
const muted = { ...defaultRhythm, tracks: defaultRhythm.tracks.map(t => ({ ...t, enabled: false })) };
assert.equal((rhythmHtml(muted).match(/<td /g) ?? []).length, 0);
assert.ok(!rhythmHtml({ ...defaultRhythm, title: '<img src=x onerror="attack">' }).includes('<img'));
assert.equal(escapeActivity("<>&\"'"), "&lt;&gt;&amp;&quot;&#39;");
for (let length = 2; length <= 30; length++) for (let seed = 0; seed < 50; seed++) {
  const shuffled = shuffledIndices(length, seed);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), Array.from({ length }, (_, i) => i), "no repeated characters lost");
  assert.notDeepEqual(shuffled, Array.from({ length }, (_, i) => i), "do not show original order");
  assert.deepEqual(shuffledIndices(length, seed), shuffled, "screen and print share the same order");
}

// 한문 문장 형식: 독음 글자 수, 핵심 허사, 밑줄 표시, 활동지 이스케이프
const han = /\p{Script=Han}/u;
assert.equal(new Set(grammarItems.map(item => item.id)).size, grammarItems.length, "grammar ids are unique");
for (const item of grammarItems) {
  const chars = [...item.text].filter(c => han.test(c));
  assert.equal([...item.reading.replace(/\s/g, "")].length, chars.length, `${item.id} reading matches hanja count`);
  assert.deepEqual(item.text.split(" ").map(part => part.length), item.reading.split(" ").map(part => part.length), `${item.id} reading follows the same breaks`);
  assert.ok(item.text.includes(item.marker), `${item.id} marker appears in text`);
  for (const mark of item.marks) assert.ok(item.text.includes(mark), `${item.id} mark ${mark} appears in text`);
  assert.ok(grammarFormKeys.includes(item.form));
}
for (const form of grammarFormKeys) assert.ok(grammarItems.some(item => item.form === form), `${form} has an example`);
assert.equal(markedText("學而不思", ["不", "而"]), "學<u style=\"text-underline-offset:3px\">而</u><u style=\"text-underline-offset:3px\">不</u>思");
assert.equal(markedText("忠恕而已矣", ["而已矣", "而"]).match(/<u /g)?.length, 1, "longer marks win");
assert.ok(!blankText("苛政猛於虎也", "於").includes("於"));
const grammarSheet = grammarSheetHtml(grammarItems, { title: "<script>", types: [...grammarSheetTypeKeys], table: true, answers: true, seed: 3 });
assert.ok(!grammarSheet.includes("<script>"));
assert.equal((grammarSheet.match(/\(\d+\)/g) ?? []).length, grammarItems.length * grammarSheetTypeKeys.length, "every type numbers every sentence");
assert.equal(new Set(idiomLibrary.map(item => item.hanja)).size, idiomLibrary.length, "idiom library has no duplicates");
for (const item of idiomLibrary) assert.equal([...item.hanja].length, [...item.reading].length, `${item.hanja} reading length`);

// 국악 장단: 칸 수, 재생 시각, 인쇄
for (const preset of jangdanPresets) {
  assert.equal(preset.cells.length, preset.beats * preset.sub, `${preset.name} cell count`);
  assert.equal(preset.cells[0], "dung", `${preset.name} starts with 덩`);
  const draft = presetDraft(preset);
  assert.ok(jangdanSchema.safeParse(draft).success);
  const length = jangdanSteps(draft) * jangdanStepSeconds(draft);
  assert.ok(Math.abs(length - preset.beats * 60 / preset.bpm) < 1e-9, "one 장단 lasts beats × beat length");
  const hits = jangdanHits(draft);
  assert.ok(hits.every((hit, i) => hit.at >= 0 && hit.at < length && (i === 0 || hit.at >= hits[i - 1].at)), "hits are ordered inside one cycle");
  assert.equal(mnemonicLine(draft).split(" ").length, preset.cells.length);
}
assert.equal(jangdanHits({ ...defaultJangdan, cells: padCells(["dung"]) }).length, 2, "덩 plays both sides");
assert.equal(padCells([]).length, 18);
assert.ok(!jangdanHtml({ ...defaultJangdan, name: "<img src=x>", song: "<svg onload=x>" }).match(/<img|<svg/));
assert.equal(jangdanSchema.safeParse({ ...defaultJangdan, sub: 4 }).success, false);

// 음정·화음·음계
const C4 = rootPitch("C");
assert.equal(intervalBetween(C4, buildInterval(C4, "M3")!)!.name, "장3도");
assert.equal(koreanName(buildInterval(C4, "M3")!), "마");
assert.equal(koreanName(buildInterval(rootPitch("D"), "M3")!), "올림바");
assert.equal(koreanName(buildInterval(rootPitch("F"), "A4")!), "나");
assert.equal(intervalBetween(rootPitch("B"), buildInterval(rootPitch("B"), "d5")!)!.name, "감5도");
assert.equal(intervalBetween({ step: 0, alter: 0, octave: 4 }, { step: 0, alter: 0, octave: 5 })!.name, "완전8도");
assert.equal(intervalBetween({ step: 2, alter: 0, octave: 4 }, { step: 3, alter: 0, octave: 4 })!.name, "단2도");
for (const root of roots) for (const type of intervalTypes) {
  const upper = buildInterval(rootPitch(root.id), type.id);
  if (upper) assert.equal(intervalBetween(rootPitch(root.id), upper)!.name, type.name, `${root.id} ${type.id}`);
}
assert.deepEqual(buildChord(rootPitch("A"), "minor")!.map(koreanName), ["가", "다", "마"]);
assert.deepEqual(buildChord(rootPitch("G"), "dominant7")!.map(koreanName), ["사", "나", "라", "바"]);
assert.deepEqual(buildChord(rootPitch("B"), "diminished")!.map(koreanName), ["나", "라", "바"]);
assert.deepEqual(buildScale(rootPitch("A"), "harmonic")!.map(koreanName), ["가", "나", "다", "라", "마", "바", "올림사", "가"]);
assert.deepEqual(buildScale(rootPitch("F"), "major")!.map(koreanName), ["바", "사", "가", "내림나", "다", "라", "마", "바"]);
for (const key of majorKeys) {
  const chords = primaryChords(key.id);
  assert.deepEqual(chords.map(chord => intervalBetween(chord.notes[0], chord.notes[1])!.name), ["장3도", "장3도", "장3도", "장3도"], `${key.id} primary chords are major`);
}
for (let seed = 0; seed < 30; seed++) {
  const intervals = intervalQuestions({ count: 12, seed, pool: ["m2", "M3", "P5", "A4"], accidentals: seed % 2 === 0, harmonic: false, octave: 4 });
  assert.equal(intervals.length, 12);
  for (const q of intervals) assert.equal(intervalBetween(q.notes[0], q.notes[1])!.name, q.answer, "interval answer matches notes");
  const chords = chordQuestions({ count: 9, seed, pool: ["major", "minor", "diminished", "augmented"], accidentals: true, octave: 3 });
  assert.equal(chords.length, 9);
  for (const q of chords) assert.ok(q.notes.every(note => Math.abs(note.alter) <= 1), "no double accidentals in questions");
}
assert.deepEqual(intervalQuestions({ count: 6, seed: 5, pool: ["M2"], accidentals: false, harmonic: true, octave: 4 }), intervalQuestions({ count: 6, seed: 5, pool: ["M2"], accidentals: false, harmonic: true, octave: 4 }), "same seed, same sheet");
assert.equal(midiOf(C4), 60);

console.log("PASS teacher activities: rhythm timing, card permutations, hanmun grammar data, idiom library, jangdan presets and music theory");
