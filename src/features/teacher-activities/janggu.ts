import { z } from "zod";
import { escapeActivity as esc, question, sheetHeader } from "./content";

/* 국악 장단 도구의 자료입니다. 장구 구음과 연주법, 교과서에 자주 나오는 장단의 기본형을 담았습니다.
 * 장단은 가락·지역에 따라 변형이 많아 칸을 고쳐 쓸 수 있게 합니다. */

export const strokes = {
  rest: { name: "쉼", mnemonic: "", hands: "", play: "소리를 내지 않고 박을 셉니다." },
  dung: { name: "덩", mnemonic: "덩", hands: "두 손", play: "합장단 · 채편과 북편을 함께 칩니다." },
  kung: { name: "쿵", mnemonic: "쿵", hands: "왼손", play: "북편 · 왼쪽 가죽을 궁채나 손바닥으로 칩니다." },
  deok: { name: "덕", mnemonic: "덕", hands: "오른손", play: "채편 · 오른쪽 가죽을 열채로 칩니다." },
  gideok: { name: "기덕", mnemonic: "기덕", hands: "오른손 두 번", play: "채편을 꾸밈음처럼 빠르게 두 번 칩니다." },
  roll: { name: "더러러러", mnemonic: "더러러러", hands: "오른손 굴리기", play: "열채를 굴려 채편을 잘게 여러 번 칩니다." },
} as const;
export type Stroke = keyof typeof strokes;
export const strokeKeys = Object.keys(strokes) as Stroke[];

export type JangdanPreset = { key: string; name: string; meter: string; beats: number; sub: 2 | 3; bpm: number; cells: Stroke[]; songs: string; feel: string };
const r = "rest" as const;
export const jangdanPresets: JangdanPreset[] = [
  { key: "semachi", name: "세마치장단", meter: "9/8 · 3박(한 박을 셋으로)", beats: 3, sub: 3, bpm: 72, cells: ["dung", r, "dung", r, "deok", "kung", "deok", r, r], songs: "아리랑(경기), 도라지타령", feel: "조금 빠르고 경쾌하게 흐릅니다." },
  { key: "gutgeori", name: "굿거리장단", meter: "12/8 · 4박(한 박을 셋으로)", beats: 4, sub: 3, bpm: 66, cells: ["dung", r, "gideok", "kung", r, "roll", "kung", r, "gideok", "kung", r, "roll"], songs: "늴리리야", feel: "흥겹고 여유 있게 춤추듯 흐릅니다." },
  { key: "jajinmori", name: "자진모리장단", meter: "12/8 · 4박(한 박을 셋으로)", beats: 4, sub: 3, bpm: 96, cells: ["dung", r, "deok", "kung", "deok", r, "kung", r, "deok", "kung", "deok", r], songs: "옹헤야, 쾌지나 칭칭 나네", feel: "빠르고 힘차게 몰아갑니다." },
];

export const MAX_BEATS = 6;
export const jangdanSchema = z.object({
  title: z.string().max(100),
  preset: z.string().max(20),
  name: z.string().max(30),
  beats: z.number().int().min(2).max(MAX_BEATS),
  sub: z.union([z.literal(2), z.literal(3)]),
  bpm: z.number().int().min(30).max(160),
  cells: z.array(z.enum(strokeKeys as [Stroke, ...Stroke[]])).length(MAX_BEATS * 3),
  song: z.string().max(100),
  blank: z.boolean(),
});
export type JangdanDraft = z.infer<typeof jangdanSchema>;

/** 칸 수를 바꿔도 뒤쪽 칸을 지우지 않도록 늘 최대 길이로 저장합니다. */
export const padCells = (cells: Stroke[]) => [...cells, ...Array(MAX_BEATS * 3).fill("rest")].slice(0, MAX_BEATS * 3) as Stroke[];
export function presetDraft(preset: JangdanPreset, title = "우리 장단 익히기"): JangdanDraft {
  return { title, preset: preset.key, name: preset.name, beats: preset.beats, sub: preset.sub, bpm: preset.bpm, cells: padCells(preset.cells), song: preset.songs.split(",")[0].trim(), blank: true };
}
export const defaultJangdan = presetDraft(jangdanPresets[0]);
export const jangdanSteps = (draft: Pick<JangdanDraft, "beats" | "sub">) => draft.beats * draft.sub;
/** 빠르기는 한 박(점4분음표 또는 4분음표)을 기준으로 합니다. */
export const jangdanStepSeconds = (draft: Pick<JangdanDraft, "bpm" | "sub">) => 60 / draft.bpm / draft.sub;
export const mnemonicLine = (draft: JangdanDraft) => draft.cells.slice(0, jangdanSteps(draft)).map(stroke => strokes[stroke].mnemonic || "·").join(" ");

/** 재생할 소리 목록입니다. at은 장단 시작부터의 초, part는 칠 곳입니다. */
export function jangdanHits(draft: JangdanDraft) {
  const step = jangdanStepSeconds(draft);
  const hits: { at: number; part: "kung" | "deok"; soft?: boolean }[] = [];
  draft.cells.slice(0, jangdanSteps(draft)).forEach((stroke, i) => {
    const at = i * step;
    if (stroke === "dung") hits.push({ at, part: "kung" }, { at, part: "deok" });
    if (stroke === "kung") hits.push({ at, part: "kung" });
    if (stroke === "deok") hits.push({ at, part: "deok" });
    if (stroke === "gideok") hits.push({ at, part: "deok", soft: true }, { at: at + step / 2, part: "deok" });
    if (stroke === "roll") for (let k = 0; k < 4; k++) hits.push({ at: at + k * step / 4, part: "deok", soft: k > 0 });
  });
  return hits;
}

function gridHtml(draft: JangdanDraft, empty: boolean) {
  const steps = jangdanSteps(draft);
  const cell = (i: number, extra = "") => `style="border:1px solid #666;${i % draft.sub === 0 ? "border-left:2px solid #000;" : ""}padding:3mm 1mm;text-align:center;font-size:12pt;min-width:12mm${extra}"`;
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:2mm 0 4mm"><thead><tr>${Array.from({ length: draft.beats }, (_, b) => `<th colspan="${draft.sub}" style="border:1px solid #666;border-left:2px solid #000;padding:1mm;font-size:10pt">${b + 1}박</th>`).join("")}</tr></thead><tbody><tr>${draft.cells.slice(0, steps).map((stroke, i) => `<td ${cell(i, ";height:12mm")}>${empty ? "" : esc(strokes[stroke].mnemonic)}</td>`).join("")}</tr></tbody></table>`;
}

export function jangdanHtml(draft: JangdanDraft) {
  const used = strokeKeys.filter(key => key !== "rest" && draft.cells.slice(0, jangdanSteps(draft)).includes(key));
  const legend = used.map(key => `<li><b>${strokes[key].name}</b> (${strokes[key].hands}) — ${esc(strokes[key].play)}</li>`).join("");
  return sheetHeader(draft.title || "장단 익히기")
    + `<p><b>${esc(draft.name || "장단")}</b> · ${draft.beats}박, 한 박을 ${draft.sub === 3 ? "셋" : "둘"}으로 나눔 · 한 박 = ${draft.bpm} BPM</p>`
    + gridHtml(draft, false)
    + (legend ? `<ul style="margin:0 0 4mm;padding-left:5mm;font-size:10pt;line-height:1.7">${legend}<li>빈칸은 소리를 내지 않고 속으로 박을 셉니다. 굵은 세로줄이 한 박의 시작입니다.</li></ul>` : "")
    + question("1. 구음을 입으로 외며 무릎 장단으로 쳐 봅시다.", "<p>덩은 두 손으로 무릎을, 쿵은 왼손, 덕은 오른손으로 칩니다. 첫 박에 힘을 주어 장단의 시작을 느껴 봅시다.</p>", 1)
    + question(`2. 장단에 맞추어 ${draft.song.trim() ? `‘${draft.song.trim()}’` : "민요"}를 불러 봅시다.`, "<p>노래의 어느 부분에서 장단의 첫 박이 돌아오나요?</p>", 2)
    + (draft.blank ? question("3. 장단의 일부를 바꾸어 우리 모둠의 변형 장단을 만들어 봅시다.", gridHtml(draft, true) + "<p>바꾼 까닭과 느낌의 차이:</p>", 2) : "")
    + question(`${draft.blank ? 4 : 3}. 한 박을 ${draft.sub === 3 ? "셋" : "둘"}으로 나누는 느낌을 서양 음악의 박자와 비교해 봅시다.`, "", 2);
}
