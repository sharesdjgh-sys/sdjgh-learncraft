import { answerSection, clipboardWrap, escapeHtml, langHtml, objectParticle, romans, sheetHead, subjectParticle, textHead, type SheetLang, type SheetMode } from "@/features/language-sheet";

/* 일본문화·중국문화 수업이 함께 쓰는 주제 자료 형식과 활동지입니다. 과목마다 다른 점(언어, 읽기 표기, 주제)은 profiles.ts에 둡니다.
 * 현지어에는 {한자|읽기} 표기로 읽기를 답니다: 일본어는 후리가나({初詣|はつもうで}), 중국어는 병음({春节|chūn jié}). */

// ── 읽기 표기 ─────────────────────────────────────────────

export type RubyToken = { text: string; ruby?: string };
const HAN = /[\p{Script=Han}々〆ヶ]/u;

/** {한자|읽기}를 읽기 조각으로, 나머지는 글자 그대로 나눕니다. 띄어쓰기는 그대로 둡니다. */
export function rubyTokens(text: string): RubyToken[] {
  const tokens: RubyToken[] = [];
  for (const part of text.normalize("NFC").split(/(\{[^{}|]+\|[^{}|]*\})/u)) {
    if (!part) continue;
    const match = part.match(/^\{([^{}|]+)\|([^{}|]*)\}$/u);
    if (match) tokens.push({ text: match[1], ruby: match[2].trim() });
    else if (tokens.at(-1) && !tokens.at(-1)!.ruby) tokens.at(-1)!.text += part;
    else tokens.push({ text: part });
  }
  return tokens;
}
export const stripRuby = (text: string) => rubyTokens(text).map(token => token.text).join("");

/** 읽기를 단 HTML입니다. ruby가 꺼져 있으면 한자만 씁니다. */
export function rubyHtml(text: string, ruby: boolean) {
  return rubyTokens(text).map(token => token.ruby && ruby ? `<ruby>${escapeHtml(token.text)}<rt style="font-size:.5em">${escapeHtml(token.ruby)}</rt></ruby>` : escapeHtml(token.text)).join("");
}
export const rubyText = (text: string) => rubyTokens(text).map(token => token.ruby ? `${token.text}(${token.ruby})` : token.text).join("");

/** 읽기 조각 하나의 형식을 봅니다. 문제가 있으면 한국어 설명을, 없으면 null을 돌려줍니다. */
export type RubyCheck = (base: string, reading: string) => string | null;

export { objectParticle, subjectParticle } from "@/features/language-sheet";

/** 읽기 표기 형식을 점검합니다. requireRuby면 읽기가 없는 한자도 알립니다. */
export function rubyIssues(text: string, check: RubyCheck, requireRuby: boolean, rubyName = "읽기"): string[] {
  const issues: string[] = [];
  const tokens = rubyTokens(text);
  const braces = [...text].filter(char => "{}|".includes(char)).length - tokens.filter(token => token.ruby !== undefined).length * 3;
  if (braces) issues.push(`${rubyName} 괄호 {한자|읽기}가 맞지 않는 곳이 있습니다.`);
  const bad = tokens.flatMap(token => {
    if (token.ruby === undefined) return [];
    const problem = check(token.text, token.ruby);
    return problem ? [`${token.text}: ${problem}`] : [];
  });
  if (bad.length) issues.push(`${objectParticle(rubyName)} 확인해 주세요. ${bad.slice(0, 4).join(" / ")}${bad.length > 4 ? ` 외 ${bad.length - 4}곳` : ""}`);
  if (requireRuby) {
    const bare = [...new Set(tokens.filter(token => token.ruby === undefined).flatMap(token => [...token.text].filter(char => HAN.test(char))))];
    if (bare.length) issues.push(`${subjectParticle(rubyName)} 없는 한자: ${bare.slice(0, 8).join(" ")}`);
  }
  return issues;
}

// ── 주제 자료 ─────────────────────────────────────────────

export type CultureWord = { word: string; reading: string; meaning: string };
export type CultureQuiz = { statement: string; answer: boolean; note?: string };
/** native·phrase.native는 현지어(읽기 표기 포함), 나머지 설명은 한국어입니다. local·korea는 한국과 비교표의 한 줄입니다. */
export type CultureTopic = {
  id: string; category: string; title: string; native: string; when?: string;
  summary: string; points: string[]; words: CultureWord[]; phrase?: { native: string; ko: string };
  local: string; korea: string; quiz: CultureQuiz[]; think: string;
};
/** "낱말/읽기/뜻|…"를 낱말 목록으로 풉니다. */
export const topicWords = (spec: string): CultureWord[] => spec.split("|").map(item => {
  const [word, reading, meaning] = item.split("/");
  return { word, reading, meaning };
});

// ── 활동지 ────────────────────────────────────────────────

/** 활동지를 만드는 데 필요한 과목 정보입니다(profiles.ts의 CultureProfile 일부). */
export type SheetProfile = { subject: string; country: string; lang: SheetLang; rubyName: string; wordRuby: (word: string, reading: string) => string };

export const cultureSheetTypes = {
  words: { label: "낱말 익히기" },
  ox: { label: "O·X 퀴즈" },
  compare: { label: "한국과 비교" },
  think: { label: "생각해 보기" },
} as const;
export type CultureSheetType = keyof typeof cultureSheetTypes;
export const cultureSheetTypeKeys = Object.keys(cultureSheetTypes) as CultureSheetType[];
/** pictures는 주제마다 넣은 그림(data URL)입니다. 있으면 활동지 맨 앞에 주제 그림을 싣습니다. */
export type CultureSheetOptions = { title: string; types: CultureSheetType[]; ruby: boolean; answers: boolean; pictures?: Record<string, string> };
const isImageUrl = (url: string) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url);
const instructionOf = (type: CultureSheetType, profile: SheetProfile, ruby: boolean) => ({
  words: ruby ? "다음 낱말의 뜻을 쓰시오." : "다음 낱말의 읽는 법과 뜻을 쓰시오.",
  ox: "맞으면 O, 틀리면 X를 쓰시오.",
  compare: `${profile.country}의 모습을 읽고, 한국은 어떤지 빈칸에 쓰시오.`,
  think: "다음 물음에 대한 자기 생각을 쓰시오.",
})[type];

/** 고른 주제로 활동지를 만듭니다. ruby를 켜면 낱말 문항에 읽기를 달고 뜻만 묻습니다. */
export function cultureSheetHtml(profile: SheetProfile, topics: CultureTopic[], options: CultureSheetOptions, mode: SheetMode) {
  const types = cultureSheetTypeKeys.filter(type => options.types.includes(type));
  const native = (html: string) => langHtml(profile.lang, html, mode);
  const border = "border:1px solid #555;padding:2mm";
  const answers: string[] = [];
  const sections = types.map((type, index) => {
    const heading = `<h2 style="margin:0 0 2mm;font-size:12pt">${romans[index]}. ${escapeHtml(instructionOf(type, profile, options.ruby))}</h2>`;
    if (type === "words") {
      const list = topics.flatMap(topic => topic.words);
      answers.push(`<p style="margin:0 0 3mm;line-height:1.9"><b>${romans[index]}. ${cultureSheetTypes[type].label}</b><br>${list.map((word, number) => `${number + 1}) ${native(escapeHtml(word.word))}(${native(escapeHtml(word.reading))}) ${escapeHtml(word.meaning)}`).join(" &nbsp; ")}</p>`);
      const item = (word: CultureWord, number: number) => {
        const shown = options.ruby ? profile.wordRuby(word.word, word.reading) : escapeHtml(word.word);
        return `<b style="margin-right:2mm">${number}.</b><span style="font-size:14pt">${native(shown)}</span> ${options.ruby ? "뜻: ____________" : "읽기: __________ 뜻: __________"}`;
      };
      return heading + (mode === "screen"
        ? list.map((word, number) => `<div style="display:inline-block;width:50%;margin:0 0 3.5mm;vertical-align:top">${item(word, number + 1)}</div>`).join("")
        : list.map((word, number) => `<p>${item(word, number + 1)}</p>`).join(""));
    }
    if (type === "ox") {
      const list = topics.flatMap(topic => topic.quiz);
      answers.push(`<p style="margin:0 0 3mm;line-height:1.9"><b>${romans[index]}. ${cultureSheetTypes[type].label}</b><br>${list.map((quiz, number) => `${number + 1}) ${quiz.answer ? "O" : "X"}${quiz.note ? ` (${escapeHtml(quiz.note)})` : ""}`).join("<br>")}</p>`);
      return heading + list.map((quiz, number) => `<p style="margin:0 0 2.5mm;font-size:11.5pt;line-height:1.7"><b style="margin-right:2mm">${number + 1}.</b>${escapeHtml(quiz.statement)} <span style="white-space:nowrap">( &nbsp;&nbsp;&nbsp; )</span></p>`).join("");
    }
    if (type === "compare") {
      answers.push(`<p style="margin:0 0 3mm;line-height:1.9"><b>${romans[index]}. ${cultureSheetTypes[type].label}</b> (예시 답)<br>${topics.map((topic, number) => `${number + 1}) ${escapeHtml(topic.title)}: ${escapeHtml(topic.korea)}`).join("<br>")}</p>`);
      const rows = topics.map(topic => `<tr><td style="${border};width:24%;font-weight:700">${escapeHtml(topic.title)}<br><span style="font-weight:400">${native(rubyHtml(topic.native, options.ruby))}</span></td><td style="${border};width:38%;font-size:10.5pt">${escapeHtml(topic.local)}</td><td style="${border};height:16mm"></td></tr>`).join("");
      return heading + `<table style="width:100%;border-collapse:collapse;margin:0 0 4mm"><tr><th style="${border};background:#f2f2f2">주제</th><th style="${border};background:#f2f2f2">${escapeHtml(profile.country)}</th><th style="${border};background:#f2f2f2">한국</th></tr>${rows}</table>`;
    }
    const lines = mode === "screen" ? Array.from({ length: 3 }, () => "<div style=\"height:9mm;border-bottom:1px solid #9a9a9a\"></div>").join("") : "<p>→ ________________________________________________</p>".repeat(2);
    return heading + topics.map((topic, number) => `<div style="margin:0 0 4mm;break-inside:avoid"><p style="margin:0;font-size:11.5pt"><b style="margin-right:2mm">${number + 1}.</b>${escapeHtml(topic.think)}</p>${lines}</div>`).join("");
  });
  const pictured = topics.filter(topic => options.pictures?.[topic.id] && isImageUrl(options.pictures[topic.id]));
  const pictures = pictured.length
    ? `<section style="margin-bottom:6mm">${pictured.map(topic => `<figure style="display:inline-block;width:${pictured.length === 1 ? "100%" : "48%"};margin:0 1% 3mm;vertical-align:top;break-inside:avoid;text-align:center"><img src="${options.pictures![topic.id]}" alt="${escapeHtml(topic.title)}" style="max-width:100%;max-height:${pictured.length === 1 ? "110mm" : "62mm"};border:1px solid #ccc"><figcaption style="font-size:10pt;margin-top:1mm">${escapeHtml(topic.title)} ${native(rubyHtml(topic.native, false))}</figcaption></figure>`).join("")}</section>`
    : "";
  const body = pictures + sections.map(section => `<section style="margin-bottom:6mm">${section}</section>`).join("");
  const answerPart = options.answers && answers.length ? answerSection(answers.join(""), mode) : "";
  return clipboardWrap(sheetHead(options.title.trim() || `${profile.subject} 활동지${topics.length === 1 ? ` · ${topics[0].title}` : ""}`) + body + answerPart, mode);
}

export function cultureSheetText(profile: SheetProfile, topics: CultureTopic[], options: CultureSheetOptions) {
  const blocks = textHead(options.title.trim() || `${profile.subject} 활동지`);
  const answers: string[] = [];
  cultureSheetTypeKeys.filter(type => options.types.includes(type)).forEach((type, index) => {
    const head = `${romans[index]}. ${instructionOf(type, profile, options.ruby)}`;
    if (type === "words") {
      const list = topics.flatMap(topic => topic.words);
      blocks.push([head, ...list.map((word, number) => `${number + 1}. ${options.ruby && word.reading !== word.word ? `${word.word}(${word.reading}) 뜻: ________` : `${word.word} 읽기: ______ 뜻: ______`}`)].join("\n"));
      answers.push(`${romans[index]}. ${list.map((word, number) => `${number + 1}) ${word.reading} ${word.meaning}`).join("  ")}`);
    }
    if (type === "ox") {
      const list = topics.flatMap(topic => topic.quiz);
      blocks.push([head, ...list.map((quiz, number) => `${number + 1}. ${quiz.statement} (   )`)].join("\n"));
      answers.push(`${romans[index]}. ${list.map((quiz, number) => `${number + 1}) ${quiz.answer ? "O" : "X"}`).join("  ")}`);
    }
    if (type === "compare") {
      blocks.push([head, `주제 | ${profile.country} | 한국`, ...topics.map(topic => `${topic.title} ${rubyText(topic.native)} | ${topic.local} | ____________`)].join("\n"));
      answers.push(`${romans[index]}. (예시) ${topics.map(topic => `${topic.title}: ${topic.korea}`).join(" / ")}`);
    }
    if (type === "think") blocks.push([head, ...topics.map((topic, number) => `${number + 1}. ${topic.think}\n   → ________________________________`)].join("\n"));
  });
  if (options.answers && answers.length) blocks.push(["[정답]", ...answers].join("\n"));
  return blocks.join("\n\n");
}
