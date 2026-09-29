import type { HanmunSentence } from "./content";
import type { HanjaWord } from "./hanja";

/* 처음 쓰는 선생님이 완성된 모습을 바로 볼 수 있도록 넣어 두는 예시입니다. AI로 만들지 않고 직접 적었으며,
 * scripts/verify-hanmun.ts가 자동 점검(독음·풀이 순서·원문 일치)과 한자어 사전 확인을 통과하는지 봅니다. */

export type HanmunExample = { id: string; title: string; text: string; summary: string; sentences: HanmunSentence[] };

export const HANMUN_EXAMPLES: HanmunExample[] = [
  {
    id: "example-hakii-1",
    title: "[예시] 논어 학이편 1장",
    text: "學而時習之면 不亦說乎아 有朋이 自遠方來면 不亦樂乎아 人不知而不慍이면 不亦君子乎아",
    summary: "배운 것을 때때로 익히는 기쁨, 멀리서 찾아온 벗과 함께하는 즐거움, 남이 알아주지 않아도 성내지 않는 군자의 태도를 말한 공자의 말씀이다.",
    sentences: [
      {
        hyeonto: "學而時習之면 不亦說乎아", reading: "학이시습지 불역열호", order: [1, 0, 2, 4, 3, 7, 5, 6, 0],
        literal: "배우고 때때로 그것을 익히면 또한 기쁘지 아니한가?", free: "배운 것을 늘 익히면 참으로 기쁘지 않겠는가?",
        point: "不亦~乎: ‘또한 ~하지 아니한가’라는 반어 구문",
        words: [
          { term: "而", reading: "이", meaning: "~하고(순접)", kind: "function" },
          { term: "時", reading: "시", meaning: "때때로, 늘", kind: "word" },
          { term: "習", reading: "습", meaning: "익히다", kind: "word" },
          { term: "之", reading: "지", meaning: "그것(배운 것을 가리킴)", kind: "word" },
          { term: "說", reading: "열", meaning: "기쁘다(悅과 같음)", kind: "word" },
          { term: "乎", reading: "호", meaning: "~인가(의문·반어)", kind: "function" },
        ],
      },
      {
        hyeonto: "有朋이 自遠方來면 不亦樂乎아", reading: "유붕 자원방래 불역락호", order: [2, 1, 5, 3, 4, 6, 9, 7, 8, 0],
        literal: "벗이 있어 먼 곳으로부터 찾아오면 또한 즐겁지 아니한가?", free: "뜻을 같이하는 벗이 멀리서 찾아오면 참으로 즐겁지 않겠는가?",
        point: "自: ‘~로부터’라는 출발점을 나타내는 허사",
        words: [
          { term: "朋", reading: "붕", meaning: "벗", kind: "word" },
          { term: "自", reading: "자", meaning: "~로부터(출발점)", kind: "function" },
          { term: "遠方", reading: "원방", meaning: "먼 곳", kind: "word" },
          { term: "樂", reading: "락", meaning: "즐겁다", kind: "word" },
        ],
      },
      {
        hyeonto: "人不知而不慍이면 不亦君子乎아", reading: "인부지이불온 불역군자호", order: [1, 3, 2, 0, 5, 4, 9, 6, 7, 8, 0],
        literal: "남이 알아주지 않아도 성내지 않으면 또한 군자가 아니겠는가?", free: "남이 나를 알아주지 않아도 서운해하지 않는다면 참으로 군자답지 않은가?",
        point: "而: 앞뒤를 반대로 잇는 역접(~하여도)",
        words: [
          { term: "不知", reading: "부지", meaning: "알아주지 않다", kind: "word" },
          { term: "而", reading: "이", meaning: "~하여도(역접)", kind: "function" },
          { term: "慍", reading: "온", meaning: "성내다, 서운해하다", kind: "word" },
          { term: "君子", reading: "군자", meaning: "덕이 높고 학식이 있는 사람", kind: "word" },
        ],
      },
    ],
  },
  {
    id: "example-sulii-21",
    title: "[예시] 논어 술이편 21장",
    text: "三人行에 必有我師焉이니 擇其善者而從之오 其不善者而改之니라",
    summary: "누구에게서나 배울 점을 찾아, 좋은 점은 본받고 좋지 않은 점은 거울삼아 스스로를 고치라는 공자의 말씀이다.",
    sentences: [
      {
        hyeonto: "三人行에 必有我師焉이니", reading: "삼인행 필유아사언", order: [1, 2, 3, 4, 7, 5, 6, 0],
        literal: "세 사람이 길을 가면 반드시 나의 스승이 있으니,", free: "세 사람이 함께 길을 가면 그 가운데 반드시 내가 본받을 스승이 있다.",
        point: "有+명사: ‘~이 있다’. 焉은 문장 끝에서 단정하는 어조사",
        words: [
          { term: "行", reading: "행", meaning: "가다", kind: "word" },
          { term: "必", reading: "필", meaning: "반드시", kind: "word" },
          { term: "師", reading: "사", meaning: "스승", kind: "word" },
          { term: "焉", reading: "언", meaning: "단정·종결의 어조사", kind: "function" },
        ],
      },
      {
        hyeonto: "擇其善者而 從之오", reading: "택기선자이 종지", order: [4, 1, 2, 3, 0, 6, 5],
        literal: "그 좋은 점을 가려서 그것을 따르고,", free: "좋은 점은 골라 본받고,",
        point: "而: 앞뒤를 순하게 잇는 순접. 之는 앞의 善者를 가리키는 대명사",
        words: [
          { term: "擇", reading: "택", meaning: "가리다, 고르다", kind: "word" },
          { term: "善", reading: "선", meaning: "좋다, 착하다", kind: "word" },
          { term: "者", reading: "자", meaning: "~것(점)", kind: "word" },
          { term: "而", reading: "이", meaning: "~하여(순접)", kind: "function" },
          { term: "從", reading: "종", meaning: "따르다", kind: "word" },
        ],
      },
      {
        hyeonto: "其不善者而 改之니라", reading: "기불선자이 개지", order: [1, 3, 2, 4, 0, 6, 5],
        literal: "그 좋지 않은 점은 그것을 고친다.", free: "좋지 않은 점은 거울삼아 나를 고친다.",
        point: "앞 구절과 짝을 이루는 대구. 不善은 善을 부정하여 ‘좋지 않음’",
        words: [
          { term: "其", reading: "기", meaning: "그", kind: "word" },
          { term: "不善", reading: "불선", meaning: "좋지 않음", kind: "word" },
          { term: "而", reading: "이", meaning: "~하여(순접)", kind: "function" },
          { term: "改", reading: "개", meaning: "고치다", kind: "word" },
          { term: "之", reading: "지", meaning: "그것(대명사)", kind: "word" },
        ],
      },
    ],
  },
];

/** 한자 학습지 예시: 학이편 1장의 한자와, 사전에서 확인한 한자어입니다. 而·乎는 교과서 훈음으로 고쳐 둔 모습을 보여 줍니다. */
export const HANJA_EXAMPLE: { title: string; text: string; meanings: Record<string, string>; words: Record<string, HanjaWord[]> } = {
  title: "[예시] 논어 학이편 1장 한자",
  text: HANMUN_EXAMPLES[0].text,
  meanings: { 而: "말 이을 이", 乎: "어조사 호" },
  words: {
    學: [{ word: "學校", reading: "학교", meaning: "배우는 곳" }, { word: "學習", reading: "학습", meaning: "배워서 익힘" }],
    而: [{ word: "而立", reading: "이립", meaning: "서른 살을 이르는 말" }],
    時: [{ word: "時間", reading: "시간", meaning: "어떤 때에서 다른 때까지의 사이" }, { word: "當時", reading: "당시", meaning: "일이 있던 바로 그때" }],
    習: [{ word: "練習", reading: "연습", meaning: "되풀이하여 익힘" }, { word: "習慣", reading: "습관", meaning: "오래 되풀이해 굳어진 행동" }],
    不: [{ word: "不安", reading: "불안", meaning: "마음이 편하지 않음" }, { word: "不足", reading: "부족", meaning: "모자람" }],
    亦: [{ word: "亦是", reading: "역시", meaning: "또한, 마찬가지로" }],
    說: [{ word: "說明", reading: "설명", meaning: "알기 쉽게 풀어 말함" }, { word: "小說", reading: "소설", meaning: "꾸며 낸 이야기 글" }],
    乎: [{ word: "斷乎", reading: "단호", meaning: "결심이 굳고 흔들림이 없음" }],
    有: [{ word: "有名", reading: "유명", meaning: "이름이 널리 알려짐" }, { word: "所有", reading: "소유", meaning: "가지고 있음" }],
    朋: [{ word: "朋友", reading: "붕우", meaning: "벗, 친구" }],
    自: [{ word: "自然", reading: "자연", meaning: "사람의 힘이 더해지지 않은 세상" }, { word: "自由", reading: "자유", meaning: "남에게 얽매이지 않음" }],
    遠: [{ word: "永遠", reading: "영원", meaning: "끝없이 이어짐" }, { word: "遠方", reading: "원방", meaning: "먼 곳" }],
    方: [{ word: "方法", reading: "방법", meaning: "일을 해 나가는 수단" }, { word: "地方", reading: "지방", meaning: "어느 방면의 땅" }],
    來: [{ word: "未來", reading: "미래", meaning: "앞으로 올 때" }, { word: "往來", reading: "왕래", meaning: "가고 옴" }],
    樂: [{ word: "音樂", reading: "음악", meaning: "소리로 나타내는 예술" }, { word: "娛樂", reading: "오락", meaning: "즐겁게 노는 일" }],
    人: [{ word: "人間", reading: "인간", meaning: "사람" }, { word: "他人", reading: "타인", meaning: "다른 사람" }],
    知: [{ word: "知識", reading: "지식", meaning: "배우거나 겪어서 아는 것" }, { word: "知己", reading: "지기", meaning: "나를 잘 알아주는 벗" }],
    君: [{ word: "君子", reading: "군자", meaning: "덕이 높은 사람" }, { word: "君主", reading: "군주", meaning: "나라의 임금" }],
    子: [{ word: "子女", reading: "자녀", meaning: "아들과 딸" }, { word: "弟子", reading: "제자", meaning: "가르침을 받는 사람" }],
  },
};
