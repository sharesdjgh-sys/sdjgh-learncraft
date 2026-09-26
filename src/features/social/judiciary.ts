/* 법과 사회·정치: 심급 제도, 헌법 재판소의 권한과 결정 정족수, 형사 절차와 인권 보장 제도, 문제입니다. */
import { arrowSvg, escapeHtml, plainText, seededRandom, sheetTable, shuffled, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

/* ───── 심급 제도 ───── */
/** 민사·형사 사건의 기본 3심 구조입니다(교과서 기본형). */
export function courtLevelsSvg(width = 620) {
  const height = 300;
  const box = (x: number, y: number, w: number, label: string, color: string) => `<rect x="${x - w / 2}" y="${y - 22}" width="${w}" height="44" rx="10" fill="${color}" stroke="#333" stroke-width="1.1"/>`
    + label.split("\n").map((line, index, lines) => svgText(x, y + 4 + (index - (lines.length - 1) / 2) * 14, line, { anchor: "middle", size: 12, weight: 700 })).join("");
  const left = width * 0.28;
  const right = width * 0.72;
  const rows = [58, 158, 258];
  const body = svgText(20, rows[0] + 4, "1심", { size: 13, weight: 800, color: "#555" }) + svgText(20, rows[1] + 4, "2심", { size: 13, weight: 800, color: "#555" }) + svgText(20, rows[2] + 4, "3심", { size: 13, weight: 800, color: "#555" })
    + svgText(left, 18, "단독 판사 사건", { anchor: "middle", size: 11.5, color: "#666" }) + svgText(right, 18, "합의부 사건", { anchor: "middle", size: 11.5, color: "#666" })
    + arrowSvg(left, rows[0] + 23, left, rows[1] - 24, "#2563eb", 1.8) + svgText(left + 8, (rows[0] + rows[1]) / 2 + 4, "항소", { size: 11.5, color: "#1d4ed8", weight: 700 })
    + arrowSvg(right, rows[0] + 23, right, rows[1] - 24, "#2563eb", 1.8) + svgText(right + 8, (rows[0] + rows[1]) / 2 + 4, "항소", { size: 11.5, color: "#1d4ed8", weight: 700 })
    + arrowSvg(left, rows[1] + 23, width / 2 - 70, rows[2] - 20, "#dc2626", 1.8) + svgText(left - 30, (rows[1] + rows[2]) / 2 + 8, "상고", { size: 11.5, color: "#b91c1c", weight: 700 })
    + arrowSvg(right, rows[1] + 23, width / 2 + 70, rows[2] - 20, "#dc2626", 1.8) + svgText(right + 8, (rows[1] + rows[2]) / 2 + 8, "상고", { size: 11.5, color: "#b91c1c", weight: 700 })
    + box(left, rows[0], 200, "지방 법원·지원\n단독 판사", "#dcfce7") + box(right, rows[0], 200, "지방 법원·지원\n합의부", "#dcfce7")
    + box(left, rows[1], 200, "지방 법원 본원\n합의부(항소부)", "#dbeafe") + box(right, rows[1], 200, "고등 법원", "#dbeafe")
    + box(width / 2, rows[2], 200, "대법원", "#fee2e2");
  return svgWrap(width, height, body);
}

/* ───── 헌법 재판 ───── */
export type Trial = "review" | "impeachment" | "dissolution" | "competence" | "complaint";
export const TRIALS: Record<Trial, { name: string; who: string; what: string; quorum: string; majority: boolean }> = {
  review: { name: "위헌 법률 심판", who: "법원의 제청", what: "재판의 전제가 된 법률이 헌법에 위반되는지 심판", quorum: "재판관 6명 이상 찬성으로 위헌 결정", majority: false },
  impeachment: { name: "탄핵 심판", who: "국회의 탄핵 소추", what: "대통령·국무총리·법관 등 고위 공직자의 파면 여부 심판", quorum: "재판관 6명 이상 찬성으로 파면 결정", majority: false },
  dissolution: { name: "정당 해산 심판", who: "정부의 제소(국무 회의 심의)", what: "목적이나 활동이 민주적 기본 질서에 위배되는 정당의 해산 여부 심판", quorum: "재판관 6명 이상 찬성으로 해산 결정", majority: false },
  competence: { name: "권한 쟁의 심판", who: "국가 기관, 지방 자치 단체", what: "국가 기관·지방 자치 단체 사이의 권한 다툼 심판", quorum: "심리에 참여한 재판관 과반수 찬성", majority: true },
  complaint: { name: "헌법 소원 심판", who: "기본권을 침해받은 국민 / 위헌 법률 심판 제청 신청이 기각된 당사자", what: "공권력으로 침해된 기본권 구제(권리 구제형), 법률의 위헌 여부 심판(위헌 심사형)", quorum: "재판관 6명 이상 찬성으로 인용 결정", majority: false },
};
export const trialKeys = Object.keys(TRIALS) as Trial[];

export function trialsTableHtml() {
  return sheetTable(["심판", "청구(제청)", "내용", "결정 정족수"], trialKeys.map(key => [TRIALS[key].name, TRIALS[key].who, TRIALS[key].what, TRIALS[key].quorum].map(cell => escapeHtml(cell))), { widths: ["16%", "24%", "36%", "24%"], center: false, font: "9.5pt" });
}
/** 헌법 재판소 결정: 재판관 7명 이상이 심리해야 하고, 인용에는 6명(권한 쟁의는 참여 재판관 과반수)이 찬성해야 합니다. */
export function trialDecision(trial: Trial, present: number, favor: number) {
  if (present < 7) return { ok: false, needed: 7, text: "심리 정족수(재판관 7명 이상 출석)에 모자라 심리할 수 없어요." };
  const needed = TRIALS[trial].majority ? Math.floor(present / 2) + 1 : 6;
  return { ok: favor >= needed, needed, text: favor >= needed ? "인용(청구를 받아들임)" : "인용되지 않음(기각·합헌 등)" };
}
const TRIAL_CASES: { text: string; trial: Trial }[] = [
  { text: "국회가 직무 수행 중 헌법을 위반한 대통령에 대해 탄핵 소추를 의결하였다.", trial: "impeachment" },
  { text: "국회가 법관이 직무 집행에서 법률을 위반했다며 탄핵 소추를 의결하였다.", trial: "impeachment" },
  { text: "재판을 맡은 법원이 사건에 적용할 법률 조항이 헌법에 어긋난다고 보고 헌법 재판소에 판단을 구하였다.", trial: "review" },
  { text: "경찰의 공권력 행사로 집회의 자유를 침해당했다고 생각한 시민이 헌법 재판소에 심판을 청구하였다.", trial: "complaint" },
  { text: "재판 당사자가 신청한 위헌 법률 심판 제청을 법원이 기각하자, 당사자가 직접 헌법 재판소에 심판을 청구하였다.", trial: "complaint" },
  { text: "정부가 ○○당의 목적과 활동이 민주적 기본 질서에 위배된다며 해산을 청구하였다.", trial: "dissolution" },
  { text: "국회의원들이 국회의장의 법률안 처리가 자신들의 심의·표결 권한을 침해했다며 심판을 청구하였다.", trial: "competence" },
  { text: "지방 자치 단체가 중앙 행정 기관의 처분이 자치 권한을 침해했다며 심판을 청구하였다.", trial: "competence" },
];

/* ───── 형사 절차 ───── */
export const CRIMINAL_STEPS = ["수사", "기소(공소 제기)", "공판", "판결", "형 집행"];
export const CRIMINAL_STEP_NOTES = ["경찰·검사가 범죄 혐의를 조사해요.", "검사가 법원에 재판을 청구해요.", "법원에서 검사와 피고인(변호인)이 다퉈요.", "유죄·무죄, 형량을 정해요.", "확정된 형을 집행해요."];
export type Right = { name: string; when: string; text: string };
export const RIGHTS: Right[] = [
  { name: "영장 주의", when: "수사", text: "체포·구속·압수·수색에는 원칙적으로 법관이 발부한 영장이 있어야 한다." },
  { name: "진술 거부권", when: "수사·공판", text: "피의자·피고인은 자기에게 불리한 진술을 강요당하지 않는다." },
  { name: "변호인의 조력을 받을 권리", when: "수사·공판", text: "체포·구속된 사람은 즉시 변호인의 도움을 받을 수 있다." },
  { name: "구속 적부 심사", when: "수사", text: "체포·구속된 피의자가 체포·구속이 적법한지 법원에 심사를 청구한다." },
  { name: "보석", when: "기소 후", text: "구속된 피고인이 보증금 납부 등을 조건으로 풀려난다." },
  { name: "무죄 추정의 원칙", when: "판결 확정 전", text: "형사 피고인은 유죄 판결이 확정될 때까지 무죄로 추정된다." },
  { name: "국민 참여 재판", when: "공판", text: "피고인이 원하면 국민 가운데 뽑힌 배심원이 형사 재판(합의부 사건)에 참여하고, 평결은 판사에게 권고적 효력을 가진다." },
  { name: "형사 보상 제도", when: "판결 후", text: "구금되었던 피의자·피고인이 불기소 처분이나 무죄 판결을 받으면 국가에 정당한 보상을 청구한다." },
  { name: "재정 신청", when: "기소", text: "고소·고발인이 검사의 불기소 처분에 불복하여 법원에 기소 여부의 판단을 구한다." },
  { name: "배상 명령 제도", when: "공판", text: "형사 재판 과정에서 범죄 피해자가 별도의 민사 소송 없이 피해 배상을 받을 수 있다." },
];

export function criminalFlowSvg(width = 640) {
  const height = 110;
  const gap = (width - 20) / CRIMINAL_STEPS.length;
  const body = CRIMINAL_STEPS.map((step, index) => {
    const x = 10 + gap * index + gap / 2;
    return `<rect x="${x - gap / 2 + 8}" y="20" width="${gap - 16}" height="44" rx="10" fill="#eef2ff" stroke="#4338ca" stroke-width="1.2"/>` + svgText(x, 47, step, { anchor: "middle", size: 12.5, weight: 800 })
      + svgText(x, 88, index === 0 ? "피의자" : index === 1 ? "피의자 → 피고인" : index === 4 ? "수형자" : "피고인", { anchor: "middle", size: 10.5, color: "#555" })
      + (index < CRIMINAL_STEPS.length - 1 ? arrowSvg(x + gap / 2 - 8, 42, x + gap / 2 + 8, 42, "#4338ca", 1.6) : "");
  }).join("");
  return svgWrap(width, height, body);
}

/* ───── 문제 ───── */
export type JudiciaryAsk = "trial" | "quorum" | "levels" | "steps" | "rights";
export const judiciaryAsks: Record<JudiciaryAsk, string> = { trial: "사례 → 헌법 재판 종류", quorum: "결정 정족수", levels: "심급 제도", steps: "형사 절차 순서", rights: "인권 보장 제도" };

export function judiciaryProblems(asks: JudiciaryAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 29 + 3);
  const next = () => Math.floor(random() * 1e6);
  const problems: SheetProblem[] = [];
  const add = (html: string, answerHtml: string, space = 8) => problems.push({ html, text: plainText(html), answerHtml, answerText: plainText(answerHtml), space });
  const cases = shuffled(TRIAL_CASES, next());
  const rights = shuffled(RIGHTS, next());
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "trial") {
      const item = cases[index % cases.length];
      add(`다음 사례에서 헌법 재판소가 하게 되는 심판의 종류를 쓰시오.<br>“${escapeHtml(item.text)}”`, `${TRIALS[item.trial].name} (${escapeHtml(TRIALS[item.trial].quorum)})`);
    } else if (ask === "quorum") {
      const trial = trialKeys[Math.floor(random() * trialKeys.length)];
      const present = 7 + Math.floor(random() * 3);
      const favor = 4 + Math.floor(random() * (present - 3));
      const decision = trialDecision(trial, present, favor);
      add(`헌법 재판소의 ${TRIALS[trial].name}에 재판관 ${present}명이 참여하여 ${favor}명이 인용(청구 인정) 의견을 냈다. 결과를 쓰고 그 까닭을 설명하시오.`,
        `${decision.text} — ${escapeHtml(TRIALS[trial].quorum)}${TRIALS[trial].majority ? `(참여 ${present}명의 과반수는 ${decision.needed}명)` : ""}`);
    } else if (ask === "levels") {
      const variants = [
        ["지방 법원 단독 판사의 1심 판결에 불복하여 항소하면 2심을 맡는 곳은?", "지방 법원 본원 합의부(항소부)"],
        ["지방 법원 합의부의 1심 판결에 불복하여 항소하면 2심을 맡는 곳은?", "고등 법원"],
        ["2심 판결에 불복하여 상고하면 재판을 맡는 곳은?", "대법원"],
        ["1심 판결에 불복하여 상급 법원에 다시 재판을 청구하는 것을 무엇이라 하는가?", "항소"],
        ["2심 판결에 불복하여 대법원에 재판을 청구하는 것을 무엇이라 하는가?", "상고"],
      ];
      const [question, answer] = variants[(index + next()) % variants.length];
      add(escapeHtml(question), escapeHtml(answer), 6);
    } else if (ask === "steps") {
      const order = shuffled(CRIMINAL_STEPS.map((step, at) => ({ step, at })), next());
      add(`형사 절차를 순서대로 나열하시오.<br>${order.map((item, at) => `(${"가나다라마"[at]}) ${escapeHtml(item.step)}`).join("  ")}`,
        `${[...order].map((item, at) => ({ ...item, label: `(${"가나다라마"[at]})` })).sort((a, b) => a.at - b.at).map(item => item.label).join(" → ")} (수사 → 기소 → 공판 → 판결 → 형 집행)`);
    } else {
      const right = rights[index % rights.length];
      add(`다음 설명에 해당하는 인권 보장 제도를 쓰시오.<br>“${escapeHtml(right.text)}”`, `${escapeHtml(right.name)} (${escapeHtml(right.when)} 단계)`, 6);
    }
  }
  return [{ heading: "법원과 헌법 재판, 형사 절차", problems }];
}
