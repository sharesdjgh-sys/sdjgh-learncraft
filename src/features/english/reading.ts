/* 영어: 교사가 붙여 넣은 지문으로 독해 활동지(끊어 읽기·순서 배열·문장 넣기·무관한 문장·빈칸·요지)를 만들고, 기능어를 뺀 낱말 빈도를 셉니다.
   교과서 본문은 넣지 않고, 기본 지문은 직접 쓴 짧은 글입니다. */
import { clipboardWrap, sheetHead, textHead, type SheetMode } from "@/features/language-sheet";
import { blankLine, circled, escapeHtml, problem, seededRandom, sheetTable, shuffled, type SheetProblem, type SheetSection } from "./sheet";

export const SAMPLE_PASSAGE = `Have you ever bought something just because it was on sale? Many shoppers do. Stores know that the word "sale" makes people feel they are saving money. However, buying things you do not need is not really saving. For example, a shirt that costs $10.50 instead of $20 is only a good deal if you actually wear it. Before you buy something, ask yourself a simple question: "Would I buy this at full price?" If the answer is no, you probably do not need it. Smart consumers think about their needs, not just the price.`;

/* ───── 문장 나누기 ───── */

// 마침표로 끝나도 문장이 끝나지 않는 약어입니다. no는 뒤에 숫자가 올 때(No. 5)만 약어로 봅니다.
// 문장 끝에도 자주 오는 약어는 다음 글이 대문자로 시작하면 문장이 끝난 것으로 봅니다(at 5 p.m. He ...).
const SENTENCE_END_ABBREVIATIONS = ["etc", "a.m", "p.m"];
const ABBREVIATIONS = ["mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "e.g", "i.e", "a.m", "p.m", "u.s", "u.k", "no", "nos", "fig", "approx", "inc", "ltd", "co", "mt"];

/** 지문을 문장으로 나눕니다. 약어(Mr. e.g.), 소수점(3.5), 따옴표·괄호로 끝나는 문장, 줄바꿈을 처리합니다. */
export function splitSentences(text: string): string[] {
  // PDF·한글에서 복사해 문장 중간에서 줄이 바뀐 곳(끝 부호 없이 소문자로 이어짐)은 한 줄로 잇습니다.
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/([^.!?:"'”’)\]\n]) ?\n(?=[a-z(])/g, "$1 ").trim();
  if (!clean) return [];
  const sentences: string[] = [];
  let start = 0;
  for (let at = 0; at < clean.length; at += 1) {
    const char = clean[at];
    if (char === "\n") {
      // 빈 줄이나 줄바꿈은 문단이 바뀌는 곳으로 봅니다.
      const piece = clean.slice(start, at).trim();
      if (piece) sentences.push(piece);
      start = at + 1;
      continue;
    }
    if (!".!?".includes(char)) continue;
    // 3.5, $10.50 같은 소수점
    if (char === "." && /\d/.test(clean[at - 1] ?? "") && /\d/.test(clean[at + 1] ?? "")) continue;
    // 문장 부호가 이어지면(?! ...) 끝까지 봅니다.
    let end = at + 1;
    while (end < clean.length && ".!?".includes(clean[end])) end += 1;
    // 닫는 따옴표·괄호는 앞 문장에 붙입니다.
    while (end < clean.length && "\"'”’)]".includes(clean[end])) end += 1;
    const next = clean.slice(end);
    if (next && !/^\s/.test(next)) { at = end - 1; continue; }
    if (char === ".") {
      const word = (clean.slice(start, at).match(/([A-Za-z.]+)$/)?.[1] ?? "").toLowerCase();
      if (word === "no" || word === "nos") { if (/^\s*\d/.test(next)) continue; }
      else if (ABBREVIATIONS.includes(word) && !(SENTENCE_END_ABBREVIATIONS.includes(word) && /^\s+[A-Z]/.test(next))) continue;
      // J. K. Rowling 처럼 대문자 한 글자 + 마침표가 이어지면 이름 약자로 봅니다(Plan B. We ...는 문장 끝).
      const before = clean.slice(start, at);
      if (/(^|\s)[A-Z]$/.test(before) && (/^\s+[A-Z]\./.test(next) || /(^|\s)[A-Z]\.\s?[A-Z]$/.test(before))) continue;
    }
    // 다음 글이 소문자로 시작하면 아직 문장 안입니다(예: "Wow!" she said.).
    if (/^\s+[a-z]/.test(next)) { at = end - 1; continue; }
    sentences.push(clean.slice(start, end).trim());
    start = end;
    at = end - 1;
  }
  const rest = clean.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences.filter(Boolean);
}

/* ───── 낱말 빈도 ───── */

// 기능어(관사·대명사·전치사·접속사·조동사·be동사 등)는 어휘 목록에서 뺍니다.
export const STOP_WORDS = new Set(("a an the this that these those i me my mine you your yours he him his she her hers it its we us our ours they them their theirs " +
  "myself yourself himself herself itself ourselves themselves who whom whose which what when where why how " +
  "am is are was were be been being do does did done doing have has had having will would shall should can could may might must " +
  "and or but so nor yet if because although though while as than then also too very just not no yes " +
  "of in on at to for from by with about into onto over under up down out off through after before during between among against without within " +
  "all any some each every both either neither many much more most few little less least other another such own same " +
  "there here now only even still again ever never always often sometimes really quite rather ll ve re s t d m don doesn didn isn aren wasn weren can't won't").split(/\s+/));

/** 소문자로 바꾸고 소유격 's를 뗍니다. */
const normalizeWord = (word: string) => word.toLowerCase().replace(/[’']/g, "'").replace(/'s$/, "");
/** 지문의 낱말(기능어 제외)과 나온 수입니다. 많이 나온 차례, 같으면 처음 나온 차례입니다.
    축약형(don't, I'm)은 기능어로 보아 빼고, 원형이 함께 나온 -s 복수형(consumers)은 원형(consumer)으로 합칩니다. */
export function wordFrequency(text: string, options: { keepStopWords?: boolean } = {}) {
  const counts = new Map<string, { word: string; count: number; first: number }>();
  const matches = text.match(/[A-Za-z]+(?:[-'’][A-Za-z]+)*/g) ?? [];
  matches.forEach((raw, index) => {
    const word = normalizeWord(raw);
    if (word.length < 2 || (!options.keepStopWords && (STOP_WORDS.has(word) || word.includes("'")))) return;
    const item = counts.get(word) ?? { word, count: 0, first: index };
    item.count += 1;
    counts.set(word, item);
  });
  for (const [word, item] of counts) {
    const base = word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : "";
    const target = base && counts.get(base);
    if (!target || target === item) continue;
    target.count += item.count;
    target.first = Math.min(target.first, item.first);
    counts.delete(word);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.first - b.first);
}

/** 고른 낱말(없으면 많이 나온 낱말)의 뜻 쓰기 표입니다. */
export function vocabListHtml(words: { word: string; count: number }[], title: string, mode: SheetMode) {
  const rows = words.map((item, index) => [String(index + 1), `<b>${escapeHtml(item.word)}</b>`, String(item.count), ""]);
  return clipboardWrap(sheetHead(title.trim() || "지문 어휘") + sheetTable(["번호", "낱말", "나온 수", "뜻"], rows, { widths: ["9%", "30%", "13%", "48%"] }), mode);
}
export const vocabListText = (words: { word: string; count: number }[], title: string) =>
  [...textHead(title.trim() || "지문 어휘"), "", ...words.map((item, index) => `${index + 1}. ${item.word} (${item.count}) ______`)].join("\n");

/* ───── 빈칸 ───── */

/** [낱말]로 묶은 곳을 나눕니다. */
export function bracketParts(text: string) {
  const parts: { text: string; blank: boolean }[] = [];
  const pattern = /\[([^[\]]{1,60})\]/g;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), blank: false });
    parts.push({ text: match[1], blank: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), blank: false });
  return parts;
}
export const stripBrackets = (text: string) => text.replace(/\[([^[\]]{1,60})\]/g, "$1");

/* ───── 활동지 ───── */

export type ReadingAsk = "chunk" | "order" | "insert" | "irrelevant" | "blank" | "main" | "vocab";
export const readingAsks: Record<ReadingAsk, string> = {
  chunk: "끊어 읽기·해석", order: "글의 순서", insert: "문장 넣기", irrelevant: "무관한 문장", blank: "[낱말] 빈칸", main: "요지·제목 쓰기", vocab: "어휘 목록",
};
export type ReadingOptions = {
  asks: ReadingAsk[]; seed: number;
  /** 순서 배열: 몇 번째 문장까지를 주어진 글로 둘지(1부터) */
  orderIntro: number;
  /** 문장 넣기: 뺄 문장 번호(1부터, 0이면 seed로 고름) */
  insertAt: number;
  /** 무관한 문장: 교사가 쓴 문장과 넣을 자리(1부터 문장 뒤) */
  irrelevant: string; irrelevantAfter: number;
  /** 어휘 목록 낱말 수와 교사가 넣은 뜻 */
  vocabCount: number; meanings: Record<string, string>;
};
const box = (html: string) => `<div style="border:1px solid #555;border-radius:1.5mm;padding:2.5mm 3.5mm;margin:1mm 0 2mm;line-height:1.75">${html}</div>`;
const sentenceText = (sentence: string) => escapeHtml(stripBrackets(sentence));

/** 문장을 세 덩어리로 나눕니다(주어진 글 뒤의 문장 수를 되도록 고르게). */
export function orderChunks(sentences: string[], intro: number) {
  const head = sentences.slice(0, Math.max(1, Math.min(intro, sentences.length - 3)));
  const rest = sentences.slice(head.length);
  const size = Math.floor(rest.length / 3);
  const extra = rest.length % 3;
  const chunks: string[][] = [];
  let at = 0;
  for (let index = 0; index < 3; index += 1) { const length = size + (index < extra ? 1 : 0); chunks.push(rest.slice(at, at + length)); at += length; }
  return { head, chunks };
}

/** 지문과 설정으로 독해 활동지 묶음을 만듭니다. 문장이 모자란 활동은 건너뜁니다. */
export function readingSections(passage: string, options: ReadingOptions): SheetSection[] {
  const sentences = splitSentences(passage);
  if (!sentences.length) return [];
  const random = seededRandom(options.seed * 71 + 9);
  const sections: SheetSection[] = [];
  const whole = sentences.map(sentenceText).join(" ");
  for (const ask of options.asks) {
    const problems: SheetProblem[] = [];
    let intro: SheetSection["intro"];
    if (ask === "chunk") {
      const rows = sentences.map((sentence, index) => `<div style="margin:0 0 2.5mm;break-inside:avoid"><div>${circled(index)} ${sentenceText(sentence)}</div><div style="border-bottom:1px solid #999;height:7mm"></div></div>`).join("");
      intro = { html: `<p style="margin:0 0 2mm;font-size:10pt">의미 단위마다 / 로 끊어 읽고, 아래 줄에 우리말로 해석하시오.</p>${rows}`, text: sentences.map((sentence, index) => `${index + 1}. ${stripBrackets(sentence)}\n   해석: ______`).join("\n") };
    } else if (ask === "order" && sentences.length >= 4) {
      const { head, chunks } = orderChunks(sentences, options.orderIntro);
      const letters = ["(A)", "(B)", "(C)"];
      const order = shuffled([0, 1, 2], Math.floor(random() * 1e9));
      // 섞은 뒤 (A)(B)(C)가 원래 순서 그대로면 한 번 더 돌립니다.
      if (order.every((value, index) => value === index)) order.push(order.shift()!);
      const shown = order.map((chunk, index) => `<p style="margin:1mm 0"><b>${letters[index]}</b> ${chunks[chunk].map(sentenceText).join(" ")}</p>`).join("");
      const answer = [0, 1, 2].map(chunk => letters[order.indexOf(chunk)]).join(" − ");
      problems.push(problem(`주어진 글 다음에 이어질 글의 순서로 가장 알맞은 것을 쓰시오.${box(head.map(sentenceText).join(" "))}${shown}`, `${answer}`, { space: 6 }));
    } else if (ask === "insert" && sentences.length >= 6) {
      // 첫 문장은 두고, 뺀 문장 뒤로 ①~⑤ 자리를 고르게 둡니다.
      const target = options.insertAt >= 2 && options.insertAt <= sentences.length ? options.insertAt - 1 : 1 + Math.floor(random() * (sentences.length - 1));
      const removed = sentences[target];
      const rest = sentences.filter((_, index) => index !== target);
      // 자리 g(1부터)는 rest[g − 1] 문장 뒤입니다. 마지막 문장 뒤까지 자리가 rest.length개 있어요.
      const gaps = rest.length;
      // 뺀 문장의 원래 자리를 포함해 연속한 다섯 자리를 고릅니다.
      const answerGap = target;
      const first = Math.max(1, Math.min(answerGap - Math.floor(random() * 5), gaps - 4));
      const marks = new Map<number, number>();
      for (let index = 0; index < Math.min(5, gaps); index += 1) marks.set(first + index, index);
      const body = rest.map((sentence, index) => `${sentenceText(sentence)}${marks.has(index + 1) ? ` <b>( ${circled(marks.get(index + 1)!)} )</b>` : ""}`).join(" ");
      problems.push(problem(`글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 알맞은 곳을 고르시오.${box(`<b>${sentenceText(removed)}</b>`)}${box(body)}`, `${circled(marks.get(answerGap) ?? 0)}`, { space: 4 }));
    } else if (ask === "irrelevant" && options.irrelevant.trim() && sentences.length >= 5) {
      const after = Math.max(1, Math.min(options.irrelevantAfter || 3, sentences.length - 1));
      const list = [...sentences.slice(0, after), options.irrelevant.trim(), ...sentences.slice(after)];
      // 첫 문장 다음부터 다섯 문장에 번호를 붙이되, 넣은 문장이 반드시 들어가게 합니다.
      const firstNumbered = Math.max(1, Math.min(after - Math.floor(random() * 4), list.length - 5));
      const numbered = Array.from({ length: Math.min(5, list.length - firstNumbered) }, (_, index) => firstNumbered + index);
      const body = list.map((sentence, index) => `${numbered.includes(index) ? `${circled(numbered.indexOf(index))} ` : ""}${sentenceText(sentence)}`).join(" ");
      problems.push(problem(`다음 글에서 전체 흐름과 관계없는 문장을 고르시오.${box(body)}`, `${circled(numbered.indexOf(after))}`, { space: 4 }));
    } else if (ask === "blank") {
      const words = sentences.flatMap(sentence => bracketParts(sentence).filter(part => part.blank).map(part => part.text));
      if (words.length) {
        let index = 0;
        // ⑩ 다음은 (11)처럼 괄호 숫자로 적습니다.
        const mark = (at: number) => at < 10 ? `(${circled(at)})` : `(${at + 1})`;
        const body = sentences.map(sentence => bracketParts(sentence).map(part => part.blank ? `<b>${mark(index++)}</b>${blankLine("20mm")}` : escapeHtml(part.text)).join("")).join(" ");
        problems.push(problem(`빈칸에 알맞은 말을 쓰시오.${box(body)}`, words.map((word, at) => `${mark(at)} ${escapeHtml(word)}`).join("&nbsp;&nbsp; "), { space: 4 }));
      }
    } else if (ask === "main") {
      problems.push(problem(`다음 글의 요지를 우리말로 한 문장으로 쓰시오.${box(whole)}`, "학생마다 표현이 다를 수 있어요. 글의 핵심 주장을 담았는지 봐 주세요.", { space: 16 }));
      problems.push(problem("위 글의 제목을 영어로 쓰시오.", "학생마다 다를 수 있어요. 글 전체 내용을 담은 제목인지 봐 주세요.", { space: 10 }));
    } else if (ask === "vocab") {
      const words = wordFrequency(sentences.map(stripBrackets).join(" ")).slice(0, options.vocabCount);
      if (words.length) {
        const rows = words.map((item, index) => `<tr><td style="border:1px solid #666;padding:1.2mm 2mm;width:8%;text-align:center">${index + 1}</td><td style="border:1px solid #666;padding:1.2mm 2mm;width:32%"><b>${escapeHtml(item.word)}</b></td><td style="border:1px solid #666;padding:1.2mm 2mm"></td></tr>`).join("");
        problems.push(problem(`지문에 나온 다음 낱말의 뜻을 쓰시오.<table style="border-collapse:collapse;width:100%;margin:1.5mm 0;font-size:10pt"><tr><th style="border:1px solid #666;background:#f1f1f1;padding:1.2mm">번호</th><th style="border:1px solid #666;background:#f1f1f1;padding:1.2mm">낱말</th><th style="border:1px solid #666;background:#f1f1f1;padding:1.2mm">뜻</th></tr>${rows}</table>`,
          words.map((item, index) => `${index + 1}. ${escapeHtml(item.word)} ${escapeHtml(options.meanings[item.word]?.trim() || "(뜻을 넣어 주세요)")}`).join("<br>")));
      }
    }
    if (problems.length || intro) sections.push({ heading: readingAsks[ask], problems, intro });
  }
  return sections;
}
