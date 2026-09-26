/* 윤리: 실천적 삼단 논법(도덕 원리 → 사실 판단 → 도덕 판단)과 도덕 원리 검사 학습지입니다. */
import { circled, escapeHtml, objectParticle, problem, seededRandom, sheetTable, shuffled, type SheetProblem, type SheetSection } from "./sheet";

export type Syllogism = { principle: string; fact: string; judgment: string };
export const SYLLOGISM_EXAMPLES: Syllogism[] = [
  { principle: "남의 물건을 허락 없이 가져가는 것은 옳지 않다.", fact: "인터넷에 올라온 남의 그림을 허락 없이 내려받아 파는 것은 남의 물건을 허락 없이 가져가는 것이다.", judgment: "인터넷에 올라온 남의 그림을 허락 없이 내려받아 파는 것은 옳지 않다." },
  { principle: "생명을 함부로 해치는 행위는 옳지 않다.", fact: "재미로 길고양이를 괴롭히는 것은 생명을 함부로 해치는 행위이다.", judgment: "재미로 길고양이를 괴롭히는 것은 옳지 않다." },
  { principle: "다른 사람의 사생활을 침해해서는 안 된다.", fact: "친구의 동의 없이 친구 사진을 누리 소통망(SNS)에 올리는 것은 사생활을 침해하는 일이다.", judgment: "친구의 동의 없이 친구 사진을 누리 소통망(SNS)에 올려서는 안 된다." },
  { principle: "약속은 지켜야 한다.", fact: "모둠 과제에서 자료 조사를 맡기로 한 것은 모둠원과 한 약속이다.", judgment: "모둠 과제에서 맡은 자료 조사를 해야 한다." },
  { principle: "다른 사람의 안전을 위협하는 행위를 해서는 안 된다.", fact: "보행자 사이로 전동 킥보드를 빠르게 모는 것은 다른 사람의 안전을 위협하는 행위이다.", judgment: "보행자 사이로 전동 킥보드를 빠르게 몰아서는 안 된다." },
  { principle: "어려움에 처한 사람을 도와야 한다.", fact: "지진 피해를 입은 지역의 주민들은 어려움에 처한 사람들이다.", judgment: "지진 피해를 입은 지역의 주민들을 도와야 한다." },
  { principle: "다른 사람을 차별해서는 안 된다.", fact: "피부색을 이유로 아르바이트 채용을 거절하는 것은 차별이다.", judgment: "피부색을 이유로 아르바이트 채용을 거절해서는 안 된다." },
];

export type PrincipleTest = "role" | "universal" | "counter" | "subsumption";
export const PRINCIPLE_TESTS: Record<PrincipleTest, { name: string; how: string; question: string }> = {
  role: { name: "역할 교환 검사", how: "입장을 바꾸어 그 원리 때문에 피해를 보는 사람의 처지에서도 받아들일 수 있는지 따져 봐요.", question: "내가 그 행동의 영향을 받는 사람이라도 이 원리를 받아들일 수 있을까?" },
  universal: { name: "보편화 결과 검사", how: "모든 사람이 그 원리에 따라 행동했을 때의 결과를 받아들일 수 있는지 따져 봐요.", question: "모든 사람이 이 원리대로 행동하면 어떤 결과가 생길까?" },
  counter: { name: "반증 사례 검사", how: "그 원리를 적용하기 어려운 반대 사례를 찾아 원리를 고치거나 조건을 붙여야 하는지 따져 봐요.", question: "이 원리가 들어맞지 않는 경우는 없을까?" },
  subsumption: { name: "포섭 검사", how: "그 원리를 더 일반적인 상위 원리에 포함시켜 정당화할 수 있는지 따져 봐요.", question: "이 원리를 뒷받침하는 더 넓은 원리는 무엇일까?" },
};
/** 검사 이름을 맞히는 짧은 사례입니다. */
const TEST_CASES: { text: string; test: PrincipleTest }[] = [
  { text: "‘내가 편하면 약속을 어겨도 된다’는 원리를 모든 사람이 따르면 누구도 약속을 믿지 않게 된다는 점을 들어 이 원리를 비판하였다.", test: "universal" },
  { text: "‘시험에서 부정행위를 해도 된다’는 원리를 모두가 따르면 시험 자체가 의미를 잃게 된다고 생각해 보았다.", test: "universal" },
  { text: "‘친구를 놀려도 괜찮다’는 원리에 대해 ‘내가 놀림을 받는 친구라면 이 원리를 받아들일 수 있을까?’라고 스스로 물었다.", test: "role" },
  { text: "쓰레기를 몰래 버리려던 사람이 자기 집 앞에 남이 쓰레기를 버리는 상황을 떠올리고 생각을 바꾸었다.", test: "role" },
  { text: "‘거짓말은 언제나 옳지 않다’는 원리에 대해, 깜짝 생일잔치를 위해 친구에게 사실을 숨기는 경우를 들어 따져 보았다.", test: "counter" },
  { text: "‘남의 물건에 손대면 안 된다’는 원리에 대해, 쓰러진 사람을 돕기 위해 남의 자전거를 빌려 타는 경우를 떠올려 원리에 조건을 붙였다.", test: "counter" },
  { text: "‘약속을 지켜야 한다’는 원리를 ‘다른 사람을 존중해야 한다’는 더 넓은 원리로 정당화하였다.", test: "subsumption" },
  { text: "‘공공장소에서 조용히 해야 한다’는 원리는 ‘다른 사람에게 피해를 주지 말아야 한다’는 원리에 포함된다고 설명하였다.", test: "subsumption" },
];

/** 문장이 사실 판단인지 도덕 판단인지 가르는 연습용 문장입니다. */
const JUDGMENTS: { text: string; moral: boolean }[] = [
  { text: "우리나라 법정 근로 시간은 1주에 40시간이다.", moral: false },
  { text: "산업화 이후 지구의 평균 기온은 높아졌다.", moral: false },
  { text: "흡연은 폐암에 걸릴 위험을 높인다.", moral: false },
  { text: "플라스틱은 자연에서 분해되는 데 오랜 시간이 걸린다.", moral: false },
  { text: "많은 사람이 거짓말은 나쁘다고 생각한다.", moral: false },
  { text: "우리 반 학생의 절반은 버스를 타고 등교한다.", moral: false },
  { text: "거짓말을 해서는 안 된다.", moral: true },
  { text: "노약자에게 자리를 양보하는 것은 바람직하다.", moral: true },
  { text: "환경을 보호하는 것은 우리 모두의 의무이다.", moral: true },
  { text: "남을 험담하는 것은 옳지 않다.", moral: true },
  { text: "동물을 학대해서는 안 된다.", moral: true },
  { text: "부모님께 효도해야 한다.", moral: true },
];

export type ReasoningAsk = "blank" | "classify" | "test" | "apply";
export const reasoningAsks: Record<ReasoningAsk, string> = { blank: "삼단 논법 빈칸", classify: "사실 판단·도덕 판단 구별", test: "원리 검사 이름 맞히기", apply: "원리 검사 적용(서술)" };

const box = (html: string) => `<div style="margin:1.5mm 0;padding:2mm 3mm;border:1px solid #888">${html}</div>`;
const blank = "(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)";
const PARTS: { key: keyof Syllogism; name: string }[] = [{ key: "principle", name: "도덕 원리" }, { key: "fact", name: "사실 판단" }, { key: "judgment", name: "도덕 판단" }];

/** 삼단 논법을 표로 보여 줍니다. hide에 든 칸은 비웁니다. */
export function syllogismTableHtml(item: Syllogism, hide?: keyof Syllogism) {
  return sheetTable(["단계", "내용"], PARTS.map(part => [part.name, part.key === hide ? blank : escapeHtml(item[part.key])]), { widths: ["22%", "78%"], center: false });
}

export function reasoningProblems(asks: ReasoningAsk[], examples: Syllogism[], perAsk: number, seed: number): SheetSection[] {
  const random = seededRandom(seed * 29 + 11);
  const usable = examples.filter(item => item.principle.trim() && item.fact.trim() && item.judgment.trim());
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "blank" && usable.length) {
      shuffled(usable, seed * 3 + 2).slice(0, perAsk).forEach(item => {
        const part = PARTS[Math.floor(random() * PARTS.length)];
        problems.push(problem(`다음 도덕 추론의 빈칸에 들어갈 ${objectParticle(part.name)} 쓰시오.${syllogismTableHtml(item, part.key)}`, `${part.name}: ${escapeHtml(item[part.key])}`, { space: 4 }));
      });
    } else if (ask === "classify") {
      for (let index = 0; index < perAsk; index += 1) {
        // 사실 판단과 도덕 판단을 세 개씩 섞습니다.
        const picked = shuffled([...shuffled(JUDGMENTS.filter(item => !item.moral), seed * 7 + index).slice(0, 3), ...shuffled(JUDGMENTS.filter(item => item.moral), seed * 5 + index).slice(0, 3)], seed * 3 + index);
        const rows = picked.map((item, at) => `${"ㄱㄴㄷㄹㅁㅂ"[at]}. ${escapeHtml(item.text)}`).join("<br>");
        const facts = picked.flatMap((item, at) => item.moral ? [] : ["ㄱㄴㄷㄹㅁㅂ"[at]]);
        const morals = picked.flatMap((item, at) => item.moral ? ["ㄱㄴㄷㄹㅁㅂ"[at]] : []);
        const tricky = picked.some(item => item.text.startsWith("많은 사람이"));
        problems.push(problem(`다음 문장을 사실 판단과 도덕 판단으로 구분하시오.${box(rows)}사실 판단: ________________ &nbsp; 도덕 판단: ________________`,
          `사실 판단: ${facts.join(", ") || "없음"} / 도덕 판단: ${morals.join(", ") || "없음"}${tricky ? " (‘많은 사람이 ~라고 생각한다’는 사람들의 생각을 전하는 사실 판단이에요.)" : ""}`));
      }
    } else if (ask === "test") {
      shuffled(TEST_CASES, seed * 5 + 1).slice(0, perAsk).forEach((item, index) => {
        const order = shuffled(Object.keys(PRINCIPLE_TESTS) as PrincipleTest[], seed + index);
        problems.push(problem(`다음 사례에서 사용한 도덕 원리 검사 방법은?${box(escapeHtml(item.text))}${order.map((test, at) => `${circled(at)} ${PRINCIPLE_TESTS[test].name}`).join("&nbsp;&nbsp;&nbsp;")}`,
          `${circled(order.indexOf(item.test))} ${PRINCIPLE_TESTS[item.test].name} — ${escapeHtml(PRINCIPLE_TESTS[item.test].how)}`));
      });
    } else if (ask === "apply" && usable.length) {
      shuffled(usable, seed * 11 + 4).slice(0, perAsk).forEach((item, index) => {
        const test = (Object.keys(PRINCIPLE_TESTS) as PrincipleTest[])[(seed + index) % 4];
        problems.push(problem(`다음 도덕 원리를 ${PRINCIPLE_TESTS[test].name}로 검토하여 서술하시오.${box(escapeHtml(item.principle))}<span style="font-size:9.5pt;color:#444">생각할 질문: ${escapeHtml(PRINCIPLE_TESTS[test].question)}</span>`,
          `예시: ${escapeHtml(PRINCIPLE_TESTS[test].how)} 이 기준에 비추어 원리를 받아들일 수 있는지와 그 까닭을 쓰면 돼요.`, { space: 24 }));
      });
    }
    if (problems.length) sections.push({ heading: reasoningAsks[ask], problems });
  }
  return sections;
}
