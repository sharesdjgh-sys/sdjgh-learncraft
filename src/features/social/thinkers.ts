/* 윤리: 동양·한국·서양 윤리사상과 사회사상·실천 윤리의 사상가 카드와 학습지입니다. 주장은 원문 인용이 아니라 교과서식으로 풀어 쓴 문장입니다. */
import { circled, escapeHtml, ganada, problem, seededRandom, sheetTable, shuffled, type SheetMode, type SheetProblem, type SheetSection } from "./sheet";
import { clipboardWrap, sheetHead } from "@/features/language-sheet";

export type ThinkerGroup = "east" | "korea" | "west" | "society" | "applied";
export const thinkerGroups: Record<ThinkerGroup, string> = { east: "동양 윤리", korea: "한국 윤리", west: "서양 윤리", society: "사회사상", applied: "실천 윤리" };

export type Thinker = {
  id: string;
  /** 화면에 쓰는 이름. full은 이름이 한 글자라 헷갈릴 때 쓰는 온이름입니다. */
  name: string; full?: string;
  group: ThinkerGroup; school: string; era: string;
  concepts: string[]; claims: string[];
  /** 관련 과목·단원 */
  unit: string;
};

const 사상 = "윤리와 사상";
const 현대 = "현대사회와 윤리";

export const THINKERS: Thinker[] = [
  /* ───── 동양 ───── */
  { id: "confucius", name: "공자", group: "east", school: "유교", era: "중국 춘추 시대", concepts: ["인(仁)", "예(禮)", "정명(正名)", "덕치(德治)"], unit: `${사상} · 인륜 도덕과 마음의 회복`,
    claims: ["사람을 사랑하는 마음인 인을 도덕의 근본으로 삼고, 인은 부모를 섬기는 효와 형을 따르는 제에서 시작된다고 보았다.", "자기 욕심을 이겨 예로 돌아가는 극기복례로 인을 실천해야 한다고 하였다.", "임금은 임금답고 신하는 신하다워야 한다는 정명을 강조하고, 형벌보다 덕과 예로 다스리는 덕치를 주장하였다."] },
  { id: "mencius", name: "맹자", group: "east", school: "유교", era: "중국 전국 시대", concepts: ["성선설", "사단(四端)", "호연지기", "왕도 정치"], unit: `${사상} · 인륜 도덕과 마음의 회복`,
    claims: ["사람은 누구나 선한 본성을 타고나며, 측은·수오·사양·시비의 마음인 사단이 그 증거라고 보았다.", "사단을 넓혀 채우면 인·의·예·지의 덕을 이룰 수 있고, 올바른 기운인 호연지기를 길러야 한다고 하였다.", "힘이 아닌 인의로 백성을 다스리는 왕도 정치를 주장하고, 백성을 해치는 군주는 바꿀 수 있다는 역성혁명을 인정하였다."] },
  { id: "xunzi", name: "순자", group: "east", school: "유교", era: "중국 전국 시대", concepts: ["성악설", "화성기위(化性起僞)", "예치(禮治)"], unit: `${사상} · 제도적 규범의 확립`,
    claims: ["인간은 이익을 좋아하고 욕망을 따르는 본성을 타고나므로 그대로 두면 다툼과 혼란이 생긴다고 보았다.", "후천적인 노력과 배움으로 본성을 바꾸는 화성기위를 강조하였다.", "성인이 만든 예로써 욕망을 알맞게 조절하고 사회 질서를 세워야 한다는 예치를 주장하였다."] },
  { id: "mozi", name: "묵자", group: "east", school: "묵가", era: "중국 전국 시대", concepts: ["겸애(兼愛)", "교리(交利)", "비공(非攻)"], unit: `${사상} · 제도적 규범의 확립`,
    claims: ["자기 가족과 남의 가족을 차별하지 않고 모든 사람을 두루 사랑하는 겸애를 주장하였다.", "서로 사랑하고 서로 이익을 나누는 교리를 강조하였다.", "다른 나라를 침략하는 전쟁은 백성에게 해를 끼치므로 반대해야 한다는 비공을 주장하였다."] },
  { id: "hanfei", name: "한비자", group: "east", school: "법가", era: "중국 전국 시대", concepts: ["법치(法治)", "법·술·세", "상벌"], unit: `${사상} · 제도적 규범의 확립`,
    claims: ["인간은 이익을 좋아하고 손해를 싫어하므로 상과 벌로 다스려야 한다고 보았다.", "군주는 법(법령), 술(신하를 부리는 기술), 세(권세)를 함께 써야 한다고 하였다.", "덕보다 누구에게나 공정하고 엄격하게 적용되는 법으로 나라를 다스리는 법치를 주장하였다."] },
  { id: "laozi", name: "노자", group: "east", school: "도가", era: "중국 춘추 시대", concepts: ["도(道)", "무위자연", "상선약수", "소국과민"], unit: `${사상} · 다투지 않음과 자연 그대로의 삶`,
    claims: ["만물의 근원인 도는 억지로 하지 않아도 저절로 이루어지므로, 사람도 무위자연의 삶을 살아야 한다고 보았다.", "가장 좋은 것은 물과 같다는 상선약수를 들어 겸손하고 다투지 않는 삶을 강조하였다.", "인위적인 제도와 도덕이 오히려 혼란을 낳는다고 보고, 작은 나라에 적은 백성이 사는 소국과민을 이상 사회로 제시하였다."] },
  { id: "zhuangzi", name: "장자", group: "east", school: "도가", era: "중국 전국 시대", concepts: ["제물(齊物)", "심재(心齋)", "좌망(坐忘)", "소요유(逍遙遊)"], unit: `${사상} · 분별을 잊음과 자유롭게 노니는 삶`,
    claims: ["도의 관점에서 보면 만물은 모두 평등하다는 제물을 주장하고, 옳고 그름이나 귀하고 천함을 나누는 분별을 넘어서야 한다고 보았다.", "마음을 비우는 심재와 자기를 잊는 좌망의 수양으로 정신적 자유에 이를 수 있다고 하였다.", "어떤 것에도 얽매이지 않고 자유롭게 노니는 소요유의 경지를 추구하였다."] },
  { id: "buddha", name: "석가모니", group: "east", school: "불교", era: "고대 인도", concepts: ["연기(緣起)", "사성제", "팔정도", "자비"], unit: `${사상} · 상호의존적인 세계와 실체가 없는 존재`,
    claims: ["모든 것은 서로 의존하여 생겨나고 사라진다는 연기를 깨달았으며, 고정된 실체는 없다고 보았다.", "삶은 괴로움이고, 그 원인은 집착과 욕망이며, 괴로움이 사라진 열반과 거기에 이르는 길이 있다는 사성제를 가르쳤다.", "여덟 가지 바른 수행인 팔정도를 실천하고 모든 생명에게 자비를 베풀어야 한다고 하였다."] },
  { id: "zhuxi", name: "주희", group: "east", school: "성리학", era: "중국 남송", concepts: ["성즉리(性卽理)", "격물치지", "거경궁리"], unit: `${사상} · 사물의 이치 규명과 주체의 도덕성 회복`,
    claims: ["인간의 본성이 곧 하늘의 이치라는 성즉리를 주장하였다.", "사물의 이치를 하나하나 탐구하여 앎을 넓히는 격물치지를 강조하였다.", "마음을 경건하게 지키는 거경과 이치를 깊이 탐구하는 궁리를 함께 닦는 거경궁리를 수양 방법으로 제시하였다."] },
  { id: "wangshouren", name: "왕수인", group: "east", school: "양명학", era: "중국 명", concepts: ["심즉리(心卽理)", "치양지(致良知)", "지행합일"], unit: `${사상} · 사물의 이치 규명과 주체의 도덕성 회복`,
    claims: ["마음이 곧 이치라는 심즉리를 주장하며, 이치를 마음 밖의 사물에서 찾을 수 없다고 보았다.", "누구나 타고난 도덕적 앎인 양지를 온전히 발휘하는 치양지를 강조하였다.", "참된 앎은 반드시 실천을 동반한다는 지행합일을 주장하였다."] },

  /* ───── 한국 ───── */
  { id: "wonhyo", name: "원효", group: "korea", school: "불교", era: "신라", concepts: ["일심(一心)", "화쟁(和諍)", "무애(無碍)"], unit: `${사상} · 다양성의 조화와 화쟁사상`,
    claims: ["모든 것은 한마음인 일심에서 나온다고 보고, 서로 다른 불교 이론들을 더 높은 차원에서 조화시키는 화쟁 사상을 펼쳤다.", "나무아미타불을 외우면 누구나 극락에 갈 수 있다고 하여 불교의 대중화에 힘썼다.", "형식과 계율에 얽매이지 않는 무애의 삶을 실천하였다."] },
  { id: "uicheon", name: "의천", group: "korea", school: "불교", era: "고려", concepts: ["교관겸수(敎觀兼修)", "천태종", "선교 통합"], unit: `${사상} · 선과 교의 통합 노력`,
    claims: ["경전과 교리를 공부하는 교와 마음을 살피는 관을 함께 닦아야 한다는 교관겸수를 주장하였다.", "교종의 입장에서 선종을 아우르려 하였으며 해동 천태종을 열었다."] },
  { id: "jinul", name: "지눌", group: "korea", school: "불교", era: "고려", concepts: ["돈오점수(頓悟漸修)", "정혜쌍수(定慧雙修)", "선교일치"], unit: `${사상} · 선과 교의 통합 노력`,
    claims: ["자기 마음이 곧 부처임을 단번에 깨달은 뒤에도 남은 나쁜 습관을 없애기 위해 꾸준히 닦아야 한다는 돈오점수를 주장하였다.", "마음을 고요히 하는 선정과 밝게 비추는 지혜를 함께 닦는 정혜쌍수를 강조하였다.", "선종을 중심으로 교종을 아울러 선과 교가 하나라는 선교일치를 추구하였다."] },
  { id: "yihwang", name: "이황", group: "korea", school: "성리학", era: "조선 전기", concepts: ["이기호발설", "경(敬)", "이의 능동성"], unit: `${사상} · 순수한 도덕본성의 발현`,
    claims: ["사단은 이가 발하여 기가 따르는 것이고, 칠정은 기가 발하여 이가 타는 것이라는 이기호발설을 주장하였다.", "이를 기보다 귀하게 여기고, 이에도 스스로 드러나는 능동성이 있다고 보았다.", "마음을 한곳에 모아 흐트러지지 않게 하는 경의 공부를 수양의 중심으로 삼았다."] },
  { id: "yii", name: "이이", group: "korea", school: "성리학", era: "조선 전기", concepts: ["기발이승일도설", "이통기국(理通氣局)", "성(誠)", "경장(更張)"], unit: `${사상} · 일상적 감정의 도덕적 조절`,
    claims: ["발하는 것은 기이고 이는 그 기를 탈 뿐이라는 기발이승일도설을 주장하며, 사단은 칠정 가운데 선한 부분이라고 보았다.", "이는 두루 통하고 기는 국한된다는 이통기국을 주장하였다.", "참된 마음인 성을 수양의 근본으로 삼고, 낡은 제도를 시대에 맞게 고치는 경장을 강조하였다."] },
  { id: "josik", name: "조식", group: "korea", school: "성리학", era: "조선 전기", concepts: ["경(敬)과 의(義)", "실천 중시"], unit: `${사상} · 내적 깨어있음과 외적 실천`,
    claims: ["안으로는 경으로 마음을 깨어 있게 하고, 밖으로는 의로써 행동을 바르게 해야 한다고 보았다.", "이론을 따지는 논쟁보다 실천을 중시하여 불의에 맞서는 선비 정신을 강조하였다."] },
  { id: "jeongjedu", name: "정제두", group: "korea", school: "양명학", era: "조선 후기", concepts: ["양지(良知)", "생리(生理)", "지행합일"], unit: `${사상} · 마음의 생동성과 활동적 이치`,
    claims: ["양명학을 받아들여 마음에 살아 움직이는 이치인 생리와 타고난 양지를 강조하였다.", "앎과 행함은 하나라는 입장에서 참된 마음으로 실천하는 것을 중시하였다."] },
  { id: "jeongyakyong", name: "정약용", group: "korea", school: "실학", era: "조선 후기", concepts: ["성기호설(性嗜好說)", "자주지권(自主之權)", "덕의 실천"], unit: `${사상} · 본성의 확충과 마음의 주체성`,
    claims: ["인간의 본성은 선을 좋아하고 악을 싫어하는 기호라는 성기호설을 주장하였다.", "인·의·예·지는 마음속에 미리 갖추어진 것이 아니라 실천한 뒤에 이루어지는 덕이라고 보았다.", "인간에게는 선과 악을 스스로 선택할 수 있는 자주지권이 있다고 하였다."] },

  /* ───── 서양 ───── */
  { id: "protagoras", name: "프로타고라스", group: "west", school: "소피스트", era: "고대 그리스", concepts: ["인간은 만물의 척도", "상대주의"], unit: `${사상} · 상대주의와 보편윤리`,
    claims: ["인간은 만물의 척도라고 하여 참과 거짓, 옳고 그름은 사람마다 다르다고 보았다.", "모든 사람에게 똑같이 맞는 보편적이고 절대적인 진리나 도덕은 없다는 상대주의 입장을 취하였다."] },
  { id: "socrates", name: "소크라테스", group: "west", school: "고대 그리스 철학", era: "고대 그리스", concepts: ["주지주의", "지덕복 합일", "문답법", "영혼을 돌봄"], unit: `${사상} · 상대주의와 보편윤리`,
    claims: ["무엇이 옳은지 참으로 알면 옳게 행하며, 악행은 무지에서 나온다는 주지주의 입장을 취하였다.", "참된 앎과 덕과 행복은 하나라는 지덕복 합일을 주장하였다.", "질문과 대화로 상대가 스스로 무지를 깨닫게 하는 문답법을 쓰며 영혼을 돌보는 삶을 강조하였다."] },
  { id: "plato", name: "플라톤", group: "west", school: "고대 그리스 철학", era: "고대 그리스", concepts: ["이데아", "영혼 삼분설", "4주덕", "철인 통치"], unit: `${사상} · 영혼의 조화와 성품의 탁월성`,
    claims: ["참된 실재는 감각 세계 너머의 이데아이며, 그 가운데 선의 이데아를 아는 것이 가장 중요하다고 보았다.", "영혼의 이성·기개·욕구가 각각 지혜·용기·절제의 덕을 갖추고 조화를 이룰 때 정의가 실현된다고 하였다.", "선의 이데아를 아는 철학자가 나라를 다스려야 한다는 철인 통치를 주장하였다."] },
  { id: "aristotle", name: "아리스토텔레스", group: "west", school: "고대 그리스 철학", era: "고대 그리스", concepts: ["행복(에우다이모니아)", "중용", "품성적 탁월성", "실천적 지혜"], unit: `${사상} · 영혼의 조화와 성품의 탁월성`,
    claims: ["인간 삶의 최고선은 행복이며, 행복은 이성에 따른 탁월한 활동이라고 보았다.", "품성적 탁월성은 좋은 행위를 되풀이하는 습관으로 길러지며, 실천적 지혜가 그 판단을 이끈다고 하였다.", "지나침과 모자람 사이에서 상황에 알맞은 중용을 선택해야 한다고 하였다."] },
  { id: "epicurus", name: "에피쿠로스", group: "west", school: "에피쿠로스학파", era: "헬레니즘 시대", concepts: ["쾌락주의", "아타락시아", "정신적 쾌락"], unit: `${사상} · 쾌락의 추구와 평정심`,
    claims: ["쾌락이 곧 선이지만, 순간적이고 육체적인 쾌락보다 오래가는 정신적 쾌락을 추구해야 한다고 보았다.", "몸에 고통이 없고 마음에 불안이 없는 평온한 상태인 아타락시아를 행복으로 여겼다.", "죽음은 감각이 사라지는 것이므로 두려워할 필요가 없다고 하였다."] },
  { id: "zeno", name: "제논", group: "west", school: "스토아학파", era: "헬레니즘 시대", concepts: ["아파테이아", "로고스(이성)", "자연에 따르는 삶", "세계 시민"], unit: `${사상} · 금욕과 부동심`,
    claims: ["우주는 이성인 로고스의 법칙에 따라 움직이므로 이성에 따라 사는 것이 선이라고 보았다.", "정념에서 벗어나 어떤 일에도 흔들리지 않는 부동심인 아파테이아를 추구하였다.", "모든 인간은 이성을 지닌 존재로서 평등한 세계 시민이라고 하였다."] },
  { id: "augustine", name: "아우구스티누스", group: "west", school: "그리스도교 윤리", era: "고대 로마 말기", concepts: ["신의 은총", "사랑(아가페)", "신국"], unit: `${사상} · 그리스도교와 사랑의 윤리`,
    claims: ["인간은 원죄로 타락하여 스스로 구원받을 수 없고, 신의 은총으로만 구원받는다고 보았다.", "지혜·용기·절제·정의의 덕은 모두 신에 대한 사랑이 여러 모습으로 드러난 것이라고 하였다.", "신을 사랑하는 사람들의 신의 나라와 자기를 사랑하는 사람들의 지상의 나라를 구별하였다."] },
  { id: "aquinas", name: "아퀴나스", full: "토마스 아퀴나스", group: "west", school: "그리스도교 윤리", era: "중세 유럽", concepts: ["자연법", "신앙과 이성의 조화", "신학적 덕"], unit: `${사상} · 자연법 윤리와 프로테스탄티즘 윤리`,
    claims: ["신앙과 이성은 서로 대립하지 않고 조화를 이룬다고 보았다.", "인간이 이성으로 알 수 있는 자연법의 으뜸 원리는 선을 행하고 악을 피하라는 것이라고 하였다.", "지혜·용기·절제·정의의 덕에 믿음·소망·사랑의 신학적 덕을 더하였다."] },
  { id: "calvin", name: "칼뱅", group: "west", school: "프로테스탄티즘", era: "16세기 유럽", concepts: ["예정설", "직업 소명설", "근면과 절제"], unit: `${사상} · 자연법 윤리와 프로테스탄티즘 윤리`,
    claims: ["구원받을 사람은 신이 미리 정해 두었다는 예정설을 주장하였다.", "직업은 신이 맡긴 소명이므로 자기 직업에 충실한 것이 신의 뜻에 따르는 삶이라고 보았다.", "근면하고 검소하게 일해서 얻은 부는 정당하다고 하였다."] },
  { id: "hume", name: "흄", group: "west", school: "도덕 감정론", era: "18세기 영국", concepts: ["도덕 감정", "공감", "이성은 정념의 노예"], unit: `${사상} · 도덕의 기원과 판단에 대한 과학적 설명`,
    claims: ["선과 악의 구별은 이성이 아니라 감정에서 나온다고 보았다.", "이성은 정념의 노예일 뿐이며, 이성만으로는 행위를 일으킬 수 없다고 하였다.", "다른 사람의 기쁨과 고통을 함께 느끼는 공감이 도덕 판단의 바탕이라고 하였다."] },
  { id: "kant", name: "칸트", group: "west", school: "의무론", era: "18세기 독일", concepts: ["선의지", "정언 명령", "의무", "인격(목적 그 자체)"], unit: `${사상} · 의무론과 칸트 윤리사상`,
    claims: ["조건 없이 선한 것은 선의지뿐이며, 의무에서 비롯된 행위만이 도덕적 가치를 지닌다고 보았다.", "네 의지의 준칙이 언제나 보편적 법칙이 될 수 있도록 행위하라는 정언 명령을 제시하였다.", "인간을 언제나 목적으로 대하고 결코 수단으로만 대하지 말라고 하였으며, 영구 평화를 위한 국제 연맹을 제안하였다."] },
  { id: "bentham", name: "벤담", group: "west", school: "공리주의", era: "18~19세기 영국", concepts: ["최대 다수의 최대 행복", "양적 공리주의", "쾌락 계산", "외적 제재"], unit: `${사상} · 결과론과 공리주의`,
    claims: ["옳은 행위는 최대 다수의 최대 행복을 가져오는 행위라고 보았다.", "쾌락은 질이 아니라 양으로만 다르며, 강도·지속성·확실성 같은 기준으로 계산할 수 있다고 하였다.", "법률·여론 같은 외적 제재로 개인의 이익과 사회 전체의 이익을 조화시킬 수 있다고 하였다."] },
  { id: "mill", name: "밀", full: "존 스튜어트 밀", group: "west", school: "공리주의", era: "19세기 영국", concepts: ["질적 공리주의", "내적 제재(양심)", "위해 원칙"], unit: `${사상} · 결과론과 공리주의`,
    claims: ["쾌락에는 질적 차이가 있으며, 정신적 쾌락이 육체적 쾌락보다 더 가치 있다고 보았다.", "만족한 돼지보다 불만족한 인간이 낫다고 하며, 양심의 가책 같은 내적 제재를 중시하였다.", "다른 사람에게 해를 끼치지 않는 한 개인의 자유는 보장되어야 한다는 위해 원칙을 주장하였다."] },
  { id: "kierkegaard", name: "키르케고르", group: "west", school: "실존주의", era: "19세기 덴마크", concepts: ["주체적 진리", "실존의 3단계", "신 앞의 단독자"], unit: `${사상} · 주체적 결단과 문제 해결의 유용성`,
    claims: ["나에게 참된 진리, 곧 그것을 위해 살고 죽을 수 있는 주체적 진리를 찾아야 한다고 하였다.", "실존은 미적 실존, 윤리적 실존, 종교적 실존의 단계로 나아간다고 보았다.", "절망을 거쳐 신 앞에 홀로 선 단독자가 될 때 참된 실존에 이른다고 하였다."] },
  { id: "sartre", name: "사르트르", group: "west", school: "실존주의", era: "20세기 프랑스", concepts: ["실존은 본질에 앞선다", "자유와 책임", "앙가주망"], unit: `${사상} · 주체적 결단과 문제 해결의 유용성`,
    claims: ["인간은 먼저 존재하고 스스로 자신을 만들어 간다는 뜻에서 실존은 본질에 앞선다고 하였다.", "인간은 자유롭도록 선고받았으며 자신의 선택에 전적으로 책임져야 한다고 보았다.", "사회 문제에 적극 참여하는 앙가주망을 강조하였다."] },
  { id: "dewey", name: "듀이", group: "west", school: "실용주의", era: "20세기 미국", concepts: ["도구주의", "반성적 사고", "성장"], unit: `${사상} · 주체적 결단과 문제 해결의 유용성`,
    claims: ["지식과 도덕은 삶의 문제를 해결하는 도구라는 도구주의를 주장하였다.", "고정된 도덕 원리를 따르기보다 반성적 사고로 상황에 알맞은 해결책을 찾아야 한다고 보았다.", "도덕적 삶의 목적은 정해진 끝이 아니라 끊임없는 성장이라고 하였다."] },
  { id: "jonas", name: "요나스", group: "west", school: "책임 윤리", era: "20세기 독일", concepts: ["책임 윤리", "미래 세대", "공포의 발견술"], unit: `${사상} · 책임·배려와 윤리적 삶 / ${현대} · 과학기술의 사회적 책임`,
    claims: ["과학 기술의 힘이 커진 만큼 먼 미래와 자연까지 고려하는 새로운 책임 윤리가 필요하다고 하였다.", "인류가 계속 존재해야 한다는 것을 으뜸 의무로 보고 미래 세대에 대한 책임을 강조하였다.", "기술이 가져올 나쁜 결과를 먼저 떠올려 조심하는 공포의 발견술을 제안하였다."] },
  { id: "gilligan", name: "길리건", group: "west", school: "배려 윤리", era: "20세기 미국", concepts: ["배려 윤리", "정의 윤리 비판", "관계와 책임"], unit: `${사상} · 책임·배려와 윤리적 삶`,
    claims: ["기존의 도덕 발달 이론이 남성 중심의 정의 윤리에 치우쳐 여성의 도덕성을 낮게 평가했다고 비판하였다.", "도덕에는 공정과 권리를 중시하는 정의 윤리뿐 아니라 관계와 책임을 중시하는 배려 윤리가 있다고 보았다."] },
  { id: "noddings", name: "나딩스", group: "west", school: "배려 윤리", era: "20세기 미국", concepts: ["배려 관계", "전념", "동기 전환"], unit: `${사상} · 책임·배려와 윤리적 삶`,
    claims: ["배려는 배려하는 사람과 배려받는 사람의 관계 속에서 완성된다고 보았다.", "배려하는 사람은 상대에게 전념하고, 자기 동기를 상대의 필요 쪽으로 돌리는 동기 전환을 해야 한다고 하였다.", "배려받는 사람도 반응을 보임으로써 배려 관계에 함께 참여한다고 하였다."] },

  /* ───── 사회사상 ───── */
  { id: "hobbes", name: "홉스", group: "society", school: "사회 계약론", era: "17세기 영국", concepts: ["만인의 만인에 대한 투쟁", "사회 계약", "절대 주권"], unit: `${사상} · 국가의 역할과 정당성`,
    claims: ["국가가 없는 자연 상태는 만인의 만인에 대한 투쟁 상태라고 보았다.", "사람들은 자기 보존을 위해 계약을 맺어 자연권을 주권자에게 넘기고 국가를 세운다고 하였다.", "강력한 주권을 가진 국가만이 평화와 안전을 지킬 수 있다고 하였다."] },
  { id: "locke", name: "로크", group: "society", school: "사회 계약론", era: "17세기 영국", concepts: ["자연권(생명·자유·재산)", "동의에 의한 정부", "저항권"], unit: `${사상} · 국가의 역할과 정당성`,
    claims: ["자연 상태는 비교적 평화롭지만 생명·자유·재산이라는 자연권을 지키기 어려워 사람들이 동의하여 정부를 세운다고 보았다.", "정부가 맡겨진 권한을 어기고 자연권을 침해하면 국민은 저항할 수 있다고 하였다.", "자기 노동을 더한 것은 자기 소유가 된다고 하였다."] },
  { id: "rousseau", name: "루소", group: "society", school: "사회 계약론", era: "18세기 프랑스", concepts: ["일반 의지", "인민 주권", "직접 민주주의"], unit: `${사상} · 민주주의의 지향과 대의민주주의`,
    claims: ["사회 계약으로 세운 공동체는 공공의 이익을 지향하는 일반 의지에 따라야 한다고 보았다.", "주권은 인민에게 있으며 넘겨주거나 대표될 수 없다고 하여 직접 민주주의를 강조하였다.", "자연 상태의 인간은 자유롭고 평등했지만 사유 재산이 생기면서 불평등이 생겼다고 하였다."] },
  { id: "smith", name: "애덤 스미스", group: "society", school: "고전 경제학", era: "18세기 영국", concepts: ["보이지 않는 손", "공정한 관찰자", "자유 시장"], unit: `${사상} · 자본주의의 원리와 현실`,
    claims: ["개인이 자기 이익을 추구하면 보이지 않는 손에 이끌려 사회 전체의 이익도 늘어난다고 보았다.", "공정한 관찰자의 공감이 도덕 판단의 기준이 된다고 하였다."] },
  { id: "marx", name: "마르크스", group: "society", school: "사회주의", era: "19세기 독일", concepts: ["소외", "계급 투쟁", "생산 수단의 공유"], unit: `${사상} · 자본주의의 문제점과 개선 방안`,
    claims: ["자본주의에서 노동자는 자신이 만든 생산물과 노동 과정에서 소외된다고 보았다.", "생산 수단의 사적 소유가 착취와 계급 대립을 낳는다고 하였다.", "능력에 따라 일하고 필요에 따라 분배받는 사회를 이상으로 제시하였다."] },
  { id: "rawls", name: "롤스", group: "society", school: "자유주의 정의론", era: "20세기 미국", concepts: ["원초적 입장", "무지의 베일", "차등 원칙", "시민 불복종"], unit: `${현대} · 분배 정의 / 통합사회2 · 다양한 정의관`,
    claims: ["자신의 처지를 모르는 무지의 베일을 쓴 원초적 입장에서 합의한 원칙이 정의의 원칙이라고 보았다.", "모든 사람에게 평등한 기본적 자유가 보장되어야 하며, 사회적·경제적 불평등은 최소 수혜자에게 최대 이익이 될 때만 허용된다고 하였다.", "시민 불복종은 공개적이고 비폭력적으로, 처벌을 감수하며 최후의 수단으로 해야 한다고 하였다."] },
  { id: "nozick", name: "노직", group: "society", school: "자유 지상주의", era: "20세기 미국", concepts: ["소유 권리론", "취득·이전·교정의 원칙", "최소 국가"], unit: `${현대} · 분배 정의 / 통합사회2 · 다양한 정의관`,
    claims: ["정당하게 취득하거나 이전받은 소유물에 대해서는 누구도 침해할 수 없는 권리를 가진다고 보았다.", "취득·이전이 정당하고, 부당한 것은 교정되었다면 분배 결과가 어떻든 정의롭다고 하였다.", "국가는 개인의 권리를 보호하는 최소 국가에 그쳐야 하며, 재분배를 위한 과세는 부당하다고 하였다."] },
  { id: "walzer", name: "왈처", group: "society", school: "공동체주의", era: "20세기 미국", concepts: ["복합 평등", "분배 영역", "공동체의 공유된 의미"], unit: `${현대} · 분배 정의 / 통합사회2 · 다양한 정의관`,
    claims: ["사회적 가치는 공동체가 부여한 고유한 의미가 있으므로 영역마다 다른 기준으로 분배해야 한다고 보았다.", "돈이나 권력처럼 한 영역의 가치가 다른 영역을 지배하지 못하게 하는 복합 평등을 주장하였다."] },
  { id: "habermas", name: "하버마스", group: "society", school: "비판 이론", era: "20세기 독일", concepts: ["담론 윤리", "의사소통 합리성", "심의 민주주의"], unit: `${사상} · 참여와 심의를 통한 민주주의 구현 / ${현대} · 소통과 담론의 윤리`,
    claims: ["관련된 모든 사람이 자유롭고 평등하게 참여하는 합리적 대화로 도덕 규범의 정당성을 얻을 수 있다고 보았다.", "이해 가능성·진리성·정당성·진실성을 갖춘 의사소통을 강조하였다.", "시민이 공적 토론과 숙의로 정책을 정하는 심의 민주주의를 지지하였다."] },
  { id: "thoreau", name: "소로", group: "society", school: "시민 불복종", era: "19세기 미국", concepts: ["시민 불복종", "개인의 양심"], unit: `${현대} · 시민의 참여와 시민불복종`,
    claims: ["정부의 법보다 개인의 양심이 앞선다고 보았다.", "노예제와 침략 전쟁을 지지하는 정부에 세금을 내지 않는 방식으로 불복종하였다."] },

  /* ───── 실천 윤리 ───── */
  { id: "singer", name: "싱어", group: "applied", school: "공리주의", era: "현대 오스트레일리아", concepts: ["이익 평등 고려", "종 차별주의 비판", "해외 원조 의무"], unit: `${현대} · 환경 문제에 대한 윤리적 쟁점 / 국제 사회에 대한 책임`,
    claims: ["고통과 쾌락을 느낄 수 있는 존재라면 그 이익을 평등하게 고려해야 한다고 보았다.", "인간의 이익만 중시하는 것은 종 차별주의라고 비판하였다.", "큰 희생 없이 절대 빈곤을 줄일 수 있다면 원조는 선택이 아니라 의무라고 하였다."] },
  { id: "regan", name: "레건", group: "applied", school: "동물 권리론", era: "현대 미국", concepts: ["삶의 주체", "내재적 가치", "동물의 권리"], unit: `${현대} · 환경 문제에 대한 윤리적 쟁점`,
    claims: ["믿음·욕구·기억 등을 지닌 삶의 주체인 동물은 내재적 가치와 권리를 지닌다고 보았다.", "동물을 단지 수단으로 대하는 공장식 사육과 동물 실험을 반대하였다."] },
  { id: "schweitzer", name: "슈바이처", group: "applied", school: "생명 중심주의", era: "20세기", concepts: ["생명 외경", "살려는 의지"], unit: `${현대} · 자연을 바라보는 동·서양의 관점`,
    claims: ["모든 생명은 살려는 의지를 지니므로 생명을 존중하고 경외해야 한다고 보았다.", "생명을 지키고 북돋우는 것은 선이고, 생명을 해치는 것은 악이라고 하였다."] },
  { id: "taylor", name: "테일러", full: "폴 테일러", group: "applied", school: "생명 중심주의", era: "현대 미국", concepts: ["목적론적 삶의 중심", "내재적 가치", "불침해·불간섭·신뢰·보상적 정의의 의무"], unit: `${현대} · 자연을 바라보는 동·서양의 관점`,
    claims: ["모든 생명체는 자신의 선을 추구하는 목적론적 삶의 중심으로서 내재적 가치를 지닌다고 보았다.", "자연에 대해 불침해·불간섭·신뢰·보상적 정의의 의무를 지켜야 한다고 하였다."] },
  { id: "leopold", name: "레오폴드", group: "applied", school: "생태 중심주의", era: "20세기 미국", concepts: ["대지 윤리", "생명 공동체", "전체론"], unit: `${현대} · 자연을 바라보는 동·서양의 관점`,
    claims: ["도덕 공동체의 범위를 흙·물·식물·동물을 포함한 대지까지 넓혀야 한다고 보았다.", "생명 공동체의 통합성·안정성·아름다움을 보전하는 것이 옳다고 하였다."] },
  { id: "galtung", name: "갈퉁", group: "applied", school: "평화학", era: "현대 노르웨이", concepts: ["소극적 평화", "적극적 평화", "구조적·문화적 폭력"], unit: `${현대} · 국제 분쟁의 해결과 방안`,
    claims: ["전쟁 같은 직접적 폭력이 없는 상태를 소극적 평화라고 하였다.", "빈곤·차별 같은 구조적 폭력과 이를 정당화하는 문화적 폭력까지 없는 상태를 적극적 평화라고 보았다."] },
];

export const thinkerBy = (id: string) => THINKERS.find(thinker => thinker.id === id);
/** 한자 괄호를 뺀 개념 이름(예: "인(仁)" → "인") */
export const conceptBase = (concept: string) => concept.replace(/\s*\(.*?\)\s*/g, "").trim();
export const thinkerLabel = (thinker: Thinker) => thinker.full ?? thinker.name;
export function thinkerPool(groups: ThinkerGroup[], picked: string[]) {
  const inGroups = THINKERS.filter(thinker => groups.includes(thinker.group));
  const chosen = inGroups.filter(thinker => picked.includes(thinker.id));
  return chosen.length ? chosen : inGroups;
}

/* ───── 비교 짝 ───── */
export type ThinkerPair = { a: string; b: string; common: string; difference: string };
export const THINKER_PAIRS: ThinkerPair[] = [
  { a: "mencius", b: "xunzi", common: "유교 사상가로서 예와 도덕적 수양을 중시하고, 누구나 노력하면 성인이 될 수 있다고 보았다.", difference: "맹자는 성선설에 따라 타고난 선한 마음(사단)을 넓히라고 하였고, 순자는 성악설에 따라 예와 배움으로 본성을 바꾸라(화성기위)고 하였다." },
  { a: "zhuxi", b: "wangshouren", common: "유교(신유학)의 입장에서 도덕적 인격의 완성을 추구하였다.", difference: "주희는 성즉리·격물치지로 사물의 이치를 탐구하라고 하였고, 왕수인은 심즉리·치양지로 마음의 양지를 발휘하고 지행합일을 강조하였다." },
  { a: "yihwang", b: "yii", common: "성리학자로서 이와 기로 도덕 감정(사단·칠정)을 설명하고 수양을 중시하였다.", difference: "이황은 이기호발설로 이의 능동성을 인정하였고, 이이는 기발이승일도설로 발하는 것은 기뿐이며 이통기국이라고 하였다." },
  { a: "uicheon", b: "jinul", common: "고려의 승려로서 선종과 교종의 통합을 추구하였다.", difference: "의천은 교종의 입장에서 교관겸수를, 지눌은 선종의 입장에서 정혜쌍수·돈오점수를 주장하였다." },
  { a: "confucius", b: "mozi", common: "혼란한 사회를 바로잡기 위해 사랑을 강조하였다.", difference: "공자는 가족에서 시작해 점차 넓혀 가는 차등적 사랑(인)을, 묵자는 차별 없는 사랑(겸애)과 서로의 이익(교리)을 강조하였다." },
  { a: "confucius", b: "hanfei", common: "혼란한 사회의 질서를 되찾으려 하였다.", difference: "공자는 덕과 예로 다스리는 덕치를, 한비자는 상벌과 엄격한 법으로 다스리는 법치를 주장하였다." },
  { a: "confucius", b: "laozi", common: "혼란한 시대를 극복하고 이상 사회를 이루려 하였다.", difference: "공자는 인과 예 같은 도덕 규범을 세우고 따르라고 하였고, 노자는 인위적 규범이 혼란을 낳는다며 무위자연을 강조하였다." },
  { a: "protagoras", b: "socrates", common: "자연보다 인간의 삶과 옳고 그름의 문제에 관심을 두었다.", difference: "프로타고라스는 옳고 그름이 사람마다 다르다는 상대주의를, 소크라테스는 보편적 진리와 덕이 있다는 입장(지덕복 합일)을 취하였다." },
  { a: "plato", b: "aristotle", common: "덕 있는 삶과 행복을 추구하고 이성을 중시하였다.", difference: "플라톤은 선의 이데아를 아는 것을 강조하였고, 아리스토텔레스는 현실에서 습관으로 기르는 품성적 탁월성과 중용, 실천적 지혜를 강조하였다." },
  { a: "epicurus", b: "zeno", common: "헬레니즘 시대에 개인의 마음의 평온을 행복으로 보았다.", difference: "에피쿠로스는 정신적 쾌락과 아타락시아를, 제논(스토아학파)은 이성에 따른 삶과 정념을 이겨 낸 아파테이아를 추구하였다." },
  { a: "kant", b: "bentham", common: "누구에게나 적용되는 보편적 원리로 행위의 옳고 그름을 판단하였다.", difference: "칸트는 동기(선의지와 의무)를 중시하는 의무론을, 벤담은 결과(쾌락의 양)를 중시하는 공리주의를 주장하였다." },
  { a: "bentham", b: "mill", common: "공리주의자로서 최대 다수의 최대 행복을 옳음의 기준으로 삼았다.", difference: "벤담은 쾌락의 양만 따지고 외적 제재를 중시하였고, 밀은 쾌락의 질적 차이를 인정하고 양심 같은 내적 제재를 중시하였다." },
  { a: "kierkegaard", b: "sartre", common: "실존주의자로서 개인의 주체적 선택과 결단을 강조하였다.", difference: "키르케고르는 신 앞의 단독자가 되는 종교적 실존을, 사르트르는 신 없이 스스로를 만들어 가는 자유와 책임을 강조하였다." },
  { a: "hobbes", b: "locke", common: "사회 계약론자로서 국가는 사람들의 계약(동의)으로 세워진다고 보았다.", difference: "홉스는 자연 상태를 투쟁 상태로 보고 강력한 주권을, 로크는 자연 상태를 비교적 평화롭게 보고 제한된 정부와 저항권을 주장하였다." },
  { a: "locke", b: "rousseau", common: "사회 계약론자로서 국가 권력의 근거를 국민에게서 찾았다.", difference: "로크는 대표를 통한 정부와 재산권 보호를, 루소는 일반 의지와 넘겨줄 수 없는 인민 주권, 직접 민주주의를 강조하였다." },
  { a: "rawls", b: "nozick", common: "개인의 자유와 권리를 중시하는 자유주의의 정의론을 펼쳤다.", difference: "롤스는 차등 원칙에 따라 최소 수혜자를 위한 재분배를 인정하였고, 노직은 소유 권리론에 따라 재분배를 반대하고 최소 국가를 주장하였다." },
  { a: "thoreau", b: "rawls", common: "부정의한 법에 대한 시민 불복종을 정당하다고 보았다.", difference: "소로는 개인의 양심을 근거로 삼았고, 롤스는 사회 구성원이 공유하는 정의관을 근거로 공개적·비폭력적 불복종과 처벌 감수를 조건으로 들었다." },
  { a: "singer", b: "regan", common: "동물의 도덕적 지위를 인정하고 공장식 사육을 비판하였다.", difference: "싱어는 공리주의에 따라 동물의 이익을 평등하게 고려하라고 하였고, 레건은 삶의 주체인 동물이 권리를 지닌다는 의무론적 입장을 취하였다." },
  { a: "taylor", b: "leopold", common: "인간만 도덕적으로 고려하는 인간 중심주의를 비판하였다.", difference: "테일러는 개별 생명체의 내재적 가치를 중시하는 생명 중심주의를, 레오폴드는 대지 전체를 중시하는 생태 중심주의(전체론)를 주장하였다." },
  { a: "smith", b: "marx", common: "자본주의 경제가 사회에 미치는 영향을 탐구하였다.", difference: "애덤 스미스는 자유 시장과 보이지 않는 손을 지지하였고, 마르크스는 자본주의의 착취와 소외를 비판하며 생산 수단의 공유를 주장하였다." },
];

/* ───── 카드 ───── */
export type CardOptions = { hideName: boolean; hideConcepts: boolean };
export function thinkerCardsHtml(thinkers: Thinker[], options: CardOptions, title: string, mode: SheetMode) {
  const card = (thinker: Thinker, index: number) => {
    const name = options.hideName ? `사상가 ${ganada(index)} : ______________` : escapeHtml(thinkerLabel(thinker));
    const concepts = options.hideConcepts ? thinker.concepts.map(() => "__________").join(" · ") : thinker.concepts.map(escapeHtml).join(" · ");
    return `<div style="border:1.2px solid #444;border-radius:3mm;padding:3mm 3.5mm;break-inside:avoid;margin:0 0 3mm">`
      + `<div style="font-size:13pt;font-weight:700">${name}</div>`
      + `<div style="font-size:9pt;color:#555;margin:0.5mm 0 1.5mm">${escapeHtml(thinkerGroups[thinker.group])} · ${escapeHtml(thinker.school)} · ${escapeHtml(thinker.era)}</div>`
      + `<div style="font-size:10pt;margin:0 0 1.5mm"><b>핵심 개념</b> ${concepts}</div>`
      + `<ul style="margin:0;padding-left:5mm;font-size:10pt;line-height:1.5">${thinker.claims.map(claim => `<li>${escapeHtml(options.hideName ? hideNames(claim) : claim)}</li>`).join("")}</ul>`
      + `<div style="font-size:8.5pt;color:#666;margin-top:1.5mm">${escapeHtml(thinker.unit)}</div></div>`;
  };
  // 화면·인쇄는 두 단, 한글에 붙여 넣을 때는 표 대신 한 단으로 둡니다.
  const body = mode === "screen"
    ? `<div style="column-count:2;column-gap:4mm">${thinkers.map(card).join("")}</div>`
    : thinkers.map(card).join("");
  return clipboardWrap(sheetHead(title) + body, mode);
}
export function thinkerCardsText(thinkers: Thinker[], options: CardOptions, title: string) {
  return [title, "", ...thinkers.flatMap((thinker, index) => [
    `${options.hideName ? `사상가 ${ganada(index)}` : thinkerLabel(thinker)} (${thinkerGroups[thinker.group]} · ${thinker.school} · ${thinker.era})`,
    `핵심 개념: ${options.hideConcepts ? thinker.concepts.map(() => "____").join(" · ") : thinker.concepts.join(" · ")}`,
    ...thinker.claims.map(claim => `- ${options.hideName ? hideNames(claim) : claim}`), "",
  ])].join("\n");
}
/** 이름을 가린 카드에서 주장에 이름이 없도록 한 번 더 지웁니다(자료에는 이름을 넣지 않지만 교사가 고친 글을 위해). */
const hideNames = (text: string) => THINKERS.reduce((result, thinker) => thinker.name.length > 1 ? result.split(thinker.name).join("○○") : result, text);

/* ───── 학습지 ───── */
export type ThinkerAsk = "who" | "match" | "compare" | "blank";
export const thinkerAsks: Record<ThinkerAsk, string> = { who: "주장을 한 사상가 고르기", match: "사상가-핵심 개념 연결", compare: "갑·을 두 사상가 비교", blank: "핵심 개념 빈칸" };

export function thinkerProblems(asks: ThinkerAsk[], pool: Thinker[], perAsk: number, seed: number): SheetSection[] {
  if (!pool.length) return [];
  const random = seededRandom(seed * 53 + 17);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const order = shuffled(pool, seed * 7 + 1);
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "who") {
      for (let index = 0; index < perAsk; index += 1) {
        const target = order[index % order.length];
        // 보기는 같은 분류에서 먼저 고르고, 모자라면 다른 분류에서 채웁니다.
        const others = [...shuffled(THINKERS.filter(item => item.id !== target.id && item.group === target.group), seed * 11 + index), ...shuffled(THINKERS.filter(item => item.group !== target.group), seed * 11 + index)].slice(0, 3);
        const choices = shuffled([target, ...others], seed * 13 + index);
        const answer = choices.indexOf(target);
        const claims = shuffled(target.claims, seed + index).slice(0, 2);
        problems.push(problem(
          `다음 주장을 한 사상가로 알맞은 것은?<div style="margin:1.5mm 0;padding:2mm 3mm;border:1px solid #888">${claims.map(escapeHtml).join(" ")}</div>${choices.map((choice, at) => `${circled(at)} ${escapeHtml(thinkerLabel(choice))}`).join("&nbsp;&nbsp;&nbsp;")}`,
          `${circled(answer)} ${escapeHtml(thinkerLabel(target))} — 핵심 개념: ${target.concepts.map(escapeHtml).join(", ")}`,
        ));
      }
    } else if (ask === "match") {
      // 한 문항에 사상가 네다섯 명을 연결합니다.
      for (let index = 0; index < perAsk; index += 1) {
        const people = shuffled(pool.length >= 4 ? pool : THINKERS, seed * 17 + index).slice(0, Math.min(5, Math.max(4, pool.length)));
        const concepts = people.map(person => pick(person.concepts));
        const mixed = shuffled(concepts.map((concept, at) => ({ concept, at })), seed * 19 + index);
        const rows = people.map((person, at) => [`${ganada(at)} ${escapeHtml(thinkerLabel(person))}`, "", `${"ㄱㄴㄷㄹㅁ"[at]}. ${escapeHtml(mixed[at].concept)}`]);
        const answer = people.map((person, at) => `${ganada(at)} ${escapeHtml(thinkerLabel(person))} – ${"ㄱㄴㄷㄹㅁ"[mixed.findIndex(item => item.at === at)]}. ${escapeHtml(concepts[at])}`).join(", ");
        problems.push(problem(`사상가와 그 사상가의 핵심 개념을 바르게 연결하시오.${sheetTable(["사상가", "", "핵심 개념"], rows, { widths: ["38%", "20%", "42%"] })}`, answer));
      }
    } else if (ask === "compare") {
      const ids = new Set(pool.map(item => item.id));
      const pairs = THINKER_PAIRS.filter(pair => ids.has(pair.a) || ids.has(pair.b));
      const chosen = shuffled(pairs.length ? pairs : THINKER_PAIRS, seed * 23 + 3).slice(0, perAsk);
      chosen.forEach((pair, index) => {
        const [first, second] = random() < 0.5 ? [pair.a, pair.b] : [pair.b, pair.a];
        const a = thinkerBy(first)!;
        const b = thinkerBy(second)!;
        const claimOf = (thinker: Thinker) => escapeHtml(shuffled(thinker.claims, seed + index * 5 + thinker.id.length)[0]);
        problems.push(problem(
          `다음은 사상가 갑, 을의 주장이다.<div style="margin:1.5mm 0;padding:2mm 3mm;border:1px solid #888"><b>갑</b>: ${claimOf(a)}<br><b>을</b>: ${claimOf(b)}</div>(1) 갑, 을은 누구인지 쓰시오. (2) 두 사상가의 공통점과 차이점을 서술하시오.`,
          `(1) 갑: ${escapeHtml(thinkerLabel(a))}, 을: ${escapeHtml(thinkerLabel(b))}<br>(2) 공통점: ${escapeHtml(pair.common)}<br>차이점: ${escapeHtml(pair.difference)}`,
          { space: 26 },
        ));
      });
    } else {
      let made = 0;
      for (const target of order) {
        if (made >= perAsk) break;
        // 주장 안에 그대로 나오는 두 글자 이상의 개념만 빈칸으로 만듭니다.
        const options = target.claims.flatMap(claim => target.concepts.map(conceptBase).filter(base => base.length >= 2 && claim.includes(base)).map(base => ({ claim, base })));
        if (!options.length) continue;
        const { claim, base } = pick(options);
        made += 1;
        problems.push(problem(`다음은 ${escapeHtml(thinkerLabel(target))}의 주장이다. 빈칸에 들어갈 말을 쓰시오.<div style="margin:1.5mm 0;padding:2mm 3mm;border:1px solid #888">${escapeHtml(claim).split(escapeHtml(base)).join("(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)")}</div>`, escapeHtml(base)));
      }
    }
    if (problems.length) sections.push({ heading: thinkerAsks[ask], problems });
  }
  return sections;
}
