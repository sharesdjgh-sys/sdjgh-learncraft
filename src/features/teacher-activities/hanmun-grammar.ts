import { escapeActivity as esc, answerPage, lines, sheetHeader, shuffledIndices } from "./content";

/* 한문 문장 형식·허사 예문입니다. 교과서에 자주 실리는 널리 알려진 문장만 골랐고,
 * 원문의 띄어 쓴 자리는 쉼표 자리입니다. 독음은 원문 한자와 글자 수가 같아야 합니다(verify-teacher-activities). */

export const grammarForms = {
  negation: { name: "부정", markers: "不·弗·未·非·無·莫", tip: "‘~하지 않다, ~이 아니다, ~이 없다’로 풀이합니다. 未는 ‘아직 ~하지 않다’입니다." },
  prohibition: { name: "금지", markers: "勿·毋·無·莫", tip: "‘~하지 말라’로 풀이합니다." },
  question: { name: "의문·반어", markers: "乎·哉·與·何·誰·孰·安·焉·豈", tip: "반어는 묻는 꼴이지만 답을 정해 두고 뜻을 강조합니다. ‘어찌 ~하겠는가(~하지 않는다)’처럼 풀이합니다." },
  causative: { name: "사동", markers: "使·令·敎·遣", tip: "‘A로 하여금 B하게 하다’로 풀이합니다." },
  passive: { name: "피동", markers: "見·被·爲~所·於", tip: "‘~을 당하다, ~에게 ~되다’로 풀이합니다." },
  conditional: { name: "가정·양보", markers: "若·如·苟·雖·縱·則", tip: "가정은 ‘만약 ~라면’, 양보는 ‘비록 ~일지라도’로 풀이합니다." },
  comparison: { name: "비교", markers: "於·乎·不如·莫若·猶·如", tip: "‘~보다 더 ~하다, ~만 못하다, ~와 같다’로 풀이합니다." },
  limitation: { name: "한정", markers: "唯·惟·只·但·獨·耳·而已(矣)", tip: "‘오직 ~만, ~일 뿐이다’로 풀이합니다." },
  emphasis: { name: "억양", markers: "況~乎·且~況", tip: "앞을 누르고 뒤를 높여 ‘~도 ~한데 하물며 ~이겠는가’로 풀이합니다." },
  exclamation: { name: "감탄", markers: "哉·夫·矣·乎·嗚呼", tip: "‘~하구나, ~이로다’로 풀이합니다. 감탄하는 말이 앞으로 나오기도 합니다." },
  particle: { name: "허사의 쓰임", markers: "之·而·於·以·者·也·矣·焉·爲", tip: "같은 글자라도 문장 속 자리에 따라 쓰임이 달라집니다." },
} as const;
export type GrammarForm = keyof typeof grammarForms;
export const grammarFormKeys = Object.keys(grammarForms) as GrammarForm[];

export type GrammarItem = {
  id: string; form: GrammarForm;
  /** 원문. 띄어 쓴 자리는 쉼표 자리입니다. */
  text: string; reading: string; translation: string; source: string;
  /** 빈칸 문제로 비울 핵심 허사(원문에 반드시 있어야 합니다) */
  marker: string;
  /** 밑줄로 표시할 글자·어구 */
  marks: string[];
  point: string;
};

export const grammarItems: GrammarItem[] = [
  { id: "n1", form: "negation", text: "學而不思則罔 思而不學則殆", reading: "학이불사즉망 사이불학즉태", translation: "배우기만 하고 생각하지 않으면 얻는 것이 없고, 생각만 하고 배우지 않으면 위태롭다.", source: "《논어》 위정", marker: "不", marks: ["不", "則"], point: "不는 뒤의 동사를 부정합니다. 則은 ‘~하면’으로 앞뒤를 조건으로 잇습니다." },
  { id: "n2", form: "negation", text: "民無信不立", reading: "민무신불립", translation: "백성에게 믿음이 없으면 (나라가) 설 수 없다.", source: "《논어》 안연", marker: "無", marks: ["無", "不"], point: "無는 ‘~이 없다’로 명사를, 不는 ‘~하지 않다’로 동사를 부정합니다." },
  { id: "n3", form: "negation", text: "人非生而知之者 孰能無惑", reading: "인비생이지지자 숙능무혹", translation: "사람은 태어나면서부터 아는 자가 아니니, 누가 의혹이 없을 수 있겠는가.", source: "한유 〈사설〉", marker: "非", marks: ["非", "孰"], point: "非는 ‘~이 아니다’로 체언 서술을 부정합니다. 뒤 구절의 孰은 반어입니다." },
  { id: "p1", form: "prohibition", text: "非禮勿視", reading: "비례물시", translation: "예가 아니면 보지 말라.", source: "《논어》 안연", marker: "勿", marks: ["勿"], point: "勿은 ‘~하지 말라’는 금지입니다. 非는 ‘~이 아니면’으로 풀이합니다." },
  { id: "p2", form: "prohibition", text: "己所不欲 勿施於人", reading: "기소불욕 물시어인", translation: "자기가 하고 싶지 않은 것을 남에게 베풀지 말라.", source: "《논어》 위령공", marker: "勿", marks: ["勿", "於"], point: "所不欲은 ‘하고 싶지 않은 것’입니다. 於는 ‘~에게’로 대상을 나타냅니다." },
  { id: "q1", form: "question", text: "學而時習之 不亦說乎", reading: "학이시습지 불역열호", translation: "배우고 때때로 그것을 익히면 또한 기쁘지 아니한가.", source: "《논어》 학이", marker: "乎", marks: ["不亦", "乎"], point: "不亦~乎는 ‘또한 ~하지 아니한가’로 뜻을 강조하는 반어입니다. 說은 ‘기쁘다(열)’입니다." },
  { id: "q2", form: "question", text: "與朋友交而不信乎", reading: "여붕우교이불신호", translation: "벗과 사귀면서 미덥지 못하지는 않았는가?", source: "《논어》 학이", marker: "乎", marks: ["與", "乎"], point: "乎는 의문 종결사입니다. 與는 ‘~와(과)’입니다." },
  { id: "q3", form: "question", text: "未知生 焉知死", reading: "미지생 언지사", translation: "아직 삶도 알지 못하는데 어찌 죽음을 알겠는가.", source: "《논어》 선진", marker: "焉", marks: ["未", "焉"], point: "焉은 ‘어찌’로 반어를 만듭니다. 未는 ‘아직 ~하지 않다’입니다." },
  { id: "q4", form: "question", text: "燕雀安知鴻鵠之志哉", reading: "연작안지홍곡지지재", translation: "제비와 참새가 어찌 기러기와 고니의 뜻을 알겠는가.", source: "《사기》 진섭세가", marker: "安", marks: ["安", "之", "哉"], point: "安~哉는 ‘어찌 ~하겠는가’의 반어입니다. 之는 ‘~의’입니다." },
  { id: "q5", form: "question", text: "王何必曰利", reading: "왕하필왈리", translation: "왕께서는 하필 이익을 말씀하십니까?", source: "《맹자》 양혜왕 상", marker: "何", marks: ["何必"], point: "何必은 ‘하필, 어찌 꼭’으로 이익을 말할 필요가 없다는 뜻을 담습니다." },
  { id: "c1", form: "causative", text: "天帝使我長百獸", reading: "천제사아장백수", translation: "천제께서 나로 하여금 온갖 짐승의 우두머리가 되게 하셨다.", source: "《전국책》 초책", marker: "使", marks: ["使"], point: "使A B는 ‘A로 하여금 B하게 하다’입니다. 長은 ‘우두머리가 되다(장)’입니다." },
  { id: "c2", form: "causative", text: "使子路問津焉", reading: "사자로문진언", translation: "(공자께서) 자로로 하여금 나루터를 묻게 하셨다.", source: "《논어》 미자", marker: "使", marks: ["使", "焉"], point: "사동 구조입니다. 焉은 ‘그에게(於是)’의 뜻이 담긴 종결사입니다." },
  { id: "s1", form: "passive", text: "信而見疑 忠而被謗", reading: "신이견의 충이피방", translation: "믿음직한데도 의심을 받고, 충성스러운데도 비방을 당했다.", source: "《사기》 굴원열전", marker: "見", marks: ["見", "被"], point: "見·被는 동사 앞에서 ‘~을 당하다’의 피동을 만듭니다. 而는 역접 ‘~한데도’입니다." },
  { id: "s2", form: "passive", text: "先卽制人 後則爲人所制", reading: "선즉제인 후즉위인소제", translation: "먼저 하면 남을 제압하고, 뒤에 하면 남에게 제압을 당한다.", source: "《사기》 항우본기", marker: "所", marks: ["爲", "所"], point: "爲A所B는 ‘A에게 B를 당하다’의 피동입니다." },
  { id: "g1", form: "conditional", text: "苟日新 日日新 又日新", reading: "구일신 일일신 우일신", translation: "진실로 어느 날 새로워졌거든 날마다 새롭게 하고 또 날로 새롭게 하라.", source: "《대학》", marker: "苟", marks: ["苟"], point: "苟는 ‘진실로 ~라면’의 가정입니다." },
  { id: "g2", form: "conditional", text: "雖有嘉肴 弗食 不知其旨也", reading: "수유가효 불식 부지기지야", translation: "비록 좋은 안주가 있더라도 먹지 않으면 그 맛을 알지 못한다.", source: "《예기》 학기", marker: "雖", marks: ["雖", "弗"], point: "雖는 ‘비록 ~일지라도’의 양보입니다. 弗은 不과 같은 부정입니다." },
  { id: "m1", form: "comparison", text: "苛政猛於虎也", reading: "가정맹어호야", translation: "가혹한 정치는 호랑이보다 사납다.", source: "《예기》 단궁", marker: "於", marks: ["於"], point: "형용사 뒤의 於는 ‘~보다’의 비교입니다." },
  { id: "m2", form: "comparison", text: "霜葉紅於二月花", reading: "상엽홍어이월화", translation: "서리 맞은 잎이 이월의 꽃보다 붉다.", source: "두목 〈산행〉", marker: "於", marks: ["於"], point: "紅於A는 ‘A보다 붉다’입니다." },
  { id: "m3", form: "comparison", text: "百聞不如一見", reading: "백문불여일견", translation: "백 번 듣는 것이 한 번 보는 것만 못하다.", source: "《한서》 조충국전", marker: "不如", marks: ["不如"], point: "A不如B는 ‘A는 B만 못하다’입니다." },
  { id: "m4", form: "comparison", text: "過猶不及", reading: "과유불급", translation: "지나침은 미치지 못함과 같다.", source: "《논어》 선진", marker: "猶", marks: ["猶"], point: "猶는 ‘~와 같다’입니다." },
  { id: "l1", form: "limitation", text: "夫子之道 忠恕而已矣", reading: "부자지도 충서이이의", translation: "선생님의 도는 충과 서일 뿐이다.", source: "《논어》 이인", marker: "而已矣", marks: ["而已矣"], point: "而已矣는 ‘~일 뿐이다’의 한정입니다. 之는 ‘~의’입니다." },
  { id: "l2", form: "limitation", text: "唯仁者能好人 能惡人", reading: "유인자능호인 능오인", translation: "오직 어진 사람만이 남을 좋아할 수 있고 남을 미워할 수 있다.", source: "《논어》 이인", marker: "唯", marks: ["唯"], point: "唯는 ‘오직 ~만’입니다. 好는 ‘좋아하다(호)’, 惡은 ‘미워하다(오)’입니다." },
  { id: "e1", form: "emphasis", text: "死馬且買之五百金 況生馬乎", reading: "사마차매지오백금 황생마호", translation: "죽은 말도 오백 금에 샀는데, 하물며 살아 있는 말이겠습니까?", source: "《전국책》 연책", marker: "況", marks: ["且", "況", "乎"], point: "A且B 況C乎는 ‘A도 B하는데 하물며 C이겠는가’의 억양입니다." },
  { id: "x1", form: "exclamation", text: "賢哉 回也", reading: "현재 회야", translation: "어질구나, 안회여!", source: "《논어》 옹야", marker: "哉", marks: ["哉"], point: "哉는 감탄입니다. 감탄하는 말(賢)이 주어(回)보다 앞에 나왔습니다." },
  { id: "x2", form: "exclamation", text: "逝者如斯夫 不舍晝夜", reading: "서자여사부 불사주야", translation: "가는 것은 이와 같구나! 밤낮을 쉬지 않는구나.", source: "《논어》 자한", marker: "夫", marks: ["如", "夫"], point: "夫가 문장 끝에서 감탄을 나타냅니다. 如는 ‘~와 같다’입니다." },
  { id: "f1", form: "particle", text: "知之爲知之 不知爲不知 是知也", reading: "지지위지지 부지위부지 시지야", translation: "아는 것을 안다고 하고 알지 못하는 것을 알지 못한다고 하는 것, 이것이 아는 것이다.", source: "《논어》 위정", marker: "爲", marks: ["爲", "也"], point: "爲는 ‘~라고 하다(여기다)’, 之는 대명사 ‘그것’, 也는 단정 종결사입니다." },
  { id: "f2", form: "particle", text: "志士仁人 無求生以害仁 有殺身以成仁", reading: "지사인인 무구생이해인 유살신이성인", translation: "뜻있는 선비와 어진 사람은 살기를 구하여 인을 해치는 일이 없고, 자신을 죽여서 인을 이루는 일은 있다.", source: "《논어》 위령공", marker: "以", marks: ["以"], point: "以는 앞뒤를 ‘~하여, ~함으로써’로 잇습니다." },
  { id: "f3", form: "particle", text: "知者樂水 仁者樂山", reading: "지자요수 인자요산", translation: "지혜로운 사람은 물을 좋아하고, 어진 사람은 산을 좋아한다.", source: "《논어》 옹야", marker: "者", marks: ["者"], point: "者는 ‘~하는 사람’입니다. 樂은 ‘좋아하다(요)’로 읽습니다." },
  { id: "f4", form: "particle", text: "其身正 不令而行", reading: "기신정 불령이행", translation: "그 자신이 바르면 명령하지 않아도 행해진다.", source: "《논어》 자로", marker: "而", marks: ["其", "而"], point: "而는 역접 ‘~해도’로 이어집니다. 其는 ‘그’입니다." },
  { id: "f5", form: "particle", text: "吾十有五而志于學", reading: "오십유오이지우학", translation: "나는 열다섯 살에 학문에 뜻을 두었다.", source: "《논어》 위정", marker: "于", marks: ["而", "于"], point: "于는 於와 같이 ‘~에’입니다. 有는 ‘또(又)’의 뜻으로 十有五는 열다섯입니다." },
  { id: "f6", form: "particle", text: "朝聞道 夕死可矣", reading: "조문도 석사가의", translation: "아침에 도를 들으면 저녁에 죽어도 좋다.", source: "《논어》 이인", marker: "矣", marks: ["矣"], point: "矣는 단정·완료의 종결사입니다." },
  { id: "f7", form: "particle", text: "三人行 必有我師焉", reading: "삼인행 필유아사언", translation: "세 사람이 길을 가면 반드시 (그 가운데) 나의 스승이 있다.", source: "《논어》 술이", marker: "焉", marks: ["焉"], point: "문장 끝 焉은 ‘거기에(於是)’의 뜻이 담긴 종결사입니다. 의문의 焉(어찌)과 비교해 보세요." },
];

export const grammarSheetTypes = {
  reading: "독음 쓰기",
  translate: "풀이하기",
  usage: "밑줄 친 허사의 쓰임",
  blank: "허사 빈칸 채우기",
} as const;
export type GrammarSheetType = keyof typeof grammarSheetTypes;
export const grammarSheetTypeKeys = Object.keys(grammarSheetTypes) as GrammarSheetType[];

export type GrammarSheetOptions = { title: string; types: GrammarSheetType[]; table: boolean; answers: boolean; seed: number };

const HAN_FONT = "font-family:'Noto Serif KR','Batang','바탕',serif";
const textStyle = `${HAN_FONT};font-size:17pt;letter-spacing:1px`;

/** 밑줄 칠 어구를 긴 것부터 찾아 표시합니다. 모든 글은 이스케이프합니다. */
export function markedText(text: string, marks: string[]) {
  const sorted = [...new Set(marks)].filter(Boolean).sort((a, b) => b.length - a.length);
  let html = "";
  for (let i = 0; i < text.length;) {
    const hit = sorted.find(mark => text.startsWith(mark, i));
    if (hit) { html += `<u style="text-underline-offset:3px">${esc(hit)}</u>`; i += hit.length; }
    else { html += esc(text[i]); i += 1; }
  }
  return html;
}
/** 핵심 허사가 처음 나오는 자리를 빈칸으로 바꿉니다. */
export function blankText(text: string, marker: string) {
  const at = text.indexOf(marker);
  if (at < 0) return esc(text);
  return `${esc(text.slice(0, at))}<span style="display:inline-block;min-width:${marker.length * 1.4 + 0.6}em;border-bottom:1px solid #000">&nbsp;</span>${esc(text.slice(at + marker.length))}`;
}

export function grammarReferenceHtml(forms: GrammarForm[]) {
  const cell = 'style="border:1px solid #999;padding:2mm;vertical-align:top"';
  return `<table style="width:100%;border-collapse:collapse;margin:3mm 0 6mm;font-size:10pt"><thead><tr><th ${cell}>형식</th><th ${cell}>대표 허사</th><th ${cell}>풀이 방법</th></tr></thead><tbody>${forms.map(form => `<tr><th ${cell}>${grammarForms[form].name}</th><td ${cell}><span style="${HAN_FONT};font-size:12pt">${esc(grammarForms[form].markers)}</span></td><td ${cell}>${esc(grammarForms[form].tip)}</td></tr>`).join("")}</tbody></table>`;
}

export function grammarSheetHtml(items: GrammarItem[], options: GrammarSheetOptions) {
  let html = sheetHeader(options.title || "한문 문장 형식 활동지");
  const forms = [...new Set(items.map(item => item.form))];
  if (options.table) html += grammarReferenceHtml(forms);
  const answers: string[] = [];
  let number = 0;
  const section = (title: string, body: string) => `<section style="margin:6mm 0"><h2 style="font-size:13pt;border-bottom:2px solid #000;padding-bottom:1mm">${esc(title)}</h2>${body}</section>`;
  const numbered = (body: string, count: number) => `<div style="break-inside:avoid;margin:4mm 0">${body}${lines(count)}</div>`;
  for (const type of options.types) {
    if (type === "reading") {
      html += section(`${sectionNumber(options.types, type)}. 다음 문장의 독음을 쓰시오.`, items.map(item => { number++; answers.push(`${number}. ${esc(item.reading)}`); return numbered(`<p style="${textStyle}">(${number}) ${esc(item.text)}</p>`, 1); }).join(""));
    }
    if (type === "translate") {
      html += section(`${sectionNumber(options.types, type)}. 다음 문장을 우리말로 풀이하시오.`, items.map(item => { number++; answers.push(`${number}. ${esc(item.translation)}`); return numbered(`<p style="${textStyle}">(${number}) ${esc(item.text)} <span style="font-size:9pt;color:#555">— ${esc(item.source)}</span></p>`, 2); }).join(""));
    }
    if (type === "usage") {
      const box = forms.map(form => grammarForms[form].name).join(" · ");
      html += section(`${sectionNumber(options.types, type)}. 밑줄 친 글자의 뜻·쓰임을 쓰고, 문장 형식을 보기에서 고르시오.`, `<p style="border:1px solid #aaa;padding:2mm 3mm"><b>보기</b> ${esc(box)}</p>` + items.map(item => { number++; answers.push(`${number}. ${esc(grammarForms[item.form].name)} — ${esc(item.point)}`); return numbered(`<p style="${textStyle}">(${number}) ${markedText(item.text, item.marks)}</p><p>쓰임: ______________________ 형식: __________</p>`, 0); }).join(""));
    }
    if (type === "blank") {
      const box = shuffledIndices(items.length, options.seed).map(i => items[i].marker);
      html += section(`${sectionNumber(options.types, type)}. 우리말 풀이를 보고 빈칸에 알맞은 허사를 보기에서 골라 쓰시오.`, `<p style="border:1px solid #aaa;padding:2mm 3mm"><b>보기</b> <span style="${HAN_FONT};font-size:13pt">${box.map(esc).join(" · ")}</span></p>` + items.map(item => { number++; answers.push(`${number}. ${esc(item.marker)}`); return numbered(`<p style="${textStyle}">(${number}) ${blankText(item.text, item.marker)}</p><p style="font-size:10pt">${esc(item.translation)}</p>`, 0); }).join(""));
    }
  }
  if (options.answers && answers.length) html += answerPage(`<ol style="list-style:none;padding:0;line-height:1.9">${answers.map(answer => `<li>${answer}</li>`).join("")}</ol>`);
  return html;
}
const sectionNumber = (types: GrammarSheetType[], type: GrammarSheetType) => ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ"][types.indexOf(type)];
