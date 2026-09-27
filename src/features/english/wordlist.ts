/* 영어: 교사가 붙여 넣은 단어 목록(단어 - 뜻 - 예문)으로 단어 시험지와 단어장을 만듭니다. 교과서 단어는 넣지 않고, 기본 목록은 직접 쓴 예시입니다. */
import { clipboardWrap, sheetHead, textHead, type SheetMode } from "@/features/language-sheet";
import { blankLine, circled, escapeHtml, problem, seededRandom, sheetTable, shuffled, type SheetProblem, type SheetSection } from "./sheet";

export type WordEntry = { word: string; meaning: string; example: string };

/** 처음 보여 주는 예시 목록입니다(예문은 직접 쓴 문장). */
export const DEFAULT_WORDS: WordEntry[] = [
  { word: "consumer", meaning: "소비자", example: "Smart consumers compare prices before they buy something." },
  { word: "compare", meaning: "비교하다", example: "She compared the two phones carefully." },
  { word: "purchase", meaning: "구매하다; 구매", example: "He purchased a ticket online." },
  { word: "influence", meaning: "영향을 주다; 영향", example: "Advertising can influence what people buy." },
  { word: "necessary", meaning: "필요한", example: "It is not necessary to buy everything on sale." },
  { word: "refund", meaning: "환불; 환불하다", example: "The store gave me a full refund." },
  { word: "reduce", meaning: "줄이다", example: "We should reduce the amount of plastic we use." },
  { word: "environment", meaning: "환경", example: "Recycling helps protect the environment." },
  { word: "donate", meaning: "기부하다", example: "Many students donated books to the library." },
  { word: "volunteer", meaning: "자원봉사자; 자원봉사하다", example: "She volunteers at a shelter every weekend." },
  { word: "creative", meaning: "창의적인", example: "The team came up with a creative solution." },
  { word: "give up", meaning: "포기하다", example: "Don't give up when things get difficult." },
];

/* ───── 붙여 넣은 글 읽기 ───── */

const SEPARATORS = ["\t", " - ", " – ", " — ", " : ", ":", " = ", "=", " / ", ","];
/** 영어 낱말이 셋 이상인 조각은 예문으로 봅니다. */
const looksLikeSentence = (text: string) => (text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []).length >= 3 && !/[가-힣]/.test(text);

/** 한 줄에 하나씩 ‘단어 - 뜻 - 예문(선택)’을 읽습니다. 구분자는 탭, -, :, =, /, 쉼표를 알아봅니다. 앞의 번호(1. 1) ①)는 뺍니다. */
export function parseWordList(text: string): WordEntry[] {
  const entries: WordEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:\d+\s*[.)]|[①-⑳])\s*/, "").trim();
    if (!line) continue;
    const separator = SEPARATORS.find(item => line.includes(item));
    if (!separator) { entries.push({ word: line, meaning: "", example: "" }); continue; }
    const parts = line.split(separator).map(part => part.trim()).filter(Boolean);
    const [word, ...rest] = parts;
    // 뜻에 쉼표가 들어 있을 수 있으니, 예문처럼 보이는 조각부터 끝까지를 예문으로 묶습니다.
    const at = rest.findIndex(looksLikeSentence);
    const meaning = (at < 0 ? rest : rest.slice(0, at)).join(separator === "," ? ", " : " ").trim();
    const example = at < 0 ? "" : rest.slice(at).join(separator === "," ? ", " : separator.trim() ? ` ${separator.trim()} ` : " ").trim();
    entries.push({ word: word ?? "", meaning, example });
  }
  return entries.filter(entry => entry.word);
}
/** 단어 목록을 다시 붙여 넣기 좋은 ‘단어 - 뜻 - 예문’ 줄로 적습니다. */
export const wordLines = (entries: WordEntry[]) => entries.filter(entry => entry.word.trim()).map(entry => [entry.word, entry.meaning, entry.example].filter(Boolean).join(" - ")).join("\n");

/* ───── 예문에서 단어(변화형 포함) 찾기 ───── */

const vowel = (char: string) => "aeiou".includes(char);
/** 규칙 변화형(-s, -es, -ed, -ing, -er, -est, y→i, e 탈락, 끝 자음 겹침)을 모읍니다. */
export function wordForms(word: string) {
  const w = word.toLowerCase();
  const forms = new Set([w, `${w}s`, `${w}es`, `${w}ed`, `${w}d`, `${w}ing`, `${w}er`, `${w}est`, `${w}ly`]);
  if (w.endsWith("e")) { forms.add(`${w.slice(0, -1)}ing`); forms.add(`${w.slice(0, -1)}ed`); }
  if (w.endsWith("y") && w.length > 1 && !vowel(w[w.length - 2])) for (const tail of ["ies", "ied", "ier", "iest", "ily"]) forms.add(`${w.slice(0, -1)}${tail}`);
  // 자음+모음+자음으로 끝나는 짧은 낱말은 끝 자음을 겹칩니다(stop → stopped).
  const last = w[w.length - 1];
  if (w.length >= 3 && !vowel(last) && vowel(w[w.length - 2]) && !vowel(w[w.length - 3]) && !"wxy".includes(last)) { forms.add(`${w}${last}ed`); forms.add(`${w}${last}ing`); }
  return [...forms];
}
/** 예문 안에서 단어가 나오는 자리를 찾습니다. 여러 낱말(give up)은 첫 낱말만 변화형을 봅니다. */
export function findWord(example: string, word: string): { start: number; end: number } | null {
  const words = word.trim().split(/\s+/);
  if (!words[0]) return null;
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const head = wordForms(words[0]).sort((a, b) => b.length - a.length).map(escape).join("|");
  const tail = words.slice(1).map(escape).join("\\s+");
  const pattern = new RegExp(`\\b(?:${head})${tail ? `\\s+${tail}` : ""}\\b`, "i");
  const match = pattern.exec(example);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

/* ───── 시험지 ───── */

export type WordAsk = "enKo" | "koEn" | "spelling" | "scramble" | "match" | "example" | "choice";
export const wordAsks: Record<WordAsk, string> = {
  enKo: "영어 → 뜻 쓰기", koEn: "뜻 → 영어 쓰기", spelling: "철자 빈칸", scramble: "철자 섞기", match: "짝 맞추기", example: "예문 빈칸", choice: "뜻 고르기(객관식)",
};
const HEADINGS: Record<WordAsk, string> = {
  enKo: "다음 영어 단어의 뜻을 쓰시오.", koEn: "다음 뜻에 알맞은 영어 단어를 쓰시오.", spelling: "빈칸에 알맞은 철자를 넣어 단어를 완성하시오.", scramble: "뜻을 보고 섞인 철자를 바르게 배열하시오.",
  match: "영어 단어와 뜻을 알맞게 연결하시오.", example: "빈칸에 알맞은 단어를 쓰시오. (필요하면 알맞은 형태로 바꾸시오.)", choice: "다음 단어의 뜻으로 알맞은 것을 고르시오.",
};

/** 첫 글자는 두고 글자의 40% 안팎을 _로 가립니다(띄어쓰기·하이픈은 그대로). */
export function spellingBlank(word: string, random: () => number) {
  const letters = [...word].map((char, index) => ({ char, index })).filter(item => /[A-Za-z]/.test(item.char) && item.index > 0);
  const hideCount = Math.max(1, Math.round(letters.length * 0.4));
  const hidden = new Set(shuffled(letters.map(item => item.index), Math.floor(random() * 1e9)).slice(0, hideCount));
  return [...word].map((char, index) => hidden.has(index) ? "_" : char).join(" ");
}
/** 글자를 섞습니다. 처음과 같아지면 다시 섞습니다. */
export function scramble(word: string, random: () => number) {
  const letters = [...word.replace(/\s+/g, "")];
  if (new Set(letters.map(char => char.toLowerCase())).size < 2) return letters.join(" / ");
  for (let tries = 0; tries < 20; tries += 1) {
    const mixed = shuffled(letters, Math.floor(random() * 1e9));
    if (mixed.join("") !== letters.join("")) return mixed.map(char => char.toLowerCase()).join(" / ");
  }
  return [...letters].reverse().map(char => char.toLowerCase()).join(" / ");
}

export type WordTestOptions = { asks: WordAsk[]; count: number; seed: number };
const meaningOf = (entry: WordEntry) => entry.meaning.trim() || "(뜻 없음)";

/** 유형마다 단어를 골라 시험지 묶음을 만듭니다. count는 유형마다 문항 수(목록보다 많으면 목록 전체)입니다. */
export function wordTestSections(entries: WordEntry[], options: WordTestOptions): SheetSection[] {
  const list = entries.filter(entry => entry.word.trim());
  if (!list.length) return [];
  const random = seededRandom(options.seed * 131 + 7);
  const pick = (pool: WordEntry[]) => shuffled(pool, Math.floor(random() * 1e9)).slice(0, Math.min(options.count, pool.length));
  const sections: SheetSection[] = [];
  for (const ask of options.asks) {
    const problems: SheetProblem[] = [];
    if (ask === "enKo") for (const entry of pick(list)) problems.push(problem(`<b>${escapeHtml(entry.word)}</b> ${blankLine("40mm")}`, escapeHtml(meaningOf(entry))));
    else if (ask === "koEn") for (const entry of pick(list.filter(entry => entry.meaning.trim()))) problems.push(problem(`${escapeHtml(entry.meaning)} ${blankLine("40mm")}`, `<b>${escapeHtml(entry.word)}</b>`));
    else if (ask === "spelling") for (const entry of pick(list)) problems.push(problem(`<span style="font-family:Consolas,'Courier New',monospace;letter-spacing:.5mm">${escapeHtml(spellingBlank(entry.word, random))}</span>${entry.meaning ? ` (${escapeHtml(entry.meaning)})` : ""}`, `<b>${escapeHtml(entry.word)}</b>`));
    else if (ask === "scramble") for (const entry of pick(list.filter(entry => entry.word.replace(/\s/g, "").length > 2))) problems.push(problem(`${escapeHtml(scramble(entry.word, random))}${entry.meaning ? ` (${escapeHtml(entry.meaning)})` : ""} → ${blankLine("35mm")}`, `<b>${escapeHtml(entry.word)}</b>`));
    else if (ask === "example") {
      for (const entry of pick(list.filter(entry => entry.example && findWord(entry.example, entry.word)))) {
        const found = findWord(entry.example, entry.word)!;
        const shown = entry.example.slice(found.start, found.end);
        problems.push(problem(`${escapeHtml(entry.example.slice(0, found.start))}${blankLine("28mm")}${escapeHtml(entry.example.slice(found.end))}${entry.meaning ? ` <span style="color:#555">(${escapeHtml(entry.meaning)})</span>` : ""}`,
          `<b>${escapeHtml(shown)}</b>${shown.toLowerCase() !== entry.word.toLowerCase() ? ` (${escapeHtml(entry.word)}의 변화형)` : ""}`));
      }
    } else if (ask === "choice") {
      const pool = list.filter(entry => entry.meaning.trim());
      const distinct = [...new Set(pool.map(entry => entry.meaning.trim()))];
      if (distinct.length >= 4) for (const entry of pick(pool)) {
        const wrong = shuffled(distinct.filter(meaning => meaning !== entry.meaning.trim()), Math.floor(random() * 1e9)).slice(0, 3);
        const choices = shuffled([entry.meaning.trim(), ...wrong], Math.floor(random() * 1e9));
        const answer = choices.indexOf(entry.meaning.trim());
        problems.push(problem(`<b>${escapeHtml(entry.word)}</b><br>${choices.map((choice, index) => `${circled(index)} ${escapeHtml(choice)}`).join("&nbsp;&nbsp;&nbsp; ")}`, `${circled(answer)} ${escapeHtml(entry.meaning)}`));
      }
    } else {
      // 짝 맞추기: 한 문항에 단어 표 하나. 뜻은 ㉠~으로 섞어 적습니다.
      const chosen = pick(list.filter(entry => entry.meaning.trim())).slice(0, 12);
      if (chosen.length >= 2) {
        const marks = "㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫";
        const order = shuffled(chosen.map((_, index) => index), Math.floor(random() * 1e9));
        const rows = chosen.map((entry, index) => [`${index + 1}. ${escapeHtml(entry.word)}`, "( &nbsp;&nbsp;&nbsp; )", `${marks[index]} ${escapeHtml(chosen[order[index]].meaning)}`]);
        const answer = chosen.map((entry, index) => `${index + 1}-${marks[order.indexOf(index)]}`).join(", ");
        problems.push(problem(`단어와 뜻을 연결하시오.${sheetTable(["단어", "답", "뜻"], rows, { widths: ["38%", "14%", "48%"], center: false })}`, escapeHtml(answer)));
      }
    }
    if (problems.length) sections.push({ heading: HEADINGS[ask], problems });
  }
  return sections;
}

/* ───── 단어장 ───── */

export type WordListLayout = "table" | "fold" | "cards";
export const wordListLayouts: Record<WordListLayout, string> = { table: "표", fold: "접어 외우기(두 칸)", cards: "카드" };
export type WordListOptions = { title: string; layout: WordListLayout; examples: boolean; hide: "none" | "word" | "meaning" };

export function wordListHtml(entries: WordEntry[], options: WordListOptions, mode: SheetMode) {
  const list = entries.filter(entry => entry.word.trim());
  const word = (entry: WordEntry) => options.hide === "word" ? "" : `<b>${escapeHtml(entry.word)}</b>`;
  const meaning = (entry: WordEntry) => options.hide === "meaning" ? "" : escapeHtml(entry.meaning);
  const example = (entry: WordEntry) => options.examples && entry.example ? `<div style="margin-top:.6mm;font-size:9pt;color:#444">${escapeHtml(entry.example)}</div>` : "";
  let body: string;
  if (options.layout === "cards") {
    const card = (entry: WordEntry) => `<td style="width:50%;border:1px dashed #888;padding:3mm;vertical-align:top;height:24mm"><div style="font-size:13pt">${word(entry)}</div><div style="margin-top:1mm">${meaning(entry)}</div>${example(entry)}</td>`;
    const rows: string[] = [];
    for (let index = 0; index < list.length; index += 2) rows.push(`<tr>${card(list[index])}${list[index + 1] ? card(list[index + 1]) : `<td style="width:50%"></td>`}</tr>`);
    body = `<table style="border-collapse:collapse;width:100%;font-size:10.5pt">${rows.join("")}</table>`;
  } else if (options.layout === "fold") {
    // 가운데 점선을 따라 접으면 한쪽만 보고 외울 수 있어요.
    body = `<table style="border-collapse:collapse;width:100%;font-size:10.5pt"><tr><th style="border-bottom:1.5px solid #333;padding:1.5mm;width:8%">번호</th><th style="border-bottom:1.5px solid #333;padding:1.5mm;width:42%;border-right:1px dashed #666">영어</th><th style="border-bottom:1.5px solid #333;padding:1.5mm">뜻</th></tr>`
      + list.map((entry, index) => `<tr><td style="border-bottom:1px solid #ccc;padding:1.8mm;text-align:center">${index + 1}</td><td style="border-bottom:1px solid #ccc;padding:1.8mm;border-right:1px dashed #666">${word(entry)}${example(entry)}</td><td style="border-bottom:1px solid #ccc;padding:1.8mm">${meaning(entry)}</td></tr>`).join("") + "</table>";
  } else {
    body = sheetTable(["번호", "단어", "뜻", ...(options.examples ? ["예문"] : [])], list.map((entry, index) => [String(index + 1), word(entry), meaning(entry), ...(options.examples ? [escapeHtml(entry.example)] : [])]), { widths: options.examples ? ["8%", "20%", "24%", "48%"] : ["10%", "40%", "50%"], center: false });
  }
  return clipboardWrap(sheetHead(options.title.trim() || "단어장") + body, mode);
}
export function wordListText(entries: WordEntry[], options: WordListOptions) {
  const list = entries.filter(entry => entry.word.trim());
  return [...textHead(options.title.trim() || "단어장"), "", ...list.map((entry, index) => `${index + 1}. ${options.hide === "word" ? "________" : entry.word}\t${options.hide === "meaning" ? "________" : entry.meaning}${options.examples && entry.example ? `\t${entry.example}` : ""}`)].join("\n");
}
