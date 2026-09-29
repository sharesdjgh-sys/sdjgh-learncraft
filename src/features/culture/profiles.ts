import type { SheetLang } from "@/features/language-sheet";
import { CHINA_TOPICS, chinaCategories } from "@/features/chinese/culture-topics";
import { pinyinIssue } from "@/features/chinese/hanzi";
import { alignRuby } from "@/features/japanese/conjugation";
import { JAPAN_TOPICS, japanCategories } from "@/features/japanese/culture-topics";
import { escapeHtml } from "@/features/language-sheet";
import type { CultureTopic, RubyCheck, SheetProfile } from "./core";

/* 일본문화·중국문화 과목마다 다른 점을 모은 설정입니다. 화면·서버·검증 스크립트가 같은 설정을 씁니다.
 * 저장 키는 과목마다 따로 두고, 일본문화는 처음 만든 키를 그대로 써서 이미 저장한 자료와 그림이 남게 합니다. */

export type CultureProfileId = "japan" | "china";
export type CultureProfile = SheetProfile & {
  id: CultureProfileId;
  /** 현지어 이름(일본어·중국어)과 브라우저 읽기 음성 언어입니다. */
  language: string; englishSubject: string; speech: "ja-JP" | "zh-CN"; fontClass: "font-ja" | "font-zh";
  categories: Record<string, string>; topics: CultureTopic[]; defaultTopics: string[];
  /** 읽기 표기 점검과 AI에게 보낼 표기 규칙입니다. */
  rubyCheck: RubyCheck; rubyExample: string; readingRules: string; readingLanguageLabel: string;
  /** 그림 AI에게 보낼 문화 정확성 규칙과, 화면에 보여 줄 규칙 안내·그림 설명 예시입니다. */
  imageRules: string[]; imageHint: string; imageExample: string;
  storage: { topics: string; reading: string; imageDatabase: string };
};

const kanaCheck: RubyCheck = (_base, reading) => /^[ぁ-ゟ゠-ヿー]+$/u.test(reading) ? null : "후리가나는 가나로만 씁니다.";
const alignedRuby = (word: string, reading: string) => alignRuby(word, reading).map(part => part.ruby ? `<ruby>${escapeHtml(part.text)}<rt style="font-size:.5em">${escapeHtml(part.ruby)}</rt></ruby>` : escapeHtml(part.text)).join("");
const wholeRuby = (word: string, reading: string) => reading && reading !== word ? `<ruby>${escapeHtml(word)}<rt style="font-size:.5em">${escapeHtml(reading)}</rt></ruby>` : escapeHtml(word);

const commonImageRules = [
  "Avoid stereotypes, exaggeration or caricature. Do not depict real, identifiable people, celebrities, brand logos or existing copyrighted characters (for example anime, manga or cartoon characters); use original, generic characters.",
  "Keep the composition simple and clear with a clean background so it prints well.",
];

export const CULTURE_PROFILES: Record<CultureProfileId, CultureProfile> = {
  japan: {
    id: "japan", subject: "일본문화", country: "일본", language: "일본어", englishSubject: "Japanese culture", lang: "ja" as SheetLang, speech: "ja-JP", fontClass: "font-ja", rubyName: "후리가나",
    categories: japanCategories, topics: JAPAN_TOPICS, defaultTopics: ["shogatsu"],
    rubyCheck: kanaCheck, rubyExample: "{初詣|はつもうで}", wordRuby: alignedRuby, readingLanguageLabel: "일본어 글 + 해석",
    readingRules: `- language가 native면 일본어로 쓰고, 문단마다 translation에 자연스러운 한국어 해석을 씁니다. level이 easy면 고등학교 일본어Ⅰ 수준(です·ます체, 짧은 문장, 기본 낱말), normal이면 조금 더 긴 문장을 씁니다.
- 일본어 한자에는 모두 {한자|히라가나 읽기}로 후리가나를 답니다. 오쿠리가나는 괄호 밖에 둡니다: {食|た}べます. 가타카나와 숫자에는 달지 않습니다.
- words의 reading은 히라가나(가타카나 낱말은 그대로)입니다.`,
    imageRules: [
      "Depict Japanese customs, clothing, food, buildings and places accurately and respectfully, as they really are in present-day Japan (or in the stated period). Do not mix in Chinese or Korean elements.",
      "If anyone wears a kimono or yukata, the left front panel overlaps the right front panel (seen from the viewer the collar forms a lowercase 'y'). Never draw right-over-left.",
      ...commonImageRules,
    ],
    imageHint: "기모노 여밈 방향처럼 AI가 틀리기 쉬운 점, 다른 나라 풍습과 섞지 않기, 실제 인물·만화 캐릭터를 그리지 않기를 함께 알려 줘요.",
    imageExample: "예: 설날 아침, 일본 가족이 신사에 새해 첫 참배(初詣)를 하러 가는 장면. 입구에 門松 장식이 있고 사람들은 겨울옷과 기모노를 입었다.",
    storage: { topics: "learncraft_japanese_culture_v1", reading: "learncraft_japanese_culture_reading_v1", imageDatabase: "learncraft-japanese-culture" },
  },
  china: {
    id: "china", subject: "중국문화", country: "중국", language: "중국어", englishSubject: "Chinese culture", lang: "zh" as SheetLang, speech: "zh-CN", fontClass: "font-zh", rubyName: "병음",
    categories: chinaCategories, topics: CHINA_TOPICS, defaultTopics: ["chunjie"],
    rubyCheck: pinyinIssue, rubyExample: "{春节|chūn jié}", wordRuby: wholeRuby, readingLanguageLabel: "중국어 글 + 해석",
    readingRules: `- language가 native면 간체자 중국어로 쓰고, 문단마다 translation에 자연스러운 한국어 해석을 씁니다. level이 easy면 고등학교 중국어Ⅰ 수준(짧은 문장, 기본 낱말), normal이면 조금 더 긴 문장을 씁니다.
- 중국어에는 낱말 단위로 {간체자|병음}을 답니다. 병음은 성조 부호로 쓰고 음절마다 띄어 쓰며, 경성은 부호 없이 씁니다: {我们|wǒ men}{喜欢|xǐ huan}{春节|chūn jié}。 문장부호와 숫자에는 달지 않습니다.
- 병음은 사전 성조로 씁니다. 一·不는 성조 변화를 적용해 써도 됩니다(一起 yì qǐ, 不是 bú shì).
- words의 reading은 성조 부호를 붙인 병음(음절마다 띄어 씀)입니다.`,
    imageRules: [
      "Depict Chinese customs, clothing, food, buildings and places accurately and respectfully, as they really are in present-day China (or in the stated period). Do not mix in Japanese or Korean elements.",
      "If any Chinese characters appear, use correct Simplified Chinese characters.",
      "Do not include national flags, political symbols, political leaders or maps showing borders unless the teacher explicitly asks.",
      ...commonImageRules,
    ],
    imageHint: "간체자로 쓰기, 일본·한국 풍습과 섞지 않기, 국기·정치 상징과 실제 인물·만화 캐릭터를 그리지 않기를 함께 알려 줘요.",
    imageExample: "예: 춘절 저녁, 중국 가족이 둥근 식탁에 모여 饺子를 빚는 장면. 문에는 春联과 거꾸로 붙인 福 자가 있다.",
    storage: { topics: "learncraft_chinese_culture_v1", reading: "learncraft_chinese_culture_reading_v1", imageDatabase: "learncraft-chinese-culture" },
  },
};
export const cultureProfile = (id: CultureProfileId) => CULTURE_PROFILES[id];
export const findTopic = (profile: CultureProfile, id: string) => profile.topics.find(topic => topic.id === id);
