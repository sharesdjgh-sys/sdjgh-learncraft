/* 국어 · 화법: 반대 신문식 토론(순서·논제·양식), 토의 유형과 협상, 대화의 원리(협력·공손성)와 문제입니다. 이론은 교과서 통설이고, 대화 예시는 교과서형으로 지은 것입니다. */
import { emptyRows, type FormBlock, type FormSheet } from "./form-sheet";
import { circled, escapeHtml, particle, problem, sheetTable, shuffled, type SheetProblem, type SheetSection } from "./sheet";

/* ───── 반대 신문식 토론 ───── */
export type DebateSide = "pro" | "con";
export type DebateStep = { side: DebateSide; speaker: 1 | 2; kind: "입론" | "반대 신문" | "반박"; minutes: number };
export const sideName: Record<DebateSide, string> = { pro: "찬성", con: "반대" };
/** 교과서에 흔히 실리는 반대 신문식 토론(CEDA) 순서입니다. 시간은 학교 수업에 맞게 고칠 수 있어요. */
export const DEFAULT_DEBATE_STEPS: DebateStep[] = [
  { side: "pro", speaker: 1, kind: "입론", minutes: 4 },
  { side: "con", speaker: 2, kind: "반대 신문", minutes: 3 },
  { side: "con", speaker: 1, kind: "입론", minutes: 4 },
  { side: "pro", speaker: 1, kind: "반대 신문", minutes: 3 },
  { side: "pro", speaker: 2, kind: "입론", minutes: 4 },
  { side: "con", speaker: 1, kind: "반대 신문", minutes: 3 },
  { side: "con", speaker: 2, kind: "입론", minutes: 4 },
  { side: "pro", speaker: 2, kind: "반대 신문", minutes: 3 },
  { side: "con", speaker: 1, kind: "반박", minutes: 3 },
  { side: "pro", speaker: 1, kind: "반박", minutes: 3 },
  { side: "con", speaker: 2, kind: "반박", minutes: 3 },
  { side: "pro", speaker: 2, kind: "반박", minutes: 3 },
];
export const stepLabel = (step: DebateStep) => `${sideName[step.side]} ${step.speaker} ${step.kind}`;
export function debateScheduleHtml(steps: DebateStep[]) {
  let start = 0;
  const rows = steps.map((step, index) => {
    const at = start;
    start += step.minutes;
    return [String(index + 1), `${sideName[step.side]} 측 ${step.speaker}번 토론자`, `<b>${step.kind}</b>`, `${step.minutes}분`, `${at}분 ~ ${start}분`];
  });
  return sheetTable(["차례", "토론자", "단계", "시간", "누적"], rows, { font: "9.5pt" }) + `<p style="margin:1mm 0 0;font-size:9pt;color:#444">모두 ${start}분. 반대 신문은 상대 입론을 한 토론자에게 질문하고 답을 듣는 단계예요. 반박은 새 주장 없이 앞서 나온 논점을 다시 따지는 단계예요.</p>`;
}
export const debateMinutes = (steps: DebateStep[]) => steps.reduce((sum, step) => sum + step.minutes, 0);

export type PropositionKind = "fact" | "value" | "policy";
export const PROPOSITIONS: Record<PropositionKind, { name: string; meaning: string; example: string }> = {
  fact: { name: "사실 논제", meaning: "어떤 일이 사실인지 아닌지를 따진다.", example: "청소년의 스마트폰 사용 시간은 학업 성취도를 떨어뜨린다." },
  value: { name: "가치 논제", meaning: "어떤 것이 옳은지, 바람직한지, 더 가치 있는지를 따진다.", example: "개인의 자유는 공동체의 안전보다 중요하다." },
  policy: { name: "정책 논제", meaning: "어떤 행동이나 정책을 해야 하는지를 따진다. ‘~해야 한다’의 꼴이 많다.", example: "고등학교에서 교복 착용을 자율화해야 한다." },
};
/** 정책 논제에서 찬성 측이 입증해야 하는 필수 쟁점입니다. */
export const POLICY_ISSUES = ["문제의 심각성: 지금 상태에 해결해야 할 문제가 있는가?", "해결 방안의 실행 가능성: 제시한 방안을 실제로 할 수 있는가?", "효과(이익과 비용): 방안의 이익이 비용이나 부작용보다 큰가?"];

export type DebateFormKey = "case" | "question" | "judge";
export const debateForms: Record<DebateFormKey, string> = { case: "입론서", question: "반대 신문 준비", judge: "판정표" };
export function debateForm(key: DebateFormKey, motion: string, steps: DebateStep[]): FormSheet {
  const motionNote: FormBlock = { kind: "note", text: `논제: ${motion.trim() || "(논제를 쓰세요)"}` };
  if (key === "case") return { title: "토론 입론서", blocks: [
    motionNote,
    { kind: "box", title: "우리 측 입장", text: "( 찬성 / 반대 )", height: 8 },
    { kind: "box", title: "용어 정의", height: 14, hint: "논제의 핵심 낱말 뜻을 밝혀요." },
    { kind: "table", title: "주장과 근거", head: ["주장(쟁점)", "근거 자료", "출처"], rows: emptyRows(3, 3), height: 18, widths: ["34%", "46%", "20%"] },
    { kind: "box", title: "예상 반론과 대응", height: 22 },
    { kind: "box", title: "마무리 말", height: 12 },
  ] };
  if (key === "question") return { title: "반대 신문 준비", blocks: [
    motionNote,
    { kind: "table", title: "상대 입론의 약점과 질문", head: ["상대 주장", "약점(근거 부족·논리 비약 등)", "던질 질문"], rows: emptyRows(3, 4), height: 16 },
    { kind: "check", title: "반대 신문 점검", items: ["상대 입론의 내용에 대해서만 질문했는가?", "‘예·아니요’로 답할 수 있게 짧게 물었는가?", "질문으로 새 주장을 펴지 않았는가?", "상대의 답을 끝까지 들었는가?"] },
  ] };
  const judgeRows = steps.map(step => [stepLabel(step), "", ""]);
  return { title: "토론 판정표", blocks: [
    motionNote,
    { kind: "table", title: "단계별 기록", head: ["단계", "핵심 내용", "잘한 점·아쉬운 점"], rows: judgeRows, height: 9, widths: ["22%", "46%", "32%"] },
    { kind: "rubric", title: "평가 기준", score: true, items: [
      { name: "논증", levels: ["주장과 근거가 타당하고 자료가 믿을 만하다.", "근거가 있으나 일부가 약하다.", "근거 없이 주장만 한다."] },
      { name: "반대 신문", levels: ["상대 논리의 약점을 정확히 짚는다.", "질문이 논점과 조금 벗어난다.", "질문이 논점과 관련이 없다."] },
      { name: "반박", levels: ["상대 논점을 정확히 따지고 우리 논점을 지킨다.", "반박하지만 일부 논점을 놓친다.", "반박하지 못한다."] },
      { name: "태도·규칙", levels: ["시간과 순서를 지키고 상대를 존중한다.", "대체로 지키나 가끔 끼어든다.", "규칙을 지키지 않는다."] },
    ] },
    { kind: "box", title: "판정 결과와 까닭", text: "( 찬성 / 반대 ) 측 승", height: 16 },
  ] };
}

/* ───── 토의·협상 ───── */
export const DISCUSSION_TYPES: { name: string; who: string; how: string; when: string }[] = [
  { name: "패널 토의", who: "견해가 서로 다른 전문가(패널) 3~6명과 청중", how: "사회자의 진행으로 패널이 청중 앞에서 의견을 주고받은 뒤 청중이 질문하거나 의견을 말한다.", when: "견해가 엇갈리는 시사 문제" },
  { name: "심포지엄", who: "전문가 여러 명과 청중", how: "전문가가 한 주제의 여러 측면을 나누어 강연식으로 발표한 뒤 청중과 질의응답을 한다.", when: "전문 지식이 필요한 학술적 주제" },
  { name: "포럼", who: "공공 문제에 관심 있는 청중(주민 등)", how: "처음부터 청중이 참여해 공공의 문제를 공개적으로 토의한다(공청회 형식).", when: "지역·공공 문제" },
  { name: "원탁 토의", who: "10명 안팎의 참여자", how: "사회자 없이 또는 사회자와 함께 모두가 평등한 자격으로 자유롭게 의견을 나눈다.", when: "작은 모임의 문제 해결" },
];
export function discussionTableHtml() {
  return sheetTable(["유형", "참여자", "방법", "알맞은 주제"], DISCUSSION_TYPES.map(item => [`<b>${item.name}</b>`, escapeHtml(item.who), escapeHtml(item.how), escapeHtml(item.when)]), { widths: ["14%", "24%", "44%", "18%"], font: "9.5pt" });
}
export const NEGOTIATION_STAGES: { name: string; what: string }[] = [
  { name: "시작 단계", what: "갈등의 원인과 문제를 확인하고, 서로의 입장과 요구를 파악한다." },
  { name: "조정 단계", what: "구체적인 제안과 대안을 주고받으며 서로 양보하거나 보상하는 방법을 찾는다." },
  { name: "해결 단계", what: "서로 받아들일 수 있는 합의안을 만들고, 합의 내용을 확인한다." },
];
export const NEGOTIATION_TACTICS = [
  "겉으로 드러난 입장보다 그 밑에 있는 진짜 관심사(이익)에 집중한다.",
  "양쪽 모두에게 이익이 되는 대안(상생)을 여럿 찾아본다.",
  "누구나 받아들일 수 있는 객관적인 기준(자료·규정·관례)을 근거로 삼는다.",
  "양보할 수 있는 것과 없는 것을 미리 정해 둔다.",
  "상대의 말을 끝까지 듣고, 비난보다 문제 해결에 초점을 맞춘다.",
];
export function negotiationForm(topic: string, sides: [string, string]): FormSheet {
  return { title: "협상 준비서", blocks: [
    { kind: "note", text: `협상 문제: ${topic.trim() || "(문제를 쓰세요)"}` },
    { kind: "table", title: "입장과 관심사", head: ["", sides[0] || "우리 측", sides[1] || "상대측"], rows: [["요구(입장)", "", ""], ["그렇게 요구하는 까닭(관심사)", "", ""], ["양보할 수 있는 것", "", ""], ["양보할 수 없는 것", "", ""]], height: 13, widths: ["26%", "37%", "37%"] },
    { kind: "table", title: "대안 찾기", head: ["대안", "우리 측 이익", "상대측 이익"], rows: emptyRows(3, 3), height: 12 },
    { kind: "table", title: "협상 단계별 계획", head: ["단계", "할 일과 할 말"], rows: NEGOTIATION_STAGES.map(stage => [stage.name, ""]), height: 14, widths: ["20%", "80%"] },
    { kind: "box", title: "합의안", height: 18 },
  ] };
}

/* ───── 대화의 원리 ───── */
export type Maxim = "quantity" | "quality" | "relation" | "manner" | "tact" | "generosity" | "approbation" | "modesty" | "agreement";
export const MAXIMS: Record<Maxim, { name: string; principle: "협력의 원리" | "공손성의 원리"; meaning: string }> = {
  quantity: { name: "양의 격률", principle: "협력의 원리", meaning: "대화의 목적에 필요한 만큼만 정보를 준다(너무 적거나 많지 않게)." },
  quality: { name: "질의 격률", principle: "협력의 원리", meaning: "진실이라고 믿는 것, 근거가 있는 것만 말한다." },
  relation: { name: "관련성의 격률", principle: "협력의 원리", meaning: "대화의 주제나 목적과 관련된 말을 한다." },
  manner: { name: "태도의 격률", principle: "협력의 원리", meaning: "모호하거나 중의적인 표현을 피하고 간결하고 조리 있게 말한다." },
  tact: { name: "요령의 격률", principle: "공손성의 원리", meaning: "상대의 부담은 줄이고 상대의 이익은 늘리는 쪽으로 말한다." },
  generosity: { name: "관용의 격률", principle: "공손성의 원리", meaning: "자신의 혜택은 줄이고 자신의 부담은 늘리는 쪽으로 말한다(탓을 자신에게 돌림)." },
  approbation: { name: "찬동의 격률", principle: "공손성의 원리", meaning: "상대에 대한 비난은 줄이고 칭찬은 늘린다." },
  modesty: { name: "겸양의 격률", principle: "공손성의 원리", meaning: "자신에 대한 칭찬은 줄이고 자신을 낮춘다." },
  agreement: { name: "동의의 격률", principle: "공손성의 원리", meaning: "상대와 의견이 다른 점은 줄이고 같은 점을 늘린다(일부 동의한 뒤 다른 의견을 말함)." },
};
/** speaker는 격률을 지키거나 어긴 사람의 줄 번호입니다(없으면 뒤에 말한 사람). */
export type Dialogue = { maxim: Maxim; kept: boolean; lines: [string, string][]; why: string; speaker?: number };
export const DIALOGUES: Dialogue[] = [
  { maxim: "quantity", kept: false, lines: [["민지", "주말에 뭐 했어?"], ["준호", "토요일 아침 일곱 시에 일어나서 세수하고, 칫솔에 치약을 짜서 양치하고, 아침으로 식빵 두 쪽을 먹고…"]], why: "묻는 말에 필요한 것보다 훨씬 많은 정보를 늘어놓았다." },
  { maxim: "quantity", kept: false, lines: [["손님", "도서관이 어디 있나요?"], ["학생", "저쪽이요."]], why: "길을 찾는 데 필요한 정보가 너무 적다." },
  { maxim: "quality", kept: false, lines: [["지아", "내일 시험 범위 알아?"], ["태민", "잘 모르지만 아마 3단원까지일걸. 확실해."]], why: "확실하지 않은 것을 근거 없이 확실하다고 말했다." },
  { maxim: "relation", kept: false, lines: [["선생님", "숙제는 다 해 왔니?"], ["학생", "선생님, 오늘 날씨가 정말 좋네요."]], why: "묻는 말과 관계없는 이야기를 했다." },
  { maxim: "manner", kept: false, lines: [["엄마", "언제 들어오니?"], ["아들", "좀 늦을 수도 있고 일찍 올 수도 있고, 봐서 적당히 갈게요."]], why: "모호하게 말해 언제 오는지 알 수 없다." },
  { maxim: "manner", kept: true, lines: [["팀장", "회의 결과를 알려 줄래요?"], ["사원", "결론은 두 가지입니다. 첫째, 행사는 다음 주 금요일로 미룹니다. 둘째, 장소는 강당으로 바꿉니다."]], why: "요점을 간결하고 조리 있게 차례대로 말했다." },
  { maxim: "tact", kept: true, lines: [["학생", "선생님, 바쁘시지 않으시면 이 문제 좀 봐 주실 수 있을까요?"], ["선생님", "그래, 가져와 보렴."]], why: "부탁할 때 상대의 부담을 줄이는 말로 조심스럽게 요청했다.", speaker: 0 },
  { maxim: "generosity", kept: true, lines: [["손님", "제가 잘 못 들어서 그러는데, 한 번만 더 말씀해 주시겠어요?"], ["직원", "네, 다시 설명해 드릴게요."]], why: "상대가 설명을 잘못했다고 하지 않고, 자신이 잘 못 들었다고 탓을 자신에게 돌렸다.", speaker: 0 },
  { maxim: "approbation", kept: true, lines: [["하윤", "내가 만든 발표 자료인데 어때?"], ["서준", "그림이 한눈에 들어와서 좋다. 글씨만 조금 키우면 더 잘 보이겠어."]], why: "상대를 먼저 칭찬하고, 고칠 점은 부드럽게 말했다." },
  { maxim: "modesty", kept: true, lines: [["친구", "이번 대회에서 상 받았다며? 정말 대단하다!"], ["수아", "운이 좋았어. 아직 배울 게 많아."]], why: "칭찬을 받았을 때 자신을 낮추어 말했다." },
  { maxim: "agreement", kept: true, lines: [["도윤", "체육 대회 날 반 티셔츠를 맞추자."], ["예린", "좋은 생각이야. 다만 값이 부담될 수 있으니 싼 곳을 알아보면 어떨까?"]], why: "상대 의견에 먼저 동의한 뒤 자신의 의견을 덧붙였다." },
  { maxim: "approbation", kept: false, lines: [["동생", "누나, 내가 그린 그림 봐."], ["누나", "이게 그림이야? 낙서인 줄 알았네."]], why: "상대를 비난하는 말을 하여 찬동의 격률을 어겼다." },
];
export function dialogueHtml(dialogue: Dialogue) {
  return `<span style="display:block;margin:1mm 0 1mm 4mm;padding-left:2mm;border-left:2px solid #999">${dialogue.lines.map(([who, said]) => `${escapeHtml(who)}: ${escapeHtml(said)}`).join("<br>")}</span>`;
}

export type SpeechAsk = "maxim" | "keptBroken" | "principle" | "proposition" | "discussion";
export const speechAsks: Record<SpeechAsk, string> = { maxim: "격률 찾기", keptBroken: "지킴·어김 판단", principle: "격률의 뜻", proposition: "논제 유형", discussion: "토의 유형" };

export function speechProblems(asks: SpeechAsk[], count: number, seed: number): SheetSection[] {
  const sections: SheetSection[] = [];
  const maxims = Object.keys(MAXIMS) as Maxim[];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "maxim" || ask === "keptBroken") {
      for (const [index, dialogue] of shuffled(DIALOGUES, seed * 29 + asks.indexOf(ask)).slice(0, count).entries()) {
        const maxim = MAXIMS[dialogue.maxim];
        if (ask === "maxim") {
          const choices = shuffled([dialogue.maxim, ...shuffled(maxims.filter(key => key !== dialogue.maxim), seed * 3 + index).slice(0, 4)], seed * 5 + index);
          problems.push(problem(`다음 대화와 가장 관련 깊은 대화의 격률은?${dialogueHtml(dialogue)}${choices.map((key, i) => `${circled(i)} ${MAXIMS[key].name}`).join("&nbsp;&nbsp; ")}`,
            `${circled(choices.indexOf(dialogue.maxim))} ${maxim.name}(${maxim.principle}) — ${dialogue.kept ? "지킴" : "어김"}: ${escapeHtml(dialogue.why)}`, { space: 4 }));
        } else {
          const who = dialogue.lines[dialogue.speaker ?? dialogue.lines.length - 1][0];
          problems.push(problem(`다음 대화에서 ‘${escapeHtml(who)}’${particle(who, "은", "는")} 어떤 격률을 지켰는지 또는 어겼는지 쓰고, 그 까닭을 설명하시오.${dialogueHtml(dialogue)}`,
            `${maxim.name} ${dialogue.kept ? "지킴" : "어김"} — ${escapeHtml(dialogue.why)}`, { space: 12 }));
        }
      }
    } else if (ask === "principle") {
      for (const key of shuffled(maxims, seed * 31 + 4).slice(0, count)) problems.push(problem(`${MAXIMS[key].principle}의 ‘${MAXIMS[key].name}’이 무엇인지 설명하시오.`, escapeHtml(MAXIMS[key].meaning), { space: 12 }));
    } else if (ask === "proposition") {
      const kinds = shuffled(Object.keys(PROPOSITIONS) as PropositionKind[], seed * 37 + 1);
      problems.push(problem(`다음 논제의 유형(사실·가치·정책 논제)을 쓰시오.${kinds.map((kind, i) => `<span style="display:block;margin:1mm 0 0 4mm">${circled(i)} ${escapeHtml(PROPOSITIONS[kind].example)}</span>`).join("")}`,
        kinds.map((kind, i) => `${circled(i)} ${PROPOSITIONS[kind].name} — ${escapeHtml(PROPOSITIONS[kind].meaning)}`).join("<br>"), { space: 8 }));
    } else {
      for (const type of shuffled(DISCUSSION_TYPES, seed * 41 + 2).slice(0, count)) problems.push(problem(`다음 설명에 알맞은 토의 유형을 쓰시오.<span style="display:block;margin:1mm 0 1mm 4mm">${escapeHtml(type.how)}</span>`, `${type.name} — 참여자: ${escapeHtml(type.who)}`, { space: 8 }));
    }
    if (problems.length) sections.push({ heading: speechAsks[ask], problems });
  }
  return sections;
}
