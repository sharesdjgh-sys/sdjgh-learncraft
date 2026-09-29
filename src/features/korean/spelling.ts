/* 국어 문법: 한글 맞춤법(문화체육관광부 고시)에서 자주 헷갈리는 표기와 띄어쓰기 문제입니다. 근거는 한글 맞춤법 조항이나 표준국어대사전 뜻풀이입니다. */
import { circled, escapeHtml, problem, seededRandom, shuffled, type SheetProblem, type SheetSection } from "./sheet";

export type SpellingTopic = "confuse" | "ending" | "adverb" | "sai" | "spacing";
export const spellingTopics: Record<SpellingTopic, string> = { confuse: "헷갈리는 말", ending: "어미·조사", adverb: "-이/-히", sai: "사이시옷", spacing: "띄어쓰기" };
/** 문장의 {바른 표기|틀린 표기} 자리 하나를 묻습니다. */
export type SpellingItem = { topic: SpellingTopic; before: string; right: string; wrong: string; after: string; basis: string };
const item = (topic: SpellingTopic, sentence: string, basis: string): SpellingItem => {
  const match = sentence.match(/^(.*)\{(.+?)\|(.+?)\}(.*)$/);
  if (!match) throw new Error(`맞춤법 예문 형식: ${sentence}`);
  return { topic, before: match[1], right: match[2], wrong: match[3], after: match[4], basis };
};
export const SPELLING_ITEMS: SpellingItem[] = [
  item("confuse", "이제 집에 가도 {돼요|되요}.", "‘되어요’가 줄면 ‘돼요’(제35항 붙임 2)"),
  item("confuse", "훌륭한 과학자가 {되고|돼고} 싶다.", "‘되- + -고’이므로 ‘되고’(‘되어’로 바꿀 수 없음)"),
  item("confuse", "숙제를 아직 {안|않} 했다.", "‘안’은 ‘아니’의 준말(부사), ‘않-’은 ‘아니하-’의 준말"),
  item("confuse", "그는 밥을 먹지 {않았다|안았다}.", "‘-지 아니하다’가 줄면 ‘-지 않다’"),
  item("confuse", "오늘이 몇 월 {며칠|몇일}이지?", "어원이 분명하지 않아 소리대로 ‘며칠’(제27항 붙임 2)"),
  item("confuse", "소문이 {금세|금새} 퍼졌다.", "‘금시에’가 줄어든 말이라 ‘금세’(표준국어대사전)"),
  item("confuse", "친구를 {오랜만에|오랫만에} 만났다.", "‘오래간만’의 준말은 ‘오랜만’(표준국어대사전)"),
  item("confuse", "각자 맡은 {역할|역활}을 다하자.", "‘役割’은 ‘역할’(표준국어대사전)"),
  item("confuse", "첫 만남의 {설렘|설레임}을 잊을 수 없다.", "기본형이 ‘설레다’이므로 명사형은 ‘설렘’"),
  item("confuse", "참 {희한한|희안한} 일이다.", "‘희한하다(稀罕)’(표준국어대사전)"),
  item("confuse", "{왠지|웬지} 기분이 좋다.", "‘왜인지’가 줄면 ‘왠지’"),
  item("confuse", "{웬|왠} 사람이 너를 찾아왔어.", "‘어찌 된, 어떠한’의 뜻인 관형사는 ‘웬’"),
  item("confuse", "문제의 정답을 {맞혔다|맞췄다}.", "문제에 대한 답을 틀리지 않게 하는 것은 ‘맞히다’(표준국어대사전)"),
  item("confuse", "친구와 답을 서로 {맞춰|맞혀} 보았다.", "둘 이상을 나란히 놓고 비교하는 것은 ‘맞추다’(표준국어대사전)"),
  item("confuse", "선생님이 학생들에게 수학을 {가르치신다|가리키신다}.", "지식을 익히게 하는 것은 ‘가르치다’, 방향을 집어 보이는 것은 ‘가리키다’"),
  item("confuse", "편지를 우체국에서 {부쳤다|붙였다}.", "편지·물건을 보내는 것은 ‘부치다’(제57항)"),
  item("confuse", "봉투에 우표를 {붙였다|부쳤다}.", "맞닿아 떨어지지 않게 하는 것은 ‘붙이다’(제57항)"),
  item("confuse", "약속은 {반드시|반듯이} 지켜야 한다.", "‘틀림없이 꼭’은 ‘반드시’, ‘비뚤어지지 않게’는 ‘반듯이’(제57항)"),
  item("confuse", "{이따가|있다가} 다시 전화할게.", "‘조금 지난 뒤에’는 ‘이따가’(제57항)"),
  item("confuse", "오래 앉아 있었더니 다리가 {저리다|절이다}.", "피가 잘 통하지 않아 감각이 둔한 것은 ‘저리다’(제57항)"),
  item("confuse", "배추를 소금에 {절였다|저렸다}.", "소금·식초에 담가 간이 배게 하는 것은 ‘절이다’(제57항)"),
  item("confuse", "학생 수를 두 배로 {늘렸다|늘였다}.", "수·양을 많게 하는 것은 ‘늘리다’, 길이를 길게 하는 것은 ‘늘이다’(제57항)"),
  item("ending", "나는 학생{으로서|으로써} 할 일을 다했다.", "자격·지위는 ‘-(으)로서’, 수단·도구는 ‘-(으)로써’(제57항)"),
  item("ending", "대화{로써|로서} 갈등을 풀었다.", "수단·방법을 나타내므로 ‘-(으)로써’(제57항)"),
  item("ending", "사과를 먹{든지|던지} 배를 먹{든지}.", "선택은 ‘-든지’, 지난 일의 회상은 ‘-던’(제56항)"),
  item("ending", "어제 얼마나 {춥던지|춥든지} 손이 얼었다.", "지난 일을 떠올리는 뜻이므로 ‘-던지’(제56항)"),
  item("ending", "내가 먼저 {할게|할께}.", "어미 ‘-(으)ㄹ게’는 된소리로 나더라도 예사소리로 적어요(제53항)"),
  item("ending", "이제 {어떡해|어떻해}?", "‘어떻게 해’가 줄면 ‘어떡해’(표준국어대사전)"),
  item("ending", "저는 이 학교 {학생이에요|학생이예요}.", "받침 있는 말 뒤는 ‘-이에요’, 받침 없는 말 뒤는 ‘-예요’(‘-이에요’의 준말)"),
  item("ending", "그건 제 잘못이 {아니에요|아니예요}.", "‘아니- + -에요’이므로 ‘아니에요’"),
  item("ending", "민수가 내일 {온대|온데}.", "남의 말을 전할 때는 ‘-대’(‘-다고 해’가 준 말)(표준국어대사전)"),
  item("adverb", "방을 {깨끗이|깨끗히} 치웠다.", "끝음절이 분명히 ‘이’로만 나는 말은 ‘-이’(제51항)"),
  item("adverb", "그 일을 {곰곰이|곰곰히} 생각해 보았다.", "‘-이’로만 소리 나므로 ‘곰곰이’(제51항)"),
  item("adverb", "선물을 {일일이|일일히} 포장했다.", "‘-이’로만 소리 나므로 ‘일일이’(제51항)"),
  item("adverb", "시간 날 때 {틈틈이|틈틈히} 책을 읽는다.", "‘-이’로만 소리 나므로 ‘틈틈이’(제51항)"),
  item("adverb", "숙제를 {꼼꼼히|꼼꼼이} 확인했다.", "‘히’로 나거나 ‘이·히’로 나는 말은 ‘-히’(제51항)"),
  item("adverb", "자기 생각을 {솔직히|솔직이} 말했다.", "‘-히’로 적는 말(제51항)"),
  item("adverb", "{가만히|가만이} 앉아 있어라.", "‘-히’로 적는 말(제51항)"),
  item("sai", "창으로 {햇빛|해빛}이 들어온다.", "순우리말 합성어에서 뒷말 첫소리가 된소리로 나므로 사이시옷(제30항)"),
  item("sai", "{나뭇잎|나무잎}이 떨어진다.", "뒷말 모음 앞에서 ‘ㄴㄴ’ 소리가 덧나므로 사이시옷(제30항)"),
  item("sai", "{깻잎|깨잎}에 밥을 싸 먹었다.", "‘ㄴㄴ’ 소리가 덧나므로 사이시옷(제30항)"),
  item("sai", "책의 {머리말|머릿말}을 읽었다.", "[머리말]로 발음하여 소리가 덧나지 않으므로 사이시옷을 적지 않아요(제30항)"),
  item("sai", "{해님|햇님}이 방긋 웃는다.", "‘해 + -님’은 합성어가 아니라 파생어라 사이시옷을 적지 않아요(제30항)"),
  item("sai", "햅쌀을 {곳간|고간}에 넣었다.", "한자어 여섯 낱말(곳간·셋방·숫자·찻간·툇간·횟수)에만 사이시옷(제30항)"),
];
/** 띄어쓰기 문제: 바르게 띄어 쓴 문장과 근거 */
export const SPACING_ITEMS: { sentence: string; basis: string }[] = [
  { sentence: "나도 할 수 있다.", basis: "의존 명사 ‘수’는 띄어 써요(제42항). 조사 ‘도’는 붙여 써요(제41항)." },
  { sentence: "아는 것이 힘이다.", basis: "의존 명사 ‘것’은 띄어 써요(제42항)." },
  { sentence: "그가 떠난 지 사흘이 지났다.", basis: "시간의 경과를 나타내는 의존 명사 ‘지’는 띄어 써요(제42항)." },
  { sentence: "그가 올지 안 올지 모르겠다.", basis: "‘-(으)ㄹ지’는 어미라 붙여 써요." },
  { sentence: "사흘 만에 집에 돌아왔다.", basis: "시간이 지났음을 나타내는 ‘만’은 의존 명사라 띄어 써요(제42항)." },
  { sentence: "하루 종일 공부만 했다.", basis: "한정을 나타내는 ‘만’은 조사라 붙여 써요(제41항)." },
  { sentence: "지금 가는 데가 어디니?", basis: "장소를 나타내는 ‘데’는 의존 명사라 띄어 써요(제42항)." },
  { sentence: "비가 오는데 우산이 없다.", basis: "‘-는데’는 어미라 붙여 써요." },
  { sentence: "약속한 대로 하자.", basis: "‘그와 같이’의 뜻인 ‘대로’는 의존 명사라 띄어 써요(제42항)." },
  { sentence: "너는 너대로 해라.", basis: "체언 뒤 ‘대로’는 조사라 붙여 써요(제41항)." },
  { sentence: "그저 웃을 뿐이다.", basis: "용언 뒤 ‘뿐’은 의존 명사라 띄어 써요(제42항)." },
  { sentence: "믿을 사람은 너뿐이다.", basis: "체언 뒤 ‘뿐’은 조사라 붙여 써요(제41항)." },
  { sentence: "사과 한 개와 연필 두 자루를 샀다.", basis: "단위를 나타내는 명사는 띄어 써요(제43항)." },
];
/** 띄어쓰기 없이 붙여 쓴 문장 */
export const joined = (sentence: string) => sentence.replace(/\s+/g, "");

export type SpellingAsk = "choose" | "fix" | "spacing";
export const spellingAsks: Record<SpellingAsk, string> = { choose: "바른 표기 고르기", fix: "틀린 곳 고쳐 쓰기", spacing: "바르게 띄어 쓰기" };

export function spellingProblems(asks: SpellingAsk[], topics: SpellingTopic[], count: number, seed: number): SheetSection[] {
  const random = seededRandom(seed * 29 + 5);
  const shuffle = <T,>(items: T[]) => shuffled(items, Math.floor(random() * 1e9));
  const pool = SPELLING_ITEMS.filter(entry => topics.includes(entry.topic));
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "choose") {
      for (const entry of shuffle(pool).slice(0, count)) {
        const options = random() < 0.5 ? [entry.right, entry.wrong] : [entry.wrong, entry.right];
        // 한 예문에 같은 선택지가 두 번 나오면(먹든지 … 먹든지) 뒤의 것은 바른 표기로 둡니다.
        const after = entry.after.replace(/\{(.+?)\}/g, "$1");
        problems.push(problem(`( ) 안에서 바른 표기를 고르시오.<br>${escapeHtml(entry.before)}(${options.map(escapeHtml).join(" / ")})${escapeHtml(after)}`,
          `${escapeHtml(entry.right)} — ${escapeHtml(entry.basis)}`));
      }
    } else if (ask === "fix") {
      for (const entry of shuffle(pool).slice(0, count)) {
        const after = entry.after.replace(/\{(.+?)\}/g, "$1");
        problems.push(problem(`다음 문장에서 맞춤법에 맞지 않는 곳을 찾아 바르게 고쳐 쓰시오.<br>${escapeHtml(entry.before + entry.wrong + after)}`,
          `${escapeHtml(entry.wrong)} → ${escapeHtml(entry.right)} — ${escapeHtml(entry.basis)}`, { space: 6 }));
      }
    } else if (topics.includes("spacing")) {
      const items = shuffle(SPACING_ITEMS).slice(0, Math.max(2, count));
      problems.push(problem(`다음 문장을 바르게 띄어 쓰시오.<br>${items.map((entry, at) => `${circled(at)} ${escapeHtml(joined(entry.sentence))}`).join("<br>")}`,
        items.map((entry, at) => `${circled(at)} ${escapeHtml(entry.sentence)} — ${escapeHtml(entry.basis)}`).join("<br>"), { space: 16 }));
    }
    if (problems.length) sections.push({ heading: spellingAsks[ask], problems });
  }
  return sections;
}
