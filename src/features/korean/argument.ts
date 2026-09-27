/* 국어 · 작문·화법: 논증 구조, 논증의 오류, 설득 전략(이성·감성·인성)과 문제입니다. 예문은 교과서형으로 지은 것입니다. */
import { emptyRows, type FormSheet } from "./form-sheet";
import { circled, escapeHtml, problem, shuffled, type SheetProblem, type SheetSection } from "./sheet";

export type Fallacy = "hasty" | "adHominem" | "circular" | "strawman" | "falseDilemma" | "bandwagon" | "authority" | "falseCause" | "slippery" | "emotion";
export const FALLACIES: Record<Fallacy, { name: string; meaning: string; examples: string[] }> = {
  hasty: { name: "성급한 일반화의 오류", meaning: "몇 가지 사례만 보고 전체가 그렇다고 결론짓는 오류",
    examples: ["우리 반 친구 두 명이 급식을 남겼다. 그러니 요즘 학생들은 모두 음식을 아낄 줄 모른다.", "어제 산 사과가 맛이 없었으니 이 가게 과일은 다 맛이 없을 것이다."] },
  adHominem: { name: "인신공격의 오류", meaning: "주장의 내용 대신 주장한 사람의 성격·처지를 공격해 주장을 반박하는 오류",
    examples: ["지각을 자주 하는 네가 규칙을 지키자고 말할 자격이 있니? 그러니 네 제안은 받아들일 수 없어.", "그 과학자는 성격이 괴팍하다. 그러니 그의 이론은 틀렸다."] },
  circular: { name: "순환 논증의 오류", meaning: "결론을 이미 참이라고 가정한 전제로 그 결론을 증명하는 오류",
    examples: ["이 책은 좋은 책이다. 왜냐하면 훌륭한 책이기 때문이다.", "그는 정직한 사람이다. 그가 스스로 자신은 거짓말을 하지 않는다고 말했기 때문이다."] },
  strawman: { name: "허수아비 공격의 오류", meaning: "상대의 주장을 약하게 비틀거나 부풀린 뒤 그것을 공격하는 오류",
    examples: ["숙제를 조금 줄이자고? 그럼 공부를 아예 하지 말자는 거구나. 그건 말도 안 돼.", "게임 시간을 정하자는 말은 결국 청소년의 즐거움을 모두 빼앗자는 거야."] },
  falseDilemma: { name: "흑백 논리의 오류", meaning: "중간이나 다른 가능성이 있는데도 두 가지 가운데 하나만 있다고 보는 오류",
    examples: ["우리 편이 아니면 적이다.", "이번 시험에서 1등을 못 하면 실패한 거야."] },
  bandwagon: { name: "군중에 호소하는 오류", meaning: "많은 사람이 그렇게 생각하거나 한다는 것을 근거로 주장이 옳다고 하는 오류",
    examples: ["반 친구들 대부분이 이 운동화를 신으니 이 운동화가 가장 좋은 운동화다.", "모두가 그 영화를 봤으니 그 영화는 훌륭한 영화임이 틀림없다."] },
  authority: { name: "부적절한 권위에 호소하는 오류", meaning: "그 분야와 관계없는 권위자나 유명인의 말을 근거로 드는 오류",
    examples: ["유명한 축구 선수가 이 영양제를 추천했으니 이 영양제는 건강에 좋다.", "인기 가수가 이 경제 정책이 옳다고 했으니 옳은 정책이다."] },
  falseCause: { name: "원인 오판의 오류", meaning: "단지 먼저 일어났다거나 함께 일어났다는 까닭으로 인과 관계가 있다고 보는 오류",
    examples: ["빨간 양말을 신은 날 시험을 잘 봤으니 빨간 양말이 행운을 가져온다.", "까마귀가 날자 배가 떨어졌으니 까마귀 때문에 배가 떨어졌다."] },
  slippery: { name: "미끄러운 비탈길의 오류", meaning: "작은 일이 연쇄적으로 이어져 반드시 나쁜 결과가 될 것이라고 근거 없이 단정하는 오류",
    examples: ["오늘 숙제를 미루면 내일도 미루게 되고, 결국 대학에 떨어져 인생을 망칠 것이다.", "교실에서 과자를 먹게 해 주면 곧 교실이 쓰레기장이 될 것이다."] },
  emotion: { name: "감정에 호소하는 오류", meaning: "논리적 근거 대신 동정심·공포 같은 감정에 기대어 주장을 받아들이게 하는 오류",
    examples: ["제가 밤새 이 보고서를 쓰느라 얼마나 힘들었는지 아시잖아요. 그러니 좋은 점수를 주셔야 해요.", "이 보험에 들지 않으면 가족이 길거리에 나앉게 될 거예요."] },
};
export const fallacyKeys = Object.keys(FALLACIES) as Fallacy[];

export type Appeal = "logos" | "pathos" | "ethos";
export const APPEALS: Record<Appeal, { name: string; meaning: string; examples: string[] }> = {
  logos: { name: "이성적 설득(로고스)", meaning: "타당한 논리와 믿을 만한 근거(통계·연구·사실)로 설득한다.",
    examples: ["최근 조사에 따르면 하루 8시간 이상 잔 학생의 집중력 점수가 평균 20% 높았습니다. 그러니 등교 시간을 늦춰야 합니다.", "이 방식은 비용을 절반으로 줄이면서도 효과는 같다는 실험 결과가 있습니다."] },
  pathos: { name: "감성적 설득(파토스)", meaning: "듣는 이의 감정(공감·연민·두려움·기쁨)을 움직여 설득한다.",
    examples: ["추운 겨울밤, 갈 곳 없는 강아지의 떨리는 눈빛을 떠올려 보세요. 여러분의 작은 손길이 그 생명을 지킬 수 있습니다.", "오늘 우리가 아낀 물 한 방울이 아이들이 뛰놀 내일의 강이 됩니다."] },
  ethos: { name: "인성적 설득(에토스)", meaning: "말하는 이의 전문성·경험·도덕성·신뢰로 설득한다.",
    examples: ["저는 20년 동안 응급실에서 일하며 안전띠 하나로 목숨을 건진 사람들을 수없이 보았습니다.", "3년 동안 학생회에서 일하며 약속을 한 번도 어기지 않은 제가 이 일을 끝까지 책임지겠습니다."] },
};
export const appealKeys = Object.keys(APPEALS) as Appeal[];

/** 논증 구조 틀(주장·이유·근거·반론·재반박) 학습지입니다. */
export function argumentForm(topic: string, claim: string): FormSheet {
  return { title: "논증하는 글 설계", blocks: [
    { kind: "note", text: `주제: ${topic.trim() || "(주제를 쓰세요)"}` },
    { kind: "box", title: "주장", text: claim, height: 10, hint: "무엇을 주장하는지 한 문장으로" },
    { kind: "table", title: "이유와 근거", head: ["이유(왜 그런가?)", "근거(통계·사례·전문가 의견)", "출처"], rows: emptyRows(3, 3), height: 16, widths: ["32%", "48%", "20%"] },
    { kind: "box", title: "예상 반론", height: 14, hint: "내 주장에 반대하는 사람은 무엇이라고 할까?" },
    { kind: "box", title: "재반박", height: 14, hint: "그 반론에 어떻게 답할까?" },
    { kind: "check", title: "논증 점검", items: ["주장이 분명하고 한 가지인가?", "이유와 근거가 주장을 뒷받침하는가?", "근거의 출처가 믿을 만하고 최신인가?", "논증의 오류(성급한 일반화 등)가 없는가?", "반론을 공정하게 소개하고 답했는가?"] },
  ] };
}

export type ArgumentAsk = "fallacy" | "fallacyWhy" | "appeal" | "structure";
export const argumentAsks: Record<ArgumentAsk, string> = { fallacy: "오류 이름 고르기", fallacyWhy: "오류 찾고 고쳐 쓰기", appeal: "설득 전략 구별", structure: "주장·근거 찾기" };
const STRUCTURE_EXAMPLES: { text: string; claim: string; reason: string }[] = [
  { text: "학교 안에 자전거 보관대를 늘려야 한다. 지금 보관대는 30대인데 자전거로 오는 학생은 80명이 넘는다. 자리가 없어 복도에 세운 자전거 때문에 넘어지는 사고도 이번 달에만 세 번 있었다.", claim: "학교 안에 자전거 보관대를 늘려야 한다.", reason: "보관대(30대)보다 자전거로 오는 학생(80명 이상)이 많고, 복도에 세운 자전거 때문에 사고가 났다." },
  { text: "일회용 컵 사용을 줄여야 한다. 일회용 컵은 대부분 재활용되지 못하고 버려진다. 또 컵을 만들고 태우는 과정에서 온실가스가 나와 기후 변화를 부추긴다.", claim: "일회용 컵 사용을 줄여야 한다.", reason: "대부분 재활용되지 못하고, 만들고 태울 때 온실가스가 나온다." },
  { text: "도서관 운영 시간을 저녁 9시까지 늘려야 한다. 설문 결과 학생의 64%가 방과 후 공부할 곳이 없다고 답했다. 또 가까운 공공 도서관은 버스로 40분이나 걸린다.", claim: "도서관 운영 시간을 저녁 9시까지 늘려야 한다.", reason: "학생 64%가 방과 후 공부할 곳이 없고, 공공 도서관은 너무 멀다." },
];

const quote = (text: string) => `<span style="display:block;margin:1mm 0 1mm 4mm;padding-left:2mm;border-left:2px solid #999">${escapeHtml(text)}</span>`;
export function argumentProblems(asks: ArgumentAsk[], count: number, seed: number): SheetSection[] {
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "fallacy" || ask === "fallacyWhy") {
      for (const [index, key] of shuffled(fallacyKeys, seed * 47 + asks.indexOf(ask)).slice(0, count).entries()) {
        const fallacy = FALLACIES[key];
        const example = fallacy.examples[(seed + index) % fallacy.examples.length];
        if (ask === "fallacy") {
          const choices = shuffled([key, ...shuffled(fallacyKeys.filter(item => item !== key), seed * 7 + index).slice(0, 4)], seed * 11 + index);
          problems.push(problem(`다음 글에 나타난 논증의 오류로 알맞은 것은?${quote(example)}${choices.map((item, i) => `${circled(i)} ${FALLACIES[item].name}`).join("<br>")}`, `${circled(choices.indexOf(key))} ${fallacy.name} — ${escapeHtml(fallacy.meaning)}`, { space: 4 }));
        } else {
          problems.push(problem(`다음 글에서 잘못된 점을 찾아 쓰고, 오류가 없도록 고쳐 쓰시오.${quote(example)}`, `${fallacy.name}: ${escapeHtml(fallacy.meaning)} 고쳐 쓴 글은 학생마다 다를 수 있어요. 충분하고 믿을 만한 근거를 들었는지 봐 주세요.`, { space: 18 }));
        }
      }
    } else if (ask === "appeal") {
      const items = shuffled(appealKeys.flatMap(key => APPEALS[key].examples.map(text => ({ key, text }))), seed * 53 + 3).slice(0, Math.max(3, count));
      problems.push(problem(`다음은 어떤 설득 전략(이성적·감성적·인성적 설득)을 쓴 것인지 쓰시오.${items.map((item, i) => `<span style="display:block;margin:1mm 0 0 4mm">${circled(i)} ${escapeHtml(item.text)}</span>`).join("")}`,
        items.map((item, i) => `${circled(i)} ${APPEALS[item.key].name} — ${escapeHtml(APPEALS[item.key].meaning)}`).join("<br>"), { space: 8 }));
    } else {
      for (const example of shuffled(STRUCTURE_EXAMPLES, seed * 59 + 1).slice(0, count)) problems.push(problem(`다음 글의 주장과 그 근거를 찾아 쓰시오.${quote(example.text)}`, `주장: ${escapeHtml(example.claim)}<br>근거: ${escapeHtml(example.reason)}`, { space: 16 }));
    }
    if (problems.length) sections.push({ heading: argumentAsks[ask], problems });
  }
  return sections;
}
