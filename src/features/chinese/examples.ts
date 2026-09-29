import type { TextSentence } from "@/features/study-text/core";

/* 처음 쓰는 선생님이 완성된 모습을 볼 수 있도록 직접 작성한 예시입니다. 검토 완료 상태로 열립니다. */

export type ChineseExample = { id: string; title: string; text: string; summary: string; sentences: TextSentence[] };

export const CHINESE_EXAMPLES: ChineseExample[] = [
  {
    id: "self-introduction",
    title: "[예시] 자기소개",
    text: "你好！我叫金敏雅。我是韩国人。我今年十七岁，是高中二年级的学生。我喜欢听音乐。认识你很高兴。",
    summary: "한국 고등학생 김민아가 처음 만난 사람에게 이름, 국적, 나이와 학년, 취미를 소개하는 글입니다. 是 문장, 나이 말하기, 喜欢 + 동사가 나옵니다.",
    sentences: [
      { ruby: "{你好|nǐ hǎo}！", translation: "안녕하세요!", grammar: [], words: [{ word: "你好", reading: "nǐ hǎo", meaning: "안녕하세요", pos: "표현" }] },
      {
        ruby: "{我|wǒ}{叫|jiào}{金敏雅|Jīn Mǐn yǎ}。", translation: "제 이름은 김민아입니다.",
        grammar: [{ pattern: "叫 + 이름", surface: "叫", meaning: "~라고 부르다(이름 소개)" }],
        words: [{ word: "叫", reading: "jiào", meaning: "(이름을) ~라고 하다", pos: "동사" }],
      },
      {
        ruby: "{我|wǒ}{是|shì}{韩国人|Hán guó rén}。", translation: "저는 한국 사람입니다.",
        grammar: [{ pattern: "A 是 B", surface: "是", meaning: "A는 B이다" }],
        words: [{ word: "韩国人", reading: "Hán guó rén", meaning: "한국 사람", pos: "명사" }],
      },
      {
        ruby: "{我|wǒ}{今年|jīn nián}{十七|shí qī}{岁|suì}，/{是|shì}{高中|gāo zhōng}{二年级|èr nián jí}{的|de}{学生|xué sheng}。", translation: "저는 올해 열일곱 살이고, 고등학교 2학년 학생입니다.",
        grammar: [{ pattern: "나이 + 岁", surface: "岁", meaning: "~살(나이)" }, { pattern: "명사 + 的 + 명사", surface: "的", meaning: "~의(꾸밈)" }],
        words: [{ word: "今年", reading: "jīn nián", meaning: "올해", pos: "명사" }, { word: "岁", reading: "suì", meaning: "살(나이)", pos: "양사" }, { word: "学生", reading: "xué sheng", meaning: "학생", pos: "명사" }],
      },
      {
        ruby: "{我|wǒ}{喜欢|xǐ huan}{听|tīng}{音乐|yīn yuè}。", translation: "저는 음악 듣는 것을 좋아합니다.",
        grammar: [{ pattern: "喜欢 + 동사", surface: "喜欢", meaning: "~하는 것을 좋아하다" }],
        words: [{ word: "喜欢", reading: "xǐ huan", meaning: "좋아하다", pos: "동사" }, { word: "听", reading: "tīng", meaning: "듣다", pos: "동사" }, { word: "音乐", reading: "yīn yuè", meaning: "음악", pos: "명사" }],
      },
      {
        ruby: "{认识|rèn shi}{你|nǐ}{很|hěn}{高兴|gāo xìng}。", translation: "만나서 반가워요.",
        grammar: [{ pattern: "很 + 형용사", surface: "很", meaning: "매우(형용사 앞)" }],
        words: [{ word: "认识", reading: "rèn shi", meaning: "알다, 알게 되다", pos: "동사" }, { word: "高兴", reading: "gāo xìng", meaning: "기쁘다", pos: "형용사" }],
      },
    ],
  },
  {
    id: "my-day",
    title: "[예시] 나의 하루",
    text: "我每天早上七点起床。吃完早饭以后，我坐公共汽车去学校。我们八点开始上课。放学以后，我常常和朋友一起去图书馆。晚上我十一点睡觉。",
    summary: "글쓴이가 아침에 일어나서 밤에 잘 때까지의 하루 일과를 소개하는 글입니다. 시각 말하기, …以后, 坐 + 교통수단, 和…一起가 나옵니다.",
    sentences: [
      {
        ruby: "{我|wǒ}{每天|měi tiān}{早上|zǎo shang}/{七点|qī diǎn}{起床|qǐ chuáng}。", translation: "저는 매일 아침 7시에 일어납니다.",
        grammar: [{ pattern: "숫자 + 点", surface: "点", meaning: "~시(시각). 시각은 동사 앞에 옴" }],
        words: [{ word: "每天", reading: "měi tiān", meaning: "매일", pos: "명사" }, { word: "早上", reading: "zǎo shang", meaning: "아침", pos: "명사" }, { word: "起床", reading: "qǐ chuáng", meaning: "일어나다", pos: "동사" }],
      },
      {
        ruby: "{吃完|chī wán}{早饭|zǎo fàn}{以后|yǐ hòu}，/{我|wǒ}{坐|zuò}{公共汽车|gōng gòng qì chē}{去|qù}{学校|xué xiào}。", translation: "아침을 먹은 뒤에 저는 버스를 타고 학교에 갑니다.",
        grammar: [{ pattern: "…以后", surface: "以后", meaning: "~한 뒤에" }, { pattern: "坐 + 교통수단 + 去", surface: "坐", meaning: "~을 타고 가다" }],
        words: [{ word: "早饭", reading: "zǎo fàn", meaning: "아침밥", pos: "명사" }, { word: "公共汽车", reading: "gōng gòng qì chē", meaning: "버스", pos: "명사" }, { word: "学校", reading: "xué xiào", meaning: "학교", pos: "명사" }],
      },
      {
        ruby: "{我们|wǒ men}{八点|bā diǎn}{开始|kāi shǐ}{上课|shàng kè}。", translation: "우리는 8시에 수업을 시작합니다.",
        grammar: [{ pattern: "开始 + 동사", surface: "开始", meaning: "~하기 시작하다" }],
        words: [{ word: "开始", reading: "kāi shǐ", meaning: "시작하다", pos: "동사" }, { word: "上课", reading: "shàng kè", meaning: "수업하다", pos: "동사" }],
      },
      {
        ruby: "{放学|fàng xué}{以后|yǐ hòu}，/{我|wǒ}{常常|cháng cháng}{和|hé}{朋友|péng you}{一起|yì qǐ}{去|qù}{图书馆|tú shū guǎn}。", translation: "학교가 끝나면 저는 자주 친구와 함께 도서관에 갑니다.",
        grammar: [{ pattern: "和 A 一起", surface: "和", meaning: "A와 함께" }, { pattern: "常常 + 동사", surface: "常常", meaning: "자주(빈도)" }],
        words: [{ word: "放学", reading: "fàng xué", meaning: "학교가 끝나다", pos: "동사" }, { word: "朋友", reading: "péng you", meaning: "친구", pos: "명사" }, { word: "图书馆", reading: "tú shū guǎn", meaning: "도서관", pos: "명사" }],
      },
      {
        ruby: "{晚上|wǎn shang}{我|wǒ}{十一点|shí yī diǎn}{睡觉|shuì jiào}。", translation: "밤에 저는 11시에 잡니다.", grammar: [],
        words: [{ word: "晚上", reading: "wǎn shang", meaning: "저녁, 밤", pos: "명사" }, { word: "睡觉", reading: "shuì jiào", meaning: "자다", pos: "동사" }],
      },
    ],
  },
];
