import assert from "node:assert/strict";
import { defaultInstrumentSheet, familyGuides, findInstrument, initialConsonants, nameChoices, quizPieces, instrumentFamilies, instruments, instrumentSheetHtml, instrumentSheetSchema, noteLabel, noteToMidi, PIANO_HIGH, PIANO_LOW, rangePercent } from "../src/features/teacher-activities/music-instruments";
import { commonsImages, isCommonsFileName } from "../src/lib/commons-media";

const duplicates = (values: string[]) => values.filter((value, index) => values.indexOf(value) !== index);
assert.deepEqual(duplicates(instruments.map(item => item.id)), [], "악기 id 중복");
assert.deepEqual(duplicates(instruments.map(item => item.name)), [], "악기 이름 중복");
assert.deepEqual(duplicates(instruments.map(item => item.file)), [], "같은 사진을 두 악기에 씀");
for (const family of instrumentFamilies) {
  assert.ok(familyGuides[family], `${family} 설명`);
  assert.ok(instruments.filter(item => item.family === family).length >= 3, `${family} 악기 수`);
}
for (const item of instruments) {
  assert.ok(isCommonsFileName(item.file), `${item.id} 파일 이름`);
  assert.ok(item.summary && item.sound && item.tip, `${item.id} 설명`);
  assert.ok(item.features.length >= 3, `${item.id} 특징`);
  assert.ok(item.works.length >= 1, `${item.id} 감상곡`);
  if (item.range) {
    const low = noteToMidi(item.range.low), high = noteToMidi(item.range.high);
    assert.ok(Number.isFinite(low) && Number.isFinite(high) && low < high, `${item.id} 음역`);
    assert.ok(low >= PIANO_LOW && high <= PIANO_HIGH, `${item.id} 음역이 피아노 건반 밖`);
  }
  // 국악기는 율명 체계라 음역 막대를 싣지 않고 까닭을 적습니다.
  if (item.family === "국악기") assert.ok(!item.range, `${item.id} 국악기 음역`);
}
// 교과서에서 자주 다루는 악기가 빠지지 않았는지 확인합니다.
for (const id of ["violin", "viola", "cello", "double-bass", "guitar", "flute", "clarinet", "trumpet", "timpani", "piano", "gayageum", "geomungo", "haegeum", "daegeum", "janggu", "kkwaenggwari"]) assert.ok(findInstrument(id), `${id} 악기`);

// 음이름 계산
assert.equal(noteToMidi("C4"), 60);
assert.equal(noteToMidi("A0"), 21);
assert.equal(noteToMidi("Bb3"), 58);
assert.equal(noteToMidi("F#4"), 66);
assert.ok(Number.isNaN(noteToMidi("H2")));
assert.equal(noteLabel("Bb3"), "B♭3");
assert.deepEqual(rangePercent({ low: "A0", high: "C8" }), { left: 0, width: 100 });

// 활동지: 입력 글을 이스케이프하고, 사진이 있으면 출처를 함께 싣습니다.
assert.ok(instrumentSheetSchema.safeParse(defaultInstrumentSheet).success);
const card = instrumentSheetHtml({ ...defaultInstrumentSheet, title: "<악기>" }, () => ({ url: "https://upload.wikimedia.org/a.png", credit: "사진: A / Wikimedia Commons / CC0" }));
assert.match(card, /&lt;악기&gt;/);
assert.doesNotMatch(card, /<악기>/);
assert.match(card, /바이올린[\s\S]*플루트[\s\S]*트럼펫[\s\S]*가야금/);
assert.match(card, /Wikimedia Commons \/ CC0/);
const explore = instrumentSheetHtml({ ...defaultInstrumentSheet, mode: "explore", images: false, selected: ["cello", "없는-악기"] }, () => null);
assert.match(explore, /첼로[\s\S]*소리 내는 방법[\s\S]*정리하기/);
assert.doesNotMatch(explore, /<img/);

// 맞히기 모드: 초성 힌트, 핵심 낱말 빈칸, 이름 가리기, 이름 보기 넷
assert.equal(initialConsonants("바이올린"), "ㅂㅇㅇㄹ");
assert.equal(initialConsonants("C음"), "Cㅇ");
const violin = findInstrument("violin")!;
const pieces = quizPieces("말총으로 만든 활로 줄을 켜는 바이올린은 활약합니다.", violin);
assert.deepEqual(pieces.filter(piece => "answer" in piece).map(piece => "answer" in piece && piece.answer), ["말총", "활", "줄"], "낱말 빈칸");
assert.ok(pieces.some(piece => "name" in piece), "악기 이름 가리기");
assert.ok(pieces.some(piece => "text" in piece && piece.text.includes("활약")), "‘활약’의 활은 빈칸이 아님");
assert.equal(quizPieces("높은음자리표로 적습니다.", violin).filter(piece => "answer" in piece).length, 0, "낱말 일부는 빈칸이 아님");
assert.equal(quizPieces("활 활 활 줄 채 괘", violin, 2).filter(piece => "answer" in piece && ["채", "괘"].includes(piece.answer)).length, 0, "빈칸 낱말 수 제한");
for (const item of instruments) {
  const choices = nameChoices(item);
  assert.equal(choices.length, 4, `${item.id} 보기 수`);
  assert.equal(new Set(choices.map(choice => choice.id)).size, 4, `${item.id} 보기 중복`);
  assert.ok(choices.some(choice => choice.id === item.id), `${item.id} 정답 보기`);
  assert.deepEqual(nameChoices(item).map(choice => choice.id), choices.map(choice => choice.id), `${item.id} 보기 순서 고정`);
  // 모든 악기의 설명에 추리할 빈칸이 하나 이상 있어야 합니다.
  assert.ok([item.summary, item.sound, ...item.features].some(text => quizPieces(text, item).some(piece => "answer" in piece)), `${item.id} 빈칸 없음`);
}

// --online: 모든 사진이 Commons에 있고 이용 조건(퍼블릭 도메인·CC)을 통과하는지 확인합니다.
async function verifyOnline() {
  const files = instruments.map(item => item.file);
  const missing: string[] = [];
  for (let index = 0; index < files.length; index += 20) {
    const chunk = files.slice(index, index + 20);
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "1280", iiextmetadatalanguage: "en", titles: chunk.join("|") }).toString();
    let response = await fetch(url, { headers: { "User-Agent": "LearnCraft/1.0 (school learning media; catalog check)" } });
    for (let attempt = 1; response.status === 429 && attempt <= 5; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, attempt * 20_000));
      response = await fetch(url, { headers: { "User-Agent": "LearnCraft/1.0 (school learning media; catalog check)" } });
    }
    assert.ok(response.ok, `Commons 응답 ${response.status}`);
    const found = new Set(commonsImages(await response.json()).map(image => image.file));
    missing.push(...chunk.filter(file => !found.has(file)));
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  assert.deepEqual(missing, [], "Commons에서 쓸 수 없는 사진");
  console.log(`온라인 확인: 사진 ${files.length}개 모두 사용 가능`);
}

void (process.argv.includes("--online") ? verifyOnline() : Promise.resolve()).then(() => console.log(`악기 소개 검증 통과: 악기 ${instruments.length}종 (${instrumentFamilies.map(family => `${family} ${instruments.filter(item => item.family === family).length}`).join(", ")})`));
