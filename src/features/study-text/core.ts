import { z } from "zod";
import { answerSection, clipboardWrap, escapeHtml, langHtml, objectParticle, romans, sheetHead, subjectParticle, textHead, type SheetLang, type SheetMode } from "@/features/language-sheet";

/* 일본어·중국어 본문 풀이의 형식과 학습지 만들기 규칙입니다. 화면·서버·검증 스크립트가 같은 규칙을 씁니다.
 * 한 문장은 읽기 표기 하나로 원문·읽기(후리가나·병음)·끊어 읽기를 모두 나타냅니다.
 *   일본어: "{私|わたし}は/{毎朝|まいあさ}/{七時|しちじ}に/{起|お}きます。"
 *   중국어: "{我|wǒ}{每天|měi tiān}/{七点|qī diǎn}{起床|qǐ chuáng}。"
 *   {한자|읽기}는 한자에 다는 읽기, /는 끊어 읽는 곳입니다. 둘을 지우면 원문과 같아야 합니다.
 * 언어마다 다른 점(읽기 형식, 품사, 프롬프트, 글꼴)은 TextProfile로 받습니다(profiles.ts). */

export const MAX_TEXT_LENGTH = 1500;
export const MAX_SENTENCES = 40;

const KANJI = /[\p{Script=Han}々〆ヶ]/u;
const compact = (text: string) => text.normalize("NFC").replace(/[\s/／]/g, "");

export type TextProfileId = "japanese" | "chinese";
/** 언어마다 다른 본문 풀이 설정입니다. */
export type TextProfile = {
  id: TextProfileId; language: string; lang: SheetLang; speech: "ja-JP" | "zh-CN"; fontClass: "font-ja" | "font-zh";
  /** 후리가나·병음처럼 한자 위에 다는 읽기 이름입니다. */
  rubyName: string;
  /** 이 언어 글자(가나·한자 또는 한자)인지 봅니다. */
  isScript: (char: string) => boolean;
  /** {한자|읽기} 한 조각의 읽기를 봅니다. 형식이 틀리면 error, 사람이 확인할 곳이면 check, 문제가 없으면 null입니다. */
  rubyCheck: (base: string, reading: string) => { level: "error" | "check"; text: string } | null;
  posLabels: readonly [string, ...string[]];
  /** 학습지 첫 유형(한자 읽기·병음 쓰기)의 이름과 지시문입니다. */
  readingSheet: { label: string; instruction: string };
  /** AI에게 보낼 설명(시스템 프롬프트)과 스키마 설명입니다. */
  prompt: string; describe: { ruby: string; word: string; reading: string; pattern: string; surface: string; meaning: string };
  /** 원문 끊어 읽기 이름입니다(문절·의미 단위). */
  spacedLabel: string;
};

export const scriptOf = (profile: TextProfile, text: string) => [...text.normalize("NFC")].filter(profile.isScript);

export const analyzeRequestSchema = z.object({
  profile: z.enum(["japanese", "chinese"]).default("japanese"),
  text: z.string().trim().min(1, "본문을 입력해 주세요.").max(MAX_TEXT_LENGTH, `본문은 ${MAX_TEXT_LENGTH.toLocaleString()}자까지 입력할 수 있어요.`),
  title: z.string().trim().max(100).default(""),
});
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// 저장·편집용 모양입니다. 품사는 언어마다 달라 문자열로 둡니다.
export const wordSchema = z.object({ word: z.string().max(20), reading: z.string().max(40), meaning: z.string().max(80), pos: z.string().max(12) });
export type TextWord = z.infer<typeof wordSchema>;
export const grammarSchema = z.object({ pattern: z.string().max(30), surface: z.string().max(20), meaning: z.string().max(120) });
export type TextGrammar = z.infer<typeof grammarSchema>;
export type TextSentence = { ruby: string; translation: string; grammar: TextGrammar[]; words: TextWord[] };

/** AI 구조화 출력에 쓰는 스키마입니다. 품사는 그 언어의 목록에서 고르게 합니다. */
export function analysisSchemaFor(profile: TextProfile) {
  const sentence = z.object({
    ruby: z.string().min(1).max(500).describe(profile.describe.ruby),
    translation: z.string().max(500).describe("자연스러운 한국어 해석"),
    grammar: z.array(z.object({
      pattern: z.string().max(30).describe(profile.describe.pattern),
      surface: z.string().max(20).describe(profile.describe.surface),
      meaning: z.string().max(120).describe(profile.describe.meaning),
    })).max(4).describe("이 문장에서 가르칠 문법·문형 0~3개"),
    words: z.array(z.object({
      word: z.string().max(20).describe(profile.describe.word),
      reading: z.string().max(40).describe(profile.describe.reading),
      meaning: z.string().max(80).describe("이 문장에서의 한국어 뜻"),
      pos: z.enum(profile.posLabels).describe("품사"),
    })).max(8).describe("중요 낱말 2~6개"),
  });
  return z.object({
    summary: z.string().max(500).describe("글 전체의 내용을 한국어 두세 문장으로"),
    sentences: z.array(sentence).min(1).max(MAX_SENTENCES),
  });
}

export function analysisTask(input: Pick<AnalyzeRequest, "text" | "title">) {
  return JSON.stringify({ title: input.title || null, text: input.text.normalize("NFC") });
}

// ── 읽기 표기 읽기 ───────────────────────────────────

export type RubyToken = { kind: "text"; text: string } | { kind: "ruby"; base: string; reading: string };
export type Chunk = RubyToken[];

/** 읽기 표기를 끊어 읽기 단위로 나눕니다. 괄호가 맞지 않으면 그 부분을 글자 그대로 둡니다. */
export function chunksOf(ruby: string): Chunk[] {
  const chunks: Chunk[] = [[]];
  const push = (token: RubyToken) => {
    const chunk = chunks.at(-1)!;
    const last = chunk.at(-1);
    if (token.kind === "text" && last?.kind === "text") last.text += token.text;
    else chunk.push(token);
  };
  const text = ruby.normalize("NFC");
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "/" || char === "／" || /\s/.test(char)) {
      if (chunks.at(-1)!.length) chunks.push([]);
      index += 1;
      continue;
    }
    if (char === "{") {
      const end = text.indexOf("}", index);
      const bar = text.indexOf("|", index);
      if (end > index && bar > index && bar < end) {
        push({ kind: "ruby", base: text.slice(index + 1, bar), reading: text.slice(bar + 1, end) });
        index = end + 1;
        continue;
      }
    }
    push({ kind: "text", text: char });
    index += 1;
  }
  return chunks.filter(chunk => chunk.length);
}

const tokenText = (token: RubyToken) => token.kind === "text" ? token.text : token.base;
/** 읽기와 빗금을 뺀 원문입니다. */
export const plainOf = (ruby: string) => chunksOf(ruby).map(chunk => chunk.map(tokenText).join("")).join("");
/** 끊어 읽는 곳을 띄어 쓴 원문입니다. */
export const spacedOf = (ruby: string) => chunksOf(ruby).map(chunk => chunk.map(tokenText).join("")).join(" ");
/** 한자를 읽기로 바꾼 가나 문장입니다. */
export const readingOf = (ruby: string) => chunksOf(ruby).map(chunk => chunk.map(token => token.kind === "text" ? token.text : token.reading).join("")).join("");
export const rubyWords = (ruby: string) => chunksOf(ruby).flat().filter((token): token is Extract<RubyToken, { kind: "ruby" }> => token.kind === "ruby");

// ── 자동 점검 ─────────────────────────────────────────────

export type Issue = { level: "error" | "check"; text: string };

/** AI가 틀리기 쉬운 곳을 기계적으로 찾습니다. error는 학습지에 그대로 쓰면 안 되는 형식 오류, check는 사람이 확인할 곳입니다. */
export function sentenceIssues(profile: TextProfile, sentence: TextSentence): Issue[] {
  const issues: Issue[] = [];
  const plain = plainOf(sentence.ruby);
  const name = profile.rubyName;
  if (!scriptOf(profile, plain).length) return [{ level: "error", text: `문장에 ${subjectParticle(profile.language)} 없습니다.` }];
  const stray = [...sentence.ruby].filter(char => char === "{" || char === "}" || char === "|").length - rubyWords(sentence.ruby).length * 3;
  if (stray) issues.push({ level: "error", text: `${name} 괄호 {한자|읽기}가 맞지 않는 곳이 있습니다.` });
  const tokens = rubyWords(sentence.ruby);
  const problems = tokens.flatMap(token => { const problem = profile.rubyCheck(token.base, token.reading); return problem ? [{ ...problem, text: `${token.base}(${token.reading || "빈칸"}): ${problem.text}` }] : []; });
  for (const level of ["error", "check"] as const) {
    const found = problems.filter(problem => problem.level === level);
    if (found.length) issues.push({ level, text: `${level === "error" ? `${name} 형식이 맞지 않습니다` : `${objectParticle(name)} 확인해 주세요`}. ${found.slice(0, 3).map(problem => problem.text).join(" / ")}${found.length > 3 ? ` 외 ${found.length - 3}곳` : ""}` });
  }
  const noKanji = tokens.filter(token => !KANJI.test(token.base));
  if (noKanji.length) issues.push({ level: "check", text: `한자가 없는 곳에 ${subjectParticle(name)} 있습니다: ${noKanji.map(token => token.base).join(", ")}` });
  const bare = chunksOf(sentence.ruby).flat().flatMap(token => token.kind === "text" ? [...token.text].filter(char => KANJI.test(char)) : []);
  if (bare.length) issues.push({ level: "check", text: `${subjectParticle(name)} 없는 한자: ${[...new Set(bare)].join(" ")}` });
  if (!sentence.translation.trim()) issues.push({ level: "check", text: "해석이 비어 있습니다." });
  const missingGrammar = sentence.grammar.filter(item => item.surface.trim() && !plain.includes(item.surface.trim()));
  if (missingGrammar.length) issues.push({ level: "check", text: `문장에 없는 문법 표현(빈칸 문제에서 빠짐): ${missingGrammar.map(item => item.surface).join(", ")}` });
  // 낱말은 사전형으로 적으므로 첫 글자가 문장에 있는지만 봅니다(食べる → 食べます). する·来る는 활용하면 글자가 바뀌어(します, 来ない) 앞부분만 봅니다.
  const reading = readingOf(sentence.ruby);
  const missingWords = sentence.words.filter(word => {
    const stem = word.word.trim().replace(/(する|くる|来る)$/u, "");
    const stemReading = word.reading.trim().replace(/(する|くる)$/u, "");
    return stem && !plain.includes([...stem][0]) && !(stemReading && reading.includes([...stemReading][0]));
  });
  if (missingWords.length) issues.push({ level: "check", text: `이 문장에 없는 낱말: ${missingWords.map(word => word.word).join(", ")}` });
  return issues;
}

/** 입력한 본문과 풀이 문장들이 같은지 봅니다. 띄어쓰기·줄바꿈은 무시합니다. 같으면 null입니다. */
export function textMismatch(text: string, sentences: Pick<TextSentence, "ruby">[]) {
  const original = [...compact(text)];
  const analyzed = [...compact(sentences.map(sentence => plainOf(sentence.ruby)).join(""))];
  const index = original.findIndex((char, position) => analyzed[position] !== char);
  if (index >= 0 && index < analyzed.length) return `본문 ${index + 1}번째 글자 ‘${original[index]}’가 풀이에서는 ‘${analyzed[index]}’입니다(‘${original.slice(Math.max(0, index - 4), index + 4).join("")}’ 근처). 앞뒤 문장을 확인해 주세요.`;
  if (original.length > analyzed.length) return `풀이에 본문 ${original.length - analyzed.length}자가 빠졌습니다(‘${original.slice(analyzed.length, analyzed.length + 8).join("")}…’부터).`;
  if (analyzed.length > original.length) return `풀이에 본문에 없는 글자 ${analyzed.length - original.length}자가 더 있습니다.`;
  return null;
}

/** AI 결과를 저장 형식으로 다듬습니다. 빗금은 한 개로, 앞뒤 공백은 뺍니다. */
export function normalizeSentence(sentence: TextSentence): TextSentence {
  const ruby = chunksOf(sentence.ruby.trim()).map(chunk => chunk.map(token => token.kind === "text" ? token.text : `{${token.base}|${token.reading.trim()}}`).join("")).join("/");
  return {
    ruby, translation: sentence.translation.trim(),
    grammar: sentence.grammar.map(item => ({ pattern: item.pattern.trim(), surface: item.surface.normalize("NFC").trim(), meaning: item.meaning.trim() })).filter(item => item.pattern || item.surface),
    words: sentence.words.map(word => ({ ...word, word: word.word.normalize("NFC").trim(), reading: word.reading.trim(), meaning: word.meaning.trim() })).filter(word => word.word),
  };
}

/** AI 없이 직접 입력할 때 본문을 문장부호·줄바꿈 기준으로 빈 문장들로 나눕니다. */
export function splitSentences(profile: TextProfile, text: string): TextSentence[] {
  return text.normalize("NFC").split(/(?<=[。．.！!？?])\s*|\n+/u).map(part => part.trim()).filter(part => scriptOf(profile, part).length)
    .map(part => ({ ruby: part.replace(/\s+/g, ""), translation: "", grammar: [], words: [] }));
}

// ── 학습지 ───────────────────────────────────────────────

export const sheetTypeKeys = ["kanji", "translation", "grammar", "composition", "words"] as const;
export type SheetType = (typeof sheetTypeKeys)[number];
/** 학습지 유형 이름과 지시문입니다. 첫 유형(한자 읽기·병음 쓰기)과 작문 유형은 언어마다 다릅니다. */
export function sheetType(profile: TextProfile, type: SheetType) {
  return {
    kanji: profile.readingSheet,
    translation: { label: "해석 쓰기", instruction: "다음 문장을 우리말로 해석하시오." },
    grammar: { label: "문법 빈칸", instruction: "빈칸에 들어갈 알맞은 말을 〈보기〉에서 골라 쓰시오." },
    composition: { label: `${profile.language}로 쓰기`, instruction: `다음 우리말을 ${profile.language}로 쓰시오.` },
    words: { label: "낱말 뜻 쓰기", instruction: "다음 낱말의 뜻을 쓰시오." },
  }[type];
}
export type SheetOptions = { title: string; types: SheetType[]; ruby: boolean; spaced: boolean; answers: boolean };

type Piece = { kind: "text"; text: string } | { kind: "ruby"; base: string; reading: string } | { kind: "mark"; base: string; label: string } | { kind: "blank"; label: string };
type Line = Piece[];
type SheetQuestion = { kind: "line"; line: Line; lines: number } | { kind: "korean"; text: string; lines: number } | { kind: "word"; text: string; reading: string };
export type SheetItem = { question: SheetQuestion; answer: string };
export type SheetSection = { type: SheetType; instruction: string; box: string[]; items: SheetItem[] };

const circled = (index: number) => String.fromCharCode(0x2460 + index);

// 문장을 그릴 조각으로 바꿉니다. spaced면 끊어 읽는 곳을 한 칸 띄웁니다.
function lineOf(ruby: string, options: { ruby: boolean; spaced: boolean }): Line {
  const line: Line = [];
  chunksOf(ruby).forEach((chunk, index) => {
    if (index && options.spaced) line.push({ kind: "text", text: " " });
    for (const token of chunk) line.push(token.kind === "ruby" && options.ruby ? { ...token } : { kind: "text", text: tokenText(token) });
  });
  return line;
}

// 문법 표현을 빈칸으로 바꿉니다. 끊어 읽기 단위 끝(문장부호 앞)에서 끝나는 곳을 먼저 모두 바꾸고(조사 は가 はな 속에서 잡히지 않게),
// 그런 곳이 없으면 처음 나온 곳을 바꿉니다. ています처럼 끊어 읽는 곳을 넘는 표현도 찾습니다.
const TRAILING = /[。、．，！？!?,.」』）)]/u;
function blankLine(sentence: TextSentence, options: { spaced: boolean }) {
  const chunks = chunksOf(sentence.ruby).map(chunk => [...chunk.map(tokenText).join("")]);
  const chars = chunks.flat();
  const starts = new Set<number>();
  const ends = new Set<number>();
  let position = 0;
  for (const chunk of chunks) {
    starts.add(position);
    let end = position + chunk.length;
    while (end > position && TRAILING.test(chars[end - 1])) end -= 1;
    ends.add(end);
    position += chunk.length;
  }
  const surfaces = [...new Set(sentence.grammar.map(item => [...item.surface.trim()].join("")).filter(Boolean))].sort((a, b) => [...b].length - [...a].length);
  const owner: (number | null)[] = chars.map(() => null);
  const found: string[] = [];
  for (const surface of surfaces) {
    const length = [...surface].length;
    const hits: number[] = [];
    for (let start = 0; start + length <= chars.length; start += 1) if (chars.slice(start, start + length).join("") === surface) hits.push(start);
    const preferred = hits.filter(start => ends.has(start + length));
    for (const start of preferred.length ? preferred : hits.slice(0, 1)) {
      if (owner.slice(start, start + length).some(value => value !== null)) continue;
      let id = found.indexOf(surface);
      if (id < 0) { id = found.length; found.push(surface); }
      for (let offset = 0; offset < length; offset += 1) owner[start + offset] = id;
    }
  }
  if (!found.length) return null;
  // 빈칸 번호는 문장에 나오는 순서대로 다시 매깁니다.
  const order = [...new Set(owner.filter((value): value is number => value !== null))];
  const line: Line = [];
  chars.forEach((char, index) => {
    const id = owner[index];
    const inside = id !== null && owner[index - 1] === id;
    if (index && options.spaced && starts.has(index) && !inside) line.push({ kind: "text", text: " " });
    if (id === null) line.push({ kind: "text", text: char });
    else if (!inside) line.push({ kind: "blank", label: circled(order.indexOf(id)) });
  });
  return { line, terms: order.map(id => found[id]), answer: order.map((id, place) => `${circled(place)} ${found[id]}`).join("  ") };
}

/** 고른 문장과 유형으로 학습지 내용을 만듭니다. 만들 문항이 없는 유형은 뺍니다. */
export function buildWorksheet(profile: TextProfile, sentences: TextSentence[], options: Pick<SheetOptions, "types" | "ruby" | "spaced">): SheetSection[] {
  const readable = (token: { base: string; reading: string }) => KANJI.test(token.base) && profile.rubyCheck(token.base, token.reading)?.level !== "error";
  const sections: SheetSection[] = [];
  for (const type of sheetTypeKeys.filter(key => options.types.includes(key))) {
    const box: string[] = [];
    let items: SheetItem[] = [];
    if (type === "kanji") items = sentences.flatMap(sentence => {
      const words = rubyWords(sentence.ruby).filter(readable);
      if (!words.length) return [];
      let index = 0;
      const line: Line = [];
      chunksOf(sentence.ruby).forEach((chunk, chunkIndex) => {
        if (chunkIndex && options.spaced) line.push({ kind: "text", text: " " });
        for (const token of chunk) line.push(token.kind === "ruby" && readable(token) ? { kind: "mark", base: token.base, label: circled(index++) } : { kind: "text", text: tokenText(token) });
      });
      return [{ question: { kind: "line" as const, line, lines: 0 }, answer: words.map((word, position) => `${circled(position)} ${word.reading}`).join("  ") }];
    });
    if (type === "translation") items = sentences.filter(sentence => sentence.translation.trim()).map(sentence => ({ question: { kind: "line", line: lineOf(sentence.ruby, options), lines: 2 }, answer: sentence.translation.trim() }));
    if (type === "composition") items = sentences.filter(sentence => sentence.translation.trim()).map(sentence => ({ question: { kind: "korean", text: sentence.translation.trim(), lines: 2 }, answer: plainOf(sentence.ruby) }));
    if (type === "grammar") for (const sentence of sentences) {
      const blanked = blankLine(sentence, options);
      if (!blanked) continue;
      box.push(...blanked.terms);
      items.push({ question: { kind: "line", line: blanked.line, lines: 0 }, answer: blanked.answer });
    }
    if (type === "words") {
      const seen = new Set<string>();
      for (const word of sentences.flatMap(sentence => sentence.words)) {
        if (!word.word.trim() || !word.meaning.trim() || seen.has(word.word)) continue;
        seen.add(word.word);
        items.push({ question: { kind: "word", text: word.word, reading: word.reading !== word.word ? word.reading : "" }, answer: `${word.word}: ${word.meaning.trim()}` });
      }
    }
    if (items.length) sections.push({ type, instruction: sheetType(profile, type).instruction, box: [...new Set(box)], items });
  }
  return sections;
}

function lineHtml(profile: TextProfile, line: Line, mode: SheetMode) {
  return langHtml(profile.lang, line.map(piece => {
    if (piece.kind === "text") return escapeHtml(piece.text);
    if (piece.kind === "ruby") return `<ruby>${escapeHtml(piece.base)}<rt style="font-size:.5em">${escapeHtml(piece.reading)}</rt></ruby>`;
    if (piece.kind === "mark") return `<u>${escapeHtml(piece.base)}</u><sup style="font-size:.55em;font-family:sans-serif">${piece.label}</sup>`;
    return `<span style="display:inline-block;min-width:16mm;border-bottom:1px solid #222;text-align:center;font-family:sans-serif;font-size:.7em">${piece.label}</span>`;
  }).join(""), mode);
}
const lineText = (line: Line) => line.map(piece => piece.kind === "text" ? piece.text : piece.kind === "ruby" ? `${piece.base}(${piece.reading})` : piece.kind === "mark" ? `[${piece.base}]${piece.label}` : `( ${piece.label} )`).join("");

/** 학습지 HTML입니다. screen은 화면·인쇄용, clipboard는 한글·워드에 붙여 넣기 좋은 단순한 모양입니다. 모든 글은 이스케이프합니다. */
export function worksheetHtml(profile: TextProfile, sections: SheetSection[], options: Pick<SheetOptions, "title" | "answers">, mode: SheetMode) {
  const native = (html: string) => langHtml(profile.lang, html, mode);
  const screen = mode === "screen";
  const lines = (count: number) => screen
    ? Array.from({ length: count }, () => "<div style=\"height:9mm;border-bottom:1px solid #9a9a9a\"></div>").join("")
    : Array.from({ length: count }, () => "<p>→ ________________________________________________</p>").join("");
  const question = (item: SheetItem, number: number) => {
    const { question: q } = item;
    const label = `<b style="margin-right:2mm">${number}.</b>`;
    if (q.kind === "line") return `<div style="margin:0 0 4mm;break-inside:avoid"><p style="margin:0;font-size:14pt;line-height:2.1">${label}${lineHtml(profile, q.line, mode)}</p>${lines(q.lines)}</div>`;
    if (q.kind === "korean") return `<div style="margin:0 0 4mm;break-inside:avoid"><p style="margin:0;font-size:12pt;line-height:1.8">${label}${escapeHtml(q.text)}</p>${lines(q.lines)}</div>`;
    const word = native(`${escapeHtml(q.text)}${q.reading ? `<span style="font-size:.75em;color:#555">(${escapeHtml(q.reading)})</span>` : ""}`);
    return `<${screen ? "div style=\"display:inline-block;width:50%;margin:0 0 3mm;vertical-align:top\"" : "p"}>${label}<span style="font-size:13pt">${word}</span> : ________________</${screen ? "div" : "p"}>`;
  };
  const body = sections.map((section, index) => {
    const box = section.box.length ? `<p style="margin:2mm 0;padding:2mm 3mm;border:1px solid #555;font-size:12.5pt">〈보기〉 &nbsp;${section.box.map(term => native(escapeHtml(term))).join(" &nbsp;, &nbsp;")}</p>` : "";
    const items = section.items.map((item, number) => question(item, number + 1)).join("");
    return `<section style="margin-bottom:6mm"><h2 style="margin:0 0 2mm;font-size:12pt">${romans[index] ?? index + 1}. ${escapeHtml(section.instruction)}</h2>${box}${items}</section>`;
  }).join("");
  const answers = options.answers && sections.length
    ? answerSection(sections.map((section, index) => `<p style="margin:0 0 1mm;font-weight:700">${romans[index] ?? index + 1}. ${sheetType(profile, section.type).label}</p><ol style="margin:0 0 3mm;padding-left:7mm">${section.items.map(item => `<li style="margin-bottom:1mm">${section.type === "translation" || section.type === "words" ? escapeHtml(item.answer) : native(escapeHtml(item.answer))}</li>`).join("")}</ol>`).join(""), mode)
    : "";
  return clipboardWrap(sheetHead(options.title.trim() || `${profile.language} 학습지`) + body + answers, mode);
}

/** 학습지 일반 텍스트입니다. HTML을 붙일 수 없는 곳에서 씁니다. */
export function worksheetText(profile: TextProfile, sections: SheetSection[], options: Pick<SheetOptions, "title" | "answers">) {
  const blocks = textHead(options.title.trim() || `${profile.language} 학습지`);
  sections.forEach((section, index) => {
    const out = [`${romans[index] ?? index + 1}. ${section.instruction}`];
    if (section.box.length) out.push(`〈보기〉 ${section.box.join(", ")}`);
    section.items.forEach((item, number) => {
      const { question: q } = item;
      if (q.kind === "line") out.push(`${number + 1}. ${lineText(q.line)}`, ...Array.from({ length: q.lines }, () => "   → ________________________________"));
      else if (q.kind === "korean") out.push(`${number + 1}. ${q.text}`, ...Array.from({ length: q.lines }, () => "   → ________________________________"));
      else out.push(`${number + 1}. ${q.text}${q.reading ? `(${q.reading})` : ""} : ______________`);
    });
    blocks.push(out.join("\n"));
  });
  if (options.answers && sections.length) blocks.push(["[정답]", ...sections.map((section, index) => `${romans[index] ?? index + 1}. ${section.items.map((item, number) => `${number + 1}) ${item.answer}`).join("  ")}`)].join("\n"));
  return blocks.join("\n\n");
}
