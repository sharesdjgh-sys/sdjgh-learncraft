/* 영어: Listen & Speak 의사소통 기능 표현입니다. 기능마다 직접 쓴 자연스러운 표현과 짧은 대화(빈칸 문제), 역할극 상황을 둡니다. */
import { clipboardWrap, sheetHead, textHead, type SheetMode } from "@/features/language-sheet";
import { circled, escapeHtml, problem, seededRandom, shuffled, type SheetProblem, type SheetSection } from "./sheet";

/** 대화 한 줄: A/B와 말. blank가 true인 줄이 빈칸이고, 그 말이 정답입니다. */
export type DialogueLine = { speaker: "A" | "B"; text: string; blank?: boolean };
export type SpeechFunction = { key: string; name: string; english: string; expressions: string[]; dialogues: DialogueLine[][]; roleplay: { situation: string; roles: [string, string] } };

export const SPEECH_FUNCTIONS: SpeechFunction[] = [
  {
    key: "greeting", name: "인사·소개하기", english: "Greeting & Introducing",
    expressions: ["Nice to meet you.", "Let me introduce myself.", "I'd like you to meet my friend, Jiwoo.", "How have you been?", "It's been a long time.", "Please call me Min."],
    dialogues: [
      [{ speaker: "A", text: "Hi, I'm Sora. I'm new here." }, { speaker: "B", text: "Nice to meet you, Sora.", blank: true }, { speaker: "A", text: "Nice to meet you, too." }],
      [{ speaker: "A", text: "Jake! It's been a long time.", blank: true }, { speaker: "B", text: "Yes, it has! How have you been?" }, { speaker: "A", text: "Pretty good, thanks." }],
    ],
    roleplay: { situation: "새 학기 첫날, 처음 만난 짝에게 자기소개를 해요.", roles: ["전학 온 학생", "같은 반 학생"] },
  },
  {
    key: "agree", name: "동의·반대하기", english: "Agreeing & Disagreeing",
    expressions: ["I agree with you.", "You can say that again.", "That's exactly what I think.", "I'm afraid I don't agree.", "I see your point, but ...", "I don't think so."],
    dialogues: [
      [{ speaker: "A", text: "I think we should use less plastic." }, { speaker: "B", text: "I agree with you. It's bad for the ocean.", blank: true }],
      [{ speaker: "A", text: "Online classes are better than classroom lessons." }, { speaker: "B", text: "I see your point, but I learn better when I meet my teachers in person.", blank: true }],
    ],
    roleplay: { situation: "학급 회의에서 ‘교복 대신 체육복을 입자’는 의견을 두고 이야기해요.", roles: ["찬성하는 학생", "반대하는 학생"] },
  },
  {
    key: "opinion", name: "의견 묻고 말하기", english: "Asking for & Giving Opinions",
    expressions: ["What do you think of ...?", "How do you feel about ...?", "In my opinion, ...", "I think (that) ...", "If you ask me, ...", "It seems to me that ..."],
    dialogues: [
      [{ speaker: "A", text: "What do you think of the new school cafeteria?", blank: true }, { speaker: "B", text: "In my opinion, it's much cleaner than before." }],
      [{ speaker: "A", text: "How do you feel about wearing school uniforms?" }, { speaker: "B", text: "If you ask me, they're comfortable and save time.", blank: true }],
    ],
    roleplay: { situation: "동아리에서 축제 때 무엇을 할지 서로 의견을 물어요.", roles: ["동아리 회장", "동아리 부원"] },
  },
  {
    key: "suggest", name: "제안·권유하기", english: "Making Suggestions",
    expressions: ["Why don't we ...?", "How about ...ing?", "Let's ...", "What about ...ing?", "Would you like to ...?", "Sounds good. / Sorry, I can't."],
    dialogues: [
      [{ speaker: "A", text: "It's sunny today. Why don't we go on a picnic?", blank: true }, { speaker: "B", text: "Sounds good! I'll bring some sandwiches." }],
      [{ speaker: "A", text: "How about watching a movie this Saturday?" }, { speaker: "B", text: "Sorry, I can't. I have to visit my grandparents.", blank: true }],
    ],
    roleplay: { situation: "주말에 함께 할 일을 친구에게 제안해요. 한 사람은 사정이 있어 다른 날을 제안해요.", roles: ["제안하는 친구", "다른 계획이 있는 친구"] },
  },
  {
    key: "advice", name: "충고하기", english: "Giving Advice",
    expressions: ["You should ...", "You'd better ...", "Why don't you ...?", "If I were you, I would ...", "It might be a good idea to ...", "Make sure you ..."],
    dialogues: [
      [{ speaker: "A", text: "I have a terrible headache." }, { speaker: "B", text: "You should take some rest.", blank: true }],
      [{ speaker: "A", text: "I can't sleep well these days." }, { speaker: "B", text: "If I were you, I would stop using my phone before bed.", blank: true }],
    ],
    roleplay: { situation: "시험 기간에 늦게 자서 피곤하다는 친구에게 충고해요.", roles: ["고민이 있는 친구", "충고하는 친구"] },
  },
  {
    key: "request", name: "요청·허락 구하기", english: "Requests & Permission",
    expressions: ["Can you help me with ...?", "Could you please ...?", "Would you mind ...ing?", "Is it okay if I ...?", "May I ...?", "Sure. / Of course. / I'm sorry, but ..."],
    dialogues: [
      [{ speaker: "A", text: "Would you mind opening the window?" }, { speaker: "B", text: "Not at all. It's hot in here.", blank: true }],
      [{ speaker: "A", text: "Is it okay if I use your pen?", blank: true }, { speaker: "B", text: "Sure, go ahead." }],
    ],
    roleplay: { situation: "도서관에서 옆 사람에게 자리를 잠깐 맡아 달라고 부탁해요.", roles: ["부탁하는 학생", "부탁받는 학생"] },
  },
  {
    key: "thanks", name: "감사·사과하기", english: "Thanking & Apologizing",
    expressions: ["Thank you for ...", "I really appreciate it.", "It's very kind of you.", "I'm sorry for ...", "I apologize for ...", "That's okay. / No problem. / Don't worry about it."],
    dialogues: [
      [{ speaker: "A", text: "Thank you for helping me with my homework." }, { speaker: "B", text: "No problem. I'm glad I could help.", blank: true }],
      [{ speaker: "A", text: "I'm sorry for being late.", blank: true }, { speaker: "B", text: "That's okay. The movie hasn't started yet." }],
    ],
    roleplay: { situation: "친구의 책을 빌렸다가 잃어버렸어요. 사과하고 해결 방법을 이야기해요.", roles: ["책을 잃어버린 학생", "책 주인"] },
  },
  {
    key: "hope", name: "희망·기대 말하기", english: "Expressing Hopes",
    expressions: ["I hope (that) ...", "I'm looking forward to ...ing.", "I can't wait to ...", "I wish I could ...", "I'd really like to ...", "It would be great if ..."],
    dialogues: [
      [{ speaker: "A", text: "Our school trip is next week." }, { speaker: "B", text: "I know! I'm looking forward to visiting Gyeongju.", blank: true }],
      [{ speaker: "A", text: "Are you ready for the contest?" }, { speaker: "B", text: "I think so. I hope I win first prize.", blank: true }],
    ],
    roleplay: { situation: "방학을 앞두고 방학 때 하고 싶은 일을 서로 이야기해요.", roles: ["학생 A", "학생 B"] },
  },
  {
    key: "worry", name: "걱정·위로하기", english: "Worry & Comfort",
    expressions: ["What's wrong?", "You look worried.", "I'm worried about ...", "Don't worry. You'll be fine.", "Cheer up!", "I'm sorry to hear that."],
    dialogues: [
      [{ speaker: "A", text: "You look worried. What's wrong?", blank: true }, { speaker: "B", text: "I'm worried about my speech tomorrow." }],
      [{ speaker: "A", text: "My dog is sick." }, { speaker: "B", text: "I'm sorry to hear that. I hope he gets better soon.", blank: true }],
    ],
    roleplay: { situation: "대회를 앞두고 긴장한 친구를 위로하고 격려해요.", roles: ["걱정하는 친구", "위로하는 친구"] },
  },
  {
    key: "surprise", name: "놀람 표현하기", english: "Expressing Surprise",
    expressions: ["What a surprise!", "I can't believe it!", "Really? / Are you serious?", "That's amazing!", "You're kidding!", "No way!"],
    dialogues: [
      [{ speaker: "A", text: "I won the singing contest!" }, { speaker: "B", text: "Really? That's amazing!", blank: true }],
      [{ speaker: "A", text: "Minji is moving to Canada next month." }, { speaker: "B", text: "Are you serious? I didn't know that.", blank: true }],
    ],
    roleplay: { situation: "뜻밖의 소식(깜짝 선물·전학 등)을 전하고 놀라움을 표현해요.", roles: ["소식을 전하는 친구", "소식을 듣는 친구"] },
  },
  {
    key: "preference", name: "선호 말하기", english: "Expressing Preferences",
    expressions: ["Which do you prefer, A or B?", "I prefer A to B.", "I'd rather ... than ...", "I like A better than B.", "My favorite ... is ...", "Either is fine with me."],
    dialogues: [
      [{ speaker: "A", text: "Which do you prefer, cats or dogs?", blank: true }, { speaker: "B", text: "I prefer dogs to cats. They're friendly." }],
      [{ speaker: "A", text: "Do you want to eat out or cook at home?" }, { speaker: "B", text: "I'd rather cook at home than eat out.", blank: true }],
    ],
    roleplay: { situation: "현장 체험 학습 장소(박물관·놀이공원)를 정하며 좋아하는 것을 말해요.", roles: ["학생 A", "학생 B"] },
  },
  {
    key: "certainty", name: "확신·불확실 말하기", english: "Certainty & Uncertainty",
    expressions: ["I'm sure (that) ...", "I'm certain that ...", "There's no doubt that ...", "I'm not sure (if) ...", "Maybe ... / Perhaps ...", "It's hard to say."],
    dialogues: [
      [{ speaker: "A", text: "Do you think it will rain tomorrow?" }, { speaker: "B", text: "I'm not sure. Let's check the weather forecast.", blank: true }],
      [{ speaker: "A", text: "Will our team win the final?" }, { speaker: "B", text: "I'm sure we will. We've practiced so hard.", blank: true }],
    ],
    roleplay: { situation: "잃어버린 물건이 어디 있을지 추측하며 이야기해요.", roles: ["물건을 잃어버린 학생", "함께 찾는 친구"] },
  },
  {
    key: "reason", name: "이유 묻고 답하기", english: "Asking for Reasons",
    expressions: ["Why do you think so?", "What makes you say that?", "How come ...?", "Because ...", "That's because ...", "The reason is that ..."],
    dialogues: [
      [{ speaker: "A", text: "I think reading books is better than watching videos." }, { speaker: "B", text: "Why do you think so?", blank: true }, { speaker: "A", text: "Because it helps me imagine more." }],
      [{ speaker: "A", text: "How come you're so tired today?" }, { speaker: "B", text: "That's because I studied until late last night.", blank: true }],
    ],
    roleplay: { situation: "좋아하는 계절을 말하고 그 까닭을 서로 물어요.", roles: ["학생 A", "학생 B"] },
  },
  {
    key: "direction", name: "길 묻고 안내하기", english: "Asking for & Giving Directions",
    expressions: ["How can I get to ...?", "Where is the nearest ...?", "Go straight two blocks.", "Turn left at the corner.", "It's next to / across from ...", "You can't miss it."],
    dialogues: [
      [{ speaker: "A", text: "Excuse me. How can I get to the city hall?", blank: true }, { speaker: "B", text: "Go straight and turn right at the bank." }],
      [{ speaker: "A", text: "Where is the nearest subway station?" }, { speaker: "B", text: "It's across from the post office. You can't miss it.", blank: true }],
    ],
    roleplay: { situation: "관광객이 우리 동네의 유명한 장소를 찾고 있어요. 지도를 보며 길을 알려 줘요.", roles: ["관광객", "안내하는 학생"] },
  },
  {
    key: "phone", name: "전화하기", english: "Talking on the Phone",
    expressions: ["Hello. May I speak to ...?", "This is ... speaking.", "Who's calling, please?", "Hold on, please.", "Can I take a message?", "I'll call you back later."],
    dialogues: [
      [{ speaker: "A", text: "Hello. May I speak to Yuna?", blank: true }, { speaker: "B", text: "Sorry, she's not home right now. Can I take a message?" }],
      [{ speaker: "A", text: "Hello, this is Minsu. Is Jihoon there?" }, { speaker: "B", text: "Hold on, please. I'll get him.", blank: true }],
    ],
    roleplay: { situation: "친구 집에 전화했는데 친구가 없어요. 전할 말을 남겨요.", roles: ["전화를 건 학생", "전화를 받은 가족"] },
  },
  {
    key: "check", name: "이해 확인하기", english: "Checking Understanding",
    expressions: ["Do you know what I mean?", "Are you following me?", "Did you get it?", "Could you say that again?", "What do you mean by ...?", "Sorry, I didn't catch that."],
    dialogues: [
      [{ speaker: "A", text: "Press this button twice, and then hold it for three seconds." }, { speaker: "B", text: "Sorry, I didn't catch that. Could you say that again?", blank: true }],
      [{ speaker: "A", text: "The meeting has been moved up." }, { speaker: "B", text: "What do you mean by \"moved up\"?", blank: true }, { speaker: "A", text: "It means it will start earlier." }],
    ],
    roleplay: { situation: "새 게임(기계) 쓰는 법을 설명하고, 듣는 사람은 모르는 부분을 되물어요.", roles: ["설명하는 학생", "배우는 학생"] },
  },
];

/* ───── 표현 카드 ───── */

export function expressionCardsHtml(functions: SpeechFunction[], title: string, mode: SheetMode) {
  const card = (item: SpeechFunction) => `<td style="width:50%;border:1px solid #666;padding:3mm;vertical-align:top"><div style="font-weight:700">${escapeHtml(item.name)} <span style="font-weight:400;color:#555">${escapeHtml(item.english)}</span></div><ul style="margin:1.5mm 0 0 4mm;padding:0">${item.expressions.map(expression => `<li>${escapeHtml(expression)}</li>`).join("")}</ul></td>`;
  const rows: string[] = [];
  for (let index = 0; index < functions.length; index += 2) rows.push(`<tr>${card(functions[index])}${functions[index + 1] ? card(functions[index + 1]) : `<td style="width:50%"></td>`}</tr>`);
  return clipboardWrap(sheetHead(title.trim() || "의사소통 기능 표현") + `<table style="border-collapse:collapse;width:100%;font-size:10pt">${rows.join("")}</table>`, mode);
}
export const expressionCardsText = (functions: SpeechFunction[], title: string) =>
  [...textHead(title.trim() || "의사소통 기능 표현"), "", ...functions.flatMap(item => [`[${item.name}] ${item.english}`, ...item.expressions.map(expression => `  · ${expression}`), ""])].join("\n");

/* ───── 대화 빈칸 문제 ───── */

export type FunctionAsk = "dialogue" | "which";
export const functionAsks: Record<FunctionAsk, string> = { dialogue: "대화 빈칸(고르기)", which: "표현의 기능 고르기" };

// 뜻이 겹칠 수 있는 기능끼리는 서로의 말을 오답 보기로 쓰지 않습니다(예: 충고의 Why don't you ~?와 제안).
const CONFLICTS: [string, string][] = [
  ["advice", "suggest"], ["advice", "worry"], ["opinion", "agree"], ["opinion", "certainty"], ["opinion", "reason"], ["agree", "certainty"],
  ["hope", "preference"], ["thanks", "worry"], ["request", "suggest"], ["check", "reason"], ["certainty", "reason"],
  ["agree", "reason"], ["check", "request"], ["phone", "request"],
];
// “다시 말해 줄래?” 같은 이해 확인 말은 어떤 말 뒤에도 자연스러워서 대화 빈칸의 오답 보기로 쓰지 않습니다.
const ALWAYS_FITS = new Set(["check"]);
/** 두 기능이 오답 보기로 함께 쓰기에 안전한지 봅니다. */
export const distinctFunctions = (a: string, b: string) => a !== b && !CONFLICTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

const dialogueHtml = (lines: DialogueLine[], hide: boolean) => lines.map(line => `<div><b>${line.speaker}:</b> ${line.blank && hide ? `<span style="display:inline-block;min-width:60mm;border-bottom:1px solid #333">&nbsp;</span>` : escapeHtml(line.text)}</div>`).join("");

/** 고른 기능들로 대화 빈칸(①~⑤ 고르기)과 ‘이 표현의 기능은?’ 문제를 만듭니다. 오답 보기는 다른 기능의 대화 속 말입니다. */
export function functionSections(functions: SpeechFunction[], asks: FunctionAsk[], count: number, seed: number): SheetSection[] {
  if (!functions.length) return [];
  const random = seededRandom(seed * 89 + 5);
  const mix = <T,>(items: T[]) => shuffled(items, Math.floor(random() * 1e9));
  const sections: SheetSection[] = [];
  const allBlanks = SPEECH_FUNCTIONS.flatMap(item => item.dialogues.map(dialogue => ({ key: item.key, text: dialogue.find(line => line.blank)!.text })));
  if (asks.includes("dialogue")) {
    const pool = mix(functions.flatMap(item => item.dialogues.map(dialogue => ({ item, dialogue })))).slice(0, count);
    const problems: SheetProblem[] = pool.map(({ item, dialogue }) => {
      const answer = dialogue.find(line => line.blank)!.text;
      const wrong = mix(allBlanks.filter(blank => distinctFunctions(blank.key, item.key) && !ALWAYS_FITS.has(blank.key) && blank.text !== answer)).slice(0, 4).map(blank => blank.text);
      const choices = mix([answer, ...wrong]);
      return problem(`대화의 빈칸에 들어갈 말로 가장 알맞은 것을 고르시오.<div style="margin:1mm 0 1mm 3mm">${dialogueHtml(dialogue, true)}</div>${choices.map((choice, index) => `<div>${circled(index)} ${escapeHtml(choice)}</div>`).join("")}`,
        `${circled(choices.indexOf(answer))} ${escapeHtml(answer)} <span style="color:#555">— ${escapeHtml(item.name)}</span>`);
    });
    if (problems.length) sections.push({ heading: "대화 완성하기", problems });
  }
  if (asks.includes("which") && SPEECH_FUNCTIONS.length >= 5) {
    const pool = mix(functions.flatMap(item => item.expressions.filter(expression => !expression.includes("/")).map(expression => ({ item, expression })))).slice(0, count);
    const problems = pool.map(({ item, expression }) => {
      const wrong = mix(SPEECH_FUNCTIONS.filter(other => distinctFunctions(other.key, item.key))).slice(0, 4).map(other => other.name);
      const choices = mix([item.name, ...wrong]);
      return problem(`다음 말의 의사소통 기능으로 알맞은 것을 고르시오.<div style="margin:1mm 0 1mm 3mm"><b>“${escapeHtml(expression)}”</b></div>${choices.map((choice, index) => `${circled(index)} ${escapeHtml(choice)}`).join("&nbsp;&nbsp; ")}`, `${circled(choices.indexOf(item.name))} ${escapeHtml(item.name)}`);
    });
    if (problems.length) sections.push({ heading: "표현의 기능 알기", problems });
  }
  return sections;
}

/* ───── 역할극 카드 ───── */

/** 역할극 카드입니다. 기능마다 역할 두 장(상황·내 역할·꼭 쓸 표현)을 나란히 두어 잘라 나눠 줄 수 있게 합니다. */
export function roleplayHtml(functions: SpeechFunction[], title: string, mustUse: number, seed: number, mode: SheetMode) {
  const random = seededRandom(seed * 37 + 11);
  const card = (item: SpeechFunction, role: string) => {
    const must = shuffled(item.expressions, Math.floor(random() * 1e9)).slice(0, mustUse);
    return `<td style="width:50%;border:1.5px dashed #777;padding:3mm;vertical-align:top"><div style="font-size:9pt;color:#555">${escapeHtml(item.name)}</div><div style="margin:1mm 0"><b>상황</b> ${escapeHtml(item.roleplay.situation)}</div><div><b>내 역할</b> ${escapeHtml(role)}</div>${must.length ? `<div style="margin-top:1mm"><b>꼭 쓸 표현</b><br>${must.map(expression => `· ${escapeHtml(expression)}`).join("<br>")}</div>` : ""}</td>`;
  };
  const rows = functions.map(item => `<tr>${card(item, item.roleplay.roles[0])}${card(item, item.roleplay.roles[1])}</tr>`).join("");
  return clipboardWrap(sheetHead(title.trim() || "역할극 카드") + `<table style="border-collapse:collapse;width:100%;font-size:10pt">${rows}</table>`, mode);
}
export function roleplayText(functions: SpeechFunction[], title: string) {
  return [...textHead(title.trim() || "역할극 카드"), "", ...functions.flatMap(item => [`[${item.name}] ${item.roleplay.situation}`, `  역할: ${item.roleplay.roles.join(" / ")}`, `  표현: ${item.expressions.join(" / ")}`, ""])].join("\n");
}
