import assert from "node:assert/strict";
import { noteLabel, noteToken, parseScore, playbackEvents, vexKey, type ScoreSettings } from "../src/lib/music-score/notation";

const base: ScoreSettings = { title: "", composer: "", lyricist: "", clef: "treble", key: "C", time: "4/4", tempo: 60, lyrics: "", perLine: 4, labels: "solfege" };
const notes = (text: string, patch: Partial<ScoreSettings> = {}) => parseScore(text, { ...base, ...patch }).measures.flatMap(measure => measure.notes);
const keys = (text: string, patch: Partial<ScoreSettings> = {}) => notes(text, patch).map(vexKey);

// 이동도법: 조마다 '도'의 위치가 바뀝니다.
assert.deepEqual(keys("도4 미4 솔4 높은도4"), ["c/4", "e/4", "g/4", "c/5"]);
assert.deepEqual(keys("도4 시4", { key: "G" }), ["g/4", "f#/5"], "사장조 시는 올림바");
assert.deepEqual(keys("파4 파#4", { key: "F" }), ["bb/4", "b/4"], "바장조 파는 내림나, 올리면 제자리 나");
assert.deepEqual(keys("도4", { key: "Bb" }), ["bb/4"]);
assert.deepEqual(keys("라4 시4 도4 솔#4 낮은솔#4", { key: "Am" }), ["a/4", "b/4", "c/5", "g#/5", "g#/4"], "가단조는 라가 으뜸음");
assert.deepEqual(keys("라4 도4", { key: "Em" }), ["e/4", "g/4"]);
assert.deepEqual(keys("라4", { key: "Dm" }), ["d/4"]);
assert.deepEqual(keys("도4 낮은솔4", { clef: "bass" }), ["c/3", "g/2"]);
assert.equal(notes("도4")[0].midi, 60);
assert.equal(noteLabel(notes("파4", { key: "F" })[0], "letter"), "내림나");
assert.equal(noteLabel(notes("파#4")[0], "solfege"), "파#");

// 길이 생략, 점음표, 박자 검사
assert.deepEqual(notes("도8 레 미 파").map(note => note.duration), [8, 8, 8, 8]);
assert.equal(notes("도4.")[0].units, 12);
const pickup = parseScore("솔4 | 도4 도4 도4 도4 | 도4 도4 | 도1 |", base);
assert.deepEqual(pickup.warnings.map(issue => issue.measure), [1], "첫 마디가 모자라면 못갖춘마디 안내");
assert.deepEqual(pickup.errors.map(issue => issue.measure), [3], "가운데 마디가 모자라면 오류");
assert.equal(parseScore("도2 도2 도4", base).errors.length, 1, "박자 넘침");
assert.equal(parseScore("도4 도4. 레8 | 도2 쉼2 |", { ...base, time: "3/4" }).errors.length, 1);
assert.equal(parseScore("도8 레8 미8 파4. | 솔4. 쉼4. |", { ...base, time: "6/8" }).errors.length, 0);
assert.match(parseScore("도4 키4", base).errors[0].message, /키4/);
assert.equal(parseScore("도16.", base).errors.length, 1, "점16분음표 거부");

// 가사: 쉼표와 붙임줄 뒤 음은 건너뛰고 '-'는 비웁니다.
const lyric = notes("도4 쉼4 레2~ | 레4 미4 파2", { lyrics: "하 나 - 셋" }).map(note => note.lyric);
assert.deepEqual(lyric, ["하", null, "나", null, null, "셋"]);

// 재생: 붙임줄로 이어진 같은 음은 한 소리
const play = playbackEvents(parseScore("도2~ | 도2 레2 |", base), 60);
assert.equal(play.sounds.length, 2);
assert.equal(play.sounds[0].length, 4, "2분음표 둘을 이어 4초");
assert.deepEqual(play.highlights, [0, 2, 4]);

// 건반 입력 토큰은 다시 읽을 수 있어야 합니다.
for (const token of [noteToken({ degree: 4, alter: 1, shift: 1, duration: 8, dotted: true }), noteToken({ rest: true, duration: 2 }), noteToken({ degree: 6, alter: -1, shift: -1, duration: 16 })]) {
  assert.equal(parseScore(token, base).errors.length, 0, token);
}
assert.equal(noteToken({ degree: 4, alter: 1, shift: 1, duration: 8, dotted: true }), "높은솔#8.");
console.log("PASS music score: movable-do pitches, labels, durations, beat checks, lyrics, ties and keyboard tokens");

// 코드: 붙여 쓰기, 띄어 쓰기, 전각 괄호, 음표 없는 코드
const chords = (text: string) => parseScore(text, base).measures.flatMap(measure => measure.notes).map(note => note.chord);
assert.deepEqual(chords("[C]도4 미4 [G7] 레2"), ["C", null, "G7"]);
assert.deepEqual(chords("［Am］라1"), ["Am"]);
assert.match(parseScore("도2 도2 [C] |", base).errors[0].message, /뒤에 음표가 없어요/);
console.log("PASS music score chords: attached, spaced, full-width brackets and missing-note guidance");

// 예시 악보는 모두 박자가 맞고(못갖춘마디 안내만 허용) 가사 수가 음표 수와 맞아야 합니다.
import { scoreExamples } from "../src/lib/music-score/examples";
for (const example of scoreExamples) {
  const settings = { ...base, ...example.settings };
  const result = parseScore(example.text, settings);
  assert.deepEqual(result.errors, [], example.name);
  assert(result.warnings.every(issue => issue.measure === 1 || issue.measure === result.measures.length), example.name);
  if (settings.lyrics) {
    const sung = result.measures.flatMap(measure => measure.notes).filter(note => note.lyric).length;
    assert.equal(sung, settings.lyrics.trim().split(/\s+/).length, `${example.name} 가사 수`);
  }
}
console.log(`PASS music score examples: ${scoreExamples.length} examples have valid beats and lyrics`);

// 붙여 쓴 음표와 흔한 실수 안내
assert.deepEqual(keys("도4레8미8 파2"), ["c/4", "d/4", "e/4", "f/4"]);
assert.deepEqual(notes("도레미파").map(note => note.duration), [4, 4, 4, 4]);
assert.match(parseScore("도 4 레4 미2", base).errors[0].message, /앞에 계이름을 붙여/);
assert.match(parseScore("C4 D4 E2", base).errors[0].message, /계이름\(도·레·미\)/);
console.log("PASS music score input: glued notes and mistake hints");

// 입력 방법 팝업의 예시도 모두 올바른 악보여야 합니다.
import { musicGuideLessons } from "../src/components/teacher/music-score-guide";
let guideExamples = 0;
for (const lesson of musicGuideLessons) for (const example of lesson.examples ?? []) {
  const result = parseScore(example.text, { ...base, ...example.settings });
  assert.deepEqual(result.errors, [], `${lesson.title}: ${example.text}`);
  guideExamples += 1;
}
for (const lesson of musicGuideLessons) for (const mistake of lesson.mistakes ?? []) {
  if (/^[도레미파솔라시낮높쉼\[]/.test(mistake.right) && !mistake.right.includes("…") && !mistake.right.includes("사장조")) assert.deepEqual(parseScore(mistake.right, base).errors, [], mistake.right);
}
console.log(`PASS music score guide: ${guideExamples} lesson examples and corrected mistakes are valid`);
