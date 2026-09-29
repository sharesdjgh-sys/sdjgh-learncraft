/* 국어 · 문학: 교사가 넣은 작품(갈래·제목·작가·본문)으로 작품 분석 학습지를 만듭니다. 본문에서 [시어]로 묶은 곳은 빈칸 문제가 됩니다.
   교과서 작품은 저작권 때문에 넣지 않고, 예시는 저작권이 끝난 작품만 둡니다. */
import { escapeHtml, plainText, problem, type SheetProblem, type SheetSection } from "./sheet";

export type WorkGenre = "poem" | "classic" | "novel" | "drama" | "essay";
export const workGenres: Record<WorkGenre, string> = { poem: "현대시", classic: "고전 시가", novel: "소설", drama: "극", essay: "수필" };
/** 행이 있는 갈래(시)인지 봅니다. 시는 행·연 번호를, 나머지는 문단 번호를 붙입니다. */
export const isVerse = (genre: WorkGenre) => genre === "poem" || genre === "classic";

export type WorkAsk =
  | "speaker" | "emotion" | "words" | "device" | "rhythm" | "structure"
  | "character" | "event" | "setting" | "pov" | "conflict" | "narration"
  | "stage" | "dialogue" | "experience"
  | "theme" | "compare" | "rewrite";
export const workAsks: Record<WorkAsk, string> = {
  speaker: "화자와 상황", emotion: "정서와 태도", words: "시어·시구의 의미", device: "표현법과 효과", rhythm: "운율", structure: "시상 전개",
  character: "인물", event: "사건 흐름", setting: "배경", pov: "서술자·시점", conflict: "갈등", narration: "서술상 특징",
  stage: "해설·지시문", dialogue: "대사로 본 인물", experience: "글쓴이의 경험과 깨달음",
  theme: "주제", compare: "다른 작품과 비교", rewrite: "바꿔 쓰기(재구성)",
};
/** 갈래마다 고를 수 있는 질문입니다. */
export const GENRE_ASKS: Record<WorkGenre, WorkAsk[]> = {
  poem: ["speaker", "emotion", "words", "device", "rhythm", "structure", "theme", "compare", "rewrite"],
  classic: ["speaker", "emotion", "words", "device", "rhythm", "structure", "theme", "compare", "rewrite"],
  novel: ["character", "event", "setting", "pov", "conflict", "narration", "theme", "compare", "rewrite"],
  drama: ["stage", "dialogue", "character", "conflict", "theme", "compare", "rewrite"],
  essay: ["experience", "device", "structure", "theme", "compare", "rewrite"],
};
export const DEFAULT_ASKS: Record<WorkGenre, WorkAsk[]> = {
  poem: ["speaker", "emotion", "words", "device", "theme"], classic: ["speaker", "emotion", "words", "device", "theme"],
  novel: ["character", "pov", "conflict", "theme"], drama: ["stage", "dialogue", "conflict", "theme"], essay: ["experience", "device", "theme"],
};
const ASK_TEXT: Record<WorkAsk, string> = {
  speaker: "이 작품의 화자는 누구이며, 어떤 상황에 놓여 있는지 쓰시오.",
  emotion: "화자의 정서와 태도가 드러난 시구를 찾아 쓰고, 그 정서와 태도를 설명하시오.",
  words: "작품에서 중요한 시어·시구를 하나 골라, 그것이 뜻하는 바를 작품의 흐름과 관련지어 쓰시오.",
  device: "작품에 쓰인 표현법을 하나 찾아 쓰고, 그 표현이 주는 효과를 설명하시오.",
  rhythm: "이 작품의 운율을 이루는 요소(음보·반복·음성 상징어 등)를 찾아 쓰시오.",
  structure: "시상이 어떻게 전개되는지(시간·공간의 이동, 선경후정, 수미상관 등) 설명하시오.",
  character: "중심인물의 성격과 그것이 드러나는 부분을 찾아 쓰시오.",
  event: "작품 속 사건의 흐름을 순서대로 간추려 쓰시오.",
  setting: "작품의 시간적·공간적 배경을 쓰고, 배경이 하는 역할을 설명하시오.",
  pov: "서술자는 작품 안에 있는지 밖에 있는지 밝히고, 이 작품의 시점과 그 효과를 쓰시오.",
  conflict: "작품에 나타난 갈등(인물과 인물, 인물과 사회 등)을 쓰고, 갈등이 어떻게 전개되는지 설명하시오.",
  narration: "이 작품의 서술상 특징(서술자의 개입, 대화, 요약·장면 제시 등)을 찾아 쓰시오.",
  stage: "해설이나 지시문을 하나 골라, 그것이 무대에서 하는 역할을 설명하시오.",
  dialogue: "인물의 대사를 하나 골라, 그 대사에서 드러나는 인물의 성격이나 심리를 쓰시오.",
  experience: "글쓴이가 겪은 일과 그 일로 얻은 깨달음을 간추려 쓰시오.",
  theme: "이 작품의 주제를 한 문장으로 쓰시오.",
  compare: "이 작품과 주제나 표현이 비슷하거나 다른 작품을 하나 골라 공통점과 차이점을 비교하시오.",
  rewrite: "이 작품의 한 장면이나 내용을 다른 갈래나 매체(시→이야기, 소설→시나리오, 웹툰 등)로 바꿔 쓰시오.",
};
const OPEN = "학생마다 답이 다를 수 있어요. 작품 속 근거를 들어 썼는지 봐 주세요.";

export type LiteraryWork = {
  genre: WorkGenre; title: string; author: string; origin: string; body: string;
  /** 질문별 참고 답입니다. 비워 두면 채점 안내만 실립니다. */
  hints: Partial<Record<WorkAsk, string>>;
};

/** 저작권이 끝난 작품입니다. 현대시는 교과서에 흔히 실리는 현대 표기, 고전 시가는 현대어로 옮긴 것입니다. */
export const WORK_PRESETS: LiteraryWork[] = [
  {
    genre: "poem", title: "진달래꽃", author: "김소월", origin: "『진달래꽃』(1925)",
    body: "나 보기가 역겨워\n가실 때에는\n말없이 고이 보내 드리우리다\n\n영변에 약산\n[진달래꽃]\n아름 따다 가실 길에 뿌리우리다\n\n가시는 걸음걸음\n놓인 그 꽃을\n사뿐히 [즈려밟고] 가시옵소서\n\n나 보기가 역겨워\n가실 때에는\n죽어도 아니 [눈물] 흘리우리다",
    hints: {
      speaker: "떠나는 임을 보내야 하는 여인(서정적 자아)이 이별을 앞두고 있다.",
      emotion: "이별의 슬픔을 겉으로 드러내지 않고 참고 견디며(절제·인종), 임을 축복하려는 태도를 보인다.",
      words: "진달래꽃은 화자의 분신이자 임에 대한 사랑과 정성을 나타낸다.",
      device: "‘죽어도 아니 눈물 흘리우리다’는 반어법으로, 슬픔을 오히려 강하게 드러낸다. 1연과 4연을 되풀이한 수미상관으로 안정감과 여운을 준다.",
      rhythm: "7·5조의 3음보 민요조 율격, ‘-우리다’의 반복",
      structure: "이별의 상황 가정(1연) → 축복(2연) → 희생과 헌신(3연) → 슬픔의 극복 의지(4연), 수미상관",
      theme: "이별의 정한과 그 승화",
    },
  },
  {
    genre: "poem", title: "서시", author: "윤동주", origin: "『하늘과 바람과 별과 시』(1948)",
    body: "죽는 날까지 [하늘]을 우러러\n한 점 부끄럼이 없기를,\n잎새에 이는 [바람]에도\n나는 괴로워했다.\n[별]을 노래하는 마음으로\n모든 죽어 가는 것을 사랑해야지\n그리고 나한테 주어진 [길]을\n걸어가야겠다.\n\n오늘 밤에도 별이 바람에 스치운다.",
    hints: {
      speaker: "부끄러움 없는 삶을 바라며 자신을 돌아보는 성찰적 화자",
      emotion: "작은 흠에도 괴로워하는 섬세한 양심과, 주어진 길을 가겠다는 의지를 보인다.",
      words: "하늘은 삶의 기준(절대적 가치), 바람은 시련·흔들림, 별은 희망과 이상, 길은 화자가 걸어가야 할 운명·사명을 뜻한다.",
      device: "‘별’과 ‘바람’의 대비(상징), 마지막 행의 현재형 서술로 시련 속의 현실을 드러낸다.",
      structure: "과거(부끄럼 없기를 바란 삶) → 미래(사랑과 다짐) → 현재(시련의 현실)",
      theme: "부끄러움 없는 삶에 대한 소망과 의지",
    },
  },
  {
    genre: "classic", title: "이화에 월백하고", author: "이조년", origin: "평시조 — 현대어로 옮김",
    body: "[이화]에 월백하고 은한이 삼경인 제\n일지 춘심을 [자규]야 알랴마는\n다정도 병인 양하여 잠 못 들어 하노라",
    hints: {
      speaker: "봄밤에 잠 못 이루는 화자",
      emotion: "봄밤의 정취 속에서 느끼는 애상적 정서(춘심)",
      words: "이화(배꽃)·월백(흰 달빛)·은한(은하수)은 흰빛의 봄밤 정경을, 자규(소쩍새)의 울음은 화자의 애상을 돋운다.",
      device: "흰빛의 시각적 심상과 자규 울음의 청각적 심상을 어울러 봄밤의 애상을 드러낸다.",
      rhythm: "3장 6구 4음보의 평시조, 종장 첫 음보 3음절(다정도)",
      structure: "초장·중장의 봄밤 정경(선경) → 종장의 정서(후정)",
      theme: "봄밤의 애상적 정서(춘심)",
    },
  },
  {
    genre: "classic", title: "이 몸이 죽고 죽어", author: "정몽주", origin: "평시조(「단심가」) — 현대어로 옮김",
    body: "이 몸이 죽고 죽어 일백 번 고쳐 죽어\n백골이 진토되어 넋이라도 있고 없고\n임 향한 [일편단심]이야 가실 줄이 있으랴",
    hints: {
      speaker: "고려 왕조에 대한 충절을 지키려는 신하",
      emotion: "죽음을 무릅쓰고라도 절개를 지키겠다는 굳은 의지",
      words: "‘임’은 고려의 임금, ‘일편단심’은 변하지 않는 충성심이다.",
      device: "‘죽고 죽어 일백 번 고쳐 죽어’의 반복과 점층, 종장의 설의법으로 굳은 의지를 강조한다.",
      theme: "고려 왕조에 대한 변함없는 충절",
      compare: "이방원의 「하여가」(함께 어울려 살자는 회유)에 대한 답가로 알려져 있다.",
    },
  },
  {
    genre: "classic", title: "동짓달 기나긴 밤을", author: "황진이", origin: "평시조 — 현대어로 옮김",
    body: "동짓달 기나긴 밤을 한 허리를 베어 내어\n봄바람 이불 아래 [서리서리] 넣었다가\n정든 임 오신 날 밤이거든 [굽이굽이] 펴리라",
    hints: {
      speaker: "임을 기다리는 여인",
      emotion: "임에 대한 그리움과 임과 오래 함께하고 싶은 소망",
      words: "‘동짓달 기나긴 밤’은 임이 없는 외로운 시간, ‘정든 임 오신 날 밤’은 임과 함께하는 짧은 시간이다.",
      device: "추상적인 시간(밤)을 베고 넣고 펴는 구체적인 사물처럼 표현하였다. ‘서리서리’, ‘굽이굽이’ 같은 음성 상징어를 썼다.",
      theme: "임을 기다리는 그리움과 사랑",
    },
  },
  {
    genre: "classic", title: "공무도하가", author: "백수 광부의 아내(전함)", origin: "고대 가요 — 한역 시가 현대어 풀이",
    body: "임이여, 그 [물]을 건너지 마오.\n임은 그예 물을 건너시네.\n물에 빠져 돌아가시니,\n가신 임을 어이할꼬.",
    hints: {
      speaker: "물에 빠져 죽은 임을 잃은 아내",
      emotion: "임을 잃은 슬픔과 체념",
      words: "‘물’은 사랑(임이 건너지 않기를 바람) → 이별(건넘) → 죽음(빠짐)으로 뜻이 바뀐다.",
      structure: "만류 → 임이 물을 건넘 → 임의 죽음 → 슬픔과 체념",
      theme: "임을 잃은 슬픔",
      compare: "한문으로 옮겨져 전하며(4언 4구), 배경 설화가 함께 전한다. 개인의 서정을 노래한 가장 오래된 시가 가운데 하나로 꼽힌다.",
    },
  },
];

/* ───── 본문과 빈칸 ───── */

/** 본문을 글과 [빈칸]으로 나눕니다. */
export function parseBlanks(body: string) {
  const parts: { text: string; blank: boolean }[] = [];
  const pattern = /\[([^[\]\n]{1,40})\]/g;
  let last = 0;
  for (let match = pattern.exec(body); match; match = pattern.exec(body)) {
    if (match.index > last) parts.push({ text: body.slice(last, match.index), blank: false });
    parts.push({ text: match[1], blank: true });
    last = match.index + match[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last), blank: false });
  return parts;
}
export const blankWords = (body: string) => parseBlanks(body).filter(part => part.blank).map(part => part.text);
const MARKS = "㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭";
export const blankMark = (index: number) => MARKS[index] ?? `(${index + 1})`;

/** 한 줄 안의 [빈칸]을 표시로 바꾼 HTML입니다. counter로 번호를 이어 매깁니다. */
function lineHtml(line: string, blanks: boolean, counter: { value: number }) {
  return parseBlanks(line).map(part => part.blank
    ? blanks ? `<b>(&nbsp;&nbsp;${blankMark(counter.value++)}&nbsp;&nbsp;)</b>` : `<u>${escapeHtml(part.text)}</u>`
    : escapeHtml(part.text)).join("");
}

export type BodyOptions = { blanks: boolean; numbers: boolean };
/**
 * 작품 본문 HTML. 시는 빈 줄로 연을 나누고 행·연 번호를 붙이며, 산문은 빈 줄(또는 줄 바꿈)로 문단을 나눠 번호를 붙입니다.
 * 빈칸을 쓰지 않으면 [ ] 낱말에 밑줄만 긋습니다.
 */
export function workBodyHtml(work: Pick<LiteraryWork, "genre" | "body">, options: BodyOptions) {
  const counter = { value: 0 };
  const text = work.body.replace(/\r\n/g, "\n").trim();
  if (isVerse(work.genre)) {
    const stanzas = text.split(/\n\s*\n/).map(stanza => stanza.split("\n").filter(line => line.trim()));
    let lineNo = 0;
    return stanzas.map((lines, stanza) => {
      const rows = lines.map(line => {
        lineNo += 1;
        const number = options.numbers && lineNo % 5 === 0 ? `<span style="float:right;color:#777;font-size:9pt">${lineNo}</span>` : "";
        return `<div>${number}${lineHtml(line, options.blanks, counter)}</div>`;
      }).join("");
      const label = options.numbers && stanzas.length > 1 ? `<div style="font-size:9pt;color:#555;margin:0 0 .5mm">[${stanza + 1}연]</div>` : "";
      return `<div style="margin:0 0 2.5mm">${label}${rows}</div>`;
    }).join("");
  }
  const paragraphs = (/\n\s*\n/.test(text) ? text.split(/\n\s*\n/) : text.split("\n")).map(paragraph => paragraph.replace(/\n/g, " ").trim()).filter(Boolean);
  return paragraphs.map((paragraph, index) => `<p style="margin:0 0 2mm;text-indent:${options.numbers ? "0" : "3mm"}">${options.numbers ? `<b style="color:#444">[${index + 1}]</b> ` : ""}${lineHtml(paragraph, options.blanks, counter)}</p>`).join("");
}
/** 작품 상자(제목·작가·본문·출전)입니다. */
export function workBoxHtml(work: LiteraryWork, options: BodyOptions) {
  const head = `<p style="margin:0 0 2mm;font-weight:700">${escapeHtml(work.title || "작품")}${work.author ? ` <span style="font-weight:400">— ${escapeHtml(work.author)}</span>` : ""}</p>`;
  const origin = work.origin ? `<p style="margin:1.5mm 0 0;text-align:right;font-size:9.5pt;color:#444">${escapeHtml(work.origin)}</p>` : "";
  return `<div style="border:1.5px solid #333;border-radius:2mm;padding:3mm 4mm;margin:1mm 0 2mm;line-height:1.8">${head}${workBodyHtml(work, options)}${origin}</div>`;
}

export type WorkSheetOptions = BodyOptions & { asks: WorkAsk[]; custom: string[]; space: number };
export function workSheet(work: LiteraryWork, options: WorkSheetOptions): SheetSection[] {
  const words = blankWords(work.body);
  const box = workBoxHtml(work, options);
  const problems: SheetProblem[] = [];
  if (options.blanks && words.length) problems.push(problem(`작품의 빈칸 ${words.map((_, i) => blankMark(i)).join(", ")}에 들어갈 알맞은 말을 쓰시오.`, words.map((word, i) => `${blankMark(i)} ${escapeHtml(word)}`).join("&nbsp;&nbsp; "), { space: 10 }));
  const allowed = new Set(GENRE_ASKS[work.genre]);
  for (const ask of options.asks.filter(item => allowed.has(item))) {
    const hint = work.hints[ask]?.trim();
    problems.push(problem(escapeHtml(ASK_TEXT[ask]), escapeHtml(hint ? `(예시) ${hint}` : OPEN), { space: options.space }));
  }
  for (const question of options.custom.map(item => item.trim()).filter(Boolean)) problems.push(problem(escapeHtml(question), escapeHtml(OPEN), { space: options.space }));
  const introText = `[${work.title || "작품"}${work.author ? ` — ${work.author}` : ""}]\n${plainText(workBodyHtml(work, options).replace(/<\/div>/g, "</div>\n").replace(/<\/p>/g, "</p>\n"))}`;
  return [{ heading: `${workGenres[work.genre]} 작품 분석`, intro: { html: box, text: introText }, problems }];
}
