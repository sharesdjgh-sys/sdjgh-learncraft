/* 국어 · 문학: 갈래 특징, 고전 시가 형식, 시대별 한국 문학사, 소설의 시점과 문제입니다. 모두 교과서에 실리는 통설입니다. 시점 예문은 교과서형으로 지은 것입니다. */
import { circled, escapeHtml, problem, seededRandom, sheetTable, shuffled, type SheetProblem, type SheetSection } from "./sheet";

/* ───── 갈래 ───── */
export type GenreKey = "lyric" | "narrative" | "dramatic" | "didactic";
export const GENRES: { key: GenreKey; name: string; feature: string; how: string; works: string }[] = [
  { key: "lyric", name: "서정", feature: "화자가 자신의 정서와 생각을 주관적으로 표현한다.", how: "화자의 독백·고백, 운율과 심상", works: "고대 가요, 향가, 고려 가요, 시조, 현대시" },
  { key: "narrative", name: "서사", feature: "서술자가 인물·사건·배경을 갖춘 이야기를 전달한다.", how: "서술자의 서술(요약·묘사·대화)", works: "설화, 고전 소설, 판소리, 현대 소설" },
  { key: "dramatic", name: "극", feature: "등장인물의 대사와 행동으로 사건을 눈앞에서 직접 보여 준다.", how: "대사·지시문·해설, 무대(또는 화면) 상연", works: "탈춤(가면극), 인형극, 희곡, 시나리오" },
  { key: "didactic", name: "교술", feature: "글쓴이가 겪은 일이나 알고 있는 사실을 전달하고 알려 준다.", how: "경험·지식의 서술, 교훈과 깨달음", works: "경기체가, 가전, 수필, 기행문, 일기, 가사(일부)" },
];
export function genreTableHtml() {
  return sheetTable(["갈래", "특징", "표현 방식", "대표 갈래·작품"], GENRES.map(genre => [`<b>${genre.name}</b>`, escapeHtml(genre.feature), escapeHtml(genre.how), escapeHtml(genre.works)]), { widths: ["10%", "38%", "24%", "28%"], font: "9.5pt" });
}

/* ───── 고전 시가 형식 ───── */
export const POETRY_FORMS: { name: string; era: string; form: string; feature: string; works: string }[] = [
  { name: "고대 가요", era: "고대", form: "대체로 4구체 한역가로 전함", feature: "집단 가요에서 개인 서정 가요로 넘어감. 배경 설화와 함께 전함", works: "「구지가」, 「공무도하가」, 「황조가」" },
  { name: "향가", era: "삼국~고려 초", form: "4구체·8구체·10구체", feature: "향찰로 적은 우리 노래. 10구체는 9구 첫머리에 감탄사(아으 등)가 있음. 『삼국유사』에 14수, 『균여전』에 11수가 전함", works: "「서동요」, 「제망매가」, 「찬기파랑가」, 「처용가」" },
  { name: "고려 가요(속요)", era: "고려", form: "분연체(여러 연), 3음보", feature: "평민이 부른 노래. 연마다 후렴구가 있음. 구전되다가 조선 때 한글로 기록됨", works: "「청산별곡」, 「가시리」, 「동동」, 「서경별곡」" },
  { name: "경기체가", era: "고려 후기~조선 초", form: "분연체, 3음보", feature: "신진 사대부의 노래. ‘경(景) 긔 엇더하니잇고’ 같은 후렴구가 있음", works: "「한림별곡」" },
  { name: "악장", era: "조선 초", form: "일정하지 않음", feature: "궁중 행사에서 부른 노래. 조선 건국과 왕의 덕을 기림", works: "「용비어천가」, 「월인천강지곡」" },
  { name: "시조", era: "고려 말~현재", form: "3장 6구 45자 내외, 4음보. 종장 첫 음보는 3음절", feature: "평시조·엇시조·사설시조가 있음. 조선 후기에는 평민의 삶을 담은 사설시조가 늘어남", works: "「이 몸이 죽고 죽어」, 「동짓달 기나긴 밤을」" },
  { name: "가사", era: "조선", form: "3·4조(4·4조), 4음보 연속체. 행 수 제한 없음", feature: "시가와 산문의 중간 성격. 정격 가사는 끝 행이 시조의 종장과 비슷함", works: "「상춘곡」, 「관동별곡」, 「사미인곡」, 「속미인곡」" },
];
export function formTableHtml(hide?: "form" | "name") {
  const blank = "<span style=\"display:inline-block;min-width:26mm\">&nbsp;</span>";
  return sheetTable(["갈래", "시기", "형식", "특징", "대표 작품"], POETRY_FORMS.map(item => [
    hide === "name" ? blank : `<b>${escapeHtml(item.name)}</b>`, escapeHtml(item.era), hide === "form" ? blank : escapeHtml(item.form), escapeHtml(item.feature), escapeHtml(item.works),
  ]), { widths: ["13%", "12%", "20%", "33%", "22%"], font: "9pt" });
}

/* ───── 문학사 ───── */
export type LiteraryPeriod = { period: string; items: { genre: string; works: string }[] };
export const LITERARY_HISTORY: LiteraryPeriod[] = [
  { period: "고대", items: [{ genre: "고대 가요", works: "「구지가」, 「공무도하가」, 「황조가」" }, { genre: "건국 신화", works: "「단군 신화」, 「주몽 신화」" }] },
  { period: "삼국·통일 신라", items: [{ genre: "향가", works: "「서동요」, 「제망매가」(월명사), 「찬기파랑가」(충담사)" }, { genre: "한문학", works: "최치원의 『계원필경』" }] },
  { period: "고려", items: [{ genre: "고려 가요", works: "「청산별곡」, 「가시리」, 「동동」" }, { genre: "경기체가", works: "「한림별곡」" }, { genre: "가전", works: "「국순전」(임춘), 「공방전」(임춘)" }, { genre: "시조의 형성", works: "고려 말" }] },
  { period: "조선 전기", items: [{ genre: "악장", works: "「용비어천가」" }, { genre: "시조·가사", works: "「상춘곡」(정극인), 「관동별곡」·「사미인곡」(정철)" }, { genre: "한문 소설", works: "『금오신화』(김시습)" }] },
  { period: "조선 후기", items: [{ genre: "한글 소설", works: "「홍길동전」(허균), 「유충렬전」" }, { genre: "판소리·판소리계 소설", works: "「춘향전」, 「심청전」, 「흥부전」" }, { genre: "사설시조", works: "평민의 삶과 감정을 솔직하게 드러냄" }, { genre: "실학파 문학", works: "박지원의 「양반전」, 「허생전」, 「일야구도하기」" }] },
  { period: "개화기", items: [{ genre: "신소설", works: "「혈의 누」(이인직)" }, { genre: "신체시·창가", works: "「해에게서 소년에게」(최남선)" }] },
  { period: "1910~1920년대", items: [{ genre: "현대 소설의 출발", works: "「무정」(이광수), 「운수 좋은 날」(현진건)" }, { genre: "현대시", works: "『진달래꽃』(김소월), 『님의 침묵』(한용운)" }] },
  { period: "1930년대", items: [{ genre: "순수시·모더니즘", works: "김영랑, 정지용, 이상(「거울」)" }, { genre: "소설", works: "「천변 풍경」(박태원), 「태평천하」(채만식)" }] },
  { period: "일제 강점 말기", items: [{ genre: "저항시", works: "이육사(「광야」, 「교목」), 윤동주(「서시」, 「쉽게 씌어진 시」)" }] },
  { period: "광복 이후", items: [{ genre: "전쟁과 분단", works: "「오발탄」(이범선), 「광장」(최인훈)" }, { genre: "산업화 시대", works: "『난장이가 쏘아올린 작은 공』(조세희)" }] },
];
export function historyTableHtml(blanks: Set<string> = new Set()) {
  const rows = LITERARY_HISTORY.flatMap(period => period.items.map((item, index) => [
    index === 0 ? `<b>${escapeHtml(period.period)}</b>` : "",
    blanks.has(`${period.period}|${item.genre}`) ? "<span style=\"display:inline-block;min-width:24mm;border-bottom:1px solid #333\">&nbsp;</span>" : escapeHtml(item.genre),
    escapeHtml(item.works),
  ]));
  return sheetTable(["시대", "갈래", "대표 작품·작가"], rows, { widths: ["18%", "26%", "56%"], font: "9.5pt" });
}

/* ───── 소설의 시점 ───── */
export type PovKey = "first-main" | "first-observer" | "third-observer" | "omniscient";
export const POVS: { key: PovKey; name: string; narrator: string; effect: string }[] = [
  { key: "first-main", name: "1인칭 주인공 시점", narrator: "작품 안의 ‘나’가 자기 이야기를 한다.", effect: "인물의 내면을 친근하고 생생하게 드러낸다. 다른 인물의 속마음은 알 수 없다." },
  { key: "first-observer", name: "1인칭 관찰자 시점", narrator: "작품 안의 ‘나’가 주인공을 관찰해 이야기한다.", effect: "주인공의 속마음을 감추어 궁금증과 긴장감을 준다." },
  { key: "third-observer", name: "3인칭 관찰자 시점", narrator: "작품 밖의 서술자가 겉으로 드러난 말과 행동만 전한다.", effect: "객관적이고 극적인 느낌을 준다. 해석은 독자에게 맡긴다." },
  { key: "omniscient", name: "전지적 작가 시점", narrator: "작품 밖의 서술자가 인물의 속마음까지 모두 알고 전한다.", effect: "인물의 심리와 사건을 폭넓게 전하고, 서술자가 논평하기도 한다." },
];
export const POV_EXAMPLES: { key: PovKey; text: string }[] = [
  { key: "first-main", text: "나는 그날 밤 끝내 잠들지 못했다. 아버지의 굽은 등이 자꾸만 눈앞에 어른거려 이불을 머리끝까지 끌어 올렸다." },
  { key: "first-main", text: "합격자 명단에서 내 이름을 찾았을 때, 나는 기쁨보다 먼저 이상한 허전함을 느꼈다." },
  { key: "first-observer", text: "삼촌은 그날도 말없이 담배만 피웠다. 나는 삼촌이 왜 그 편지를 끝내 뜯어보지 않는지 알 수 없었다." },
  { key: "first-observer", text: "내 짝 수민이는 쉬는 시간마다 창밖만 바라보았다. 무엇을 보는지 물어도 수민이는 웃기만 했다." },
  { key: "third-observer", text: "노인은 의자에서 천천히 일어나 문을 열었다. 소년이 고개를 숙였다. 노인은 아무 말 없이 문을 닫았다." },
  { key: "third-observer", text: "그는 시계를 한 번 보고 가방을 들었다. 여자가 무어라 말했지만 그는 돌아보지 않고 계단을 내려갔다." },
  { key: "omniscient", text: "영호는 웃고 있었지만 속으로는 동생에게 미안한 마음이 가득했다. 동생 역시 형이 무리하고 있다는 것을 알면서도 모른 척했다." },
  { key: "omniscient", text: "어머니는 딸이 떠나는 것이 서운했지만 내색하지 않았다. 딸은 그런 어머니의 마음을 헤아리지 못한 채 들떠 있었다. 사람의 마음이란 이렇게 엇갈리기 마련이다." },
];

/* ───── 문제 ───── */
export type HistoryAsk = "genre" | "form" | "history" | "pov";
export const historyAsks: Record<HistoryAsk, string> = { genre: "갈래 맞히기", form: "고전 시가 형식", history: "문학사 연표 빈칸", pov: "시점 판별" };

export function literaryHistoryProblems(asks: HistoryAsk[], count: number, seed: number): SheetSection[] {
  const random = seededRandom(seed * 43 + 7);
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "genre") {
      for (const genre of shuffled(GENRES, seed * 5 + 1).slice(0, Math.min(count, GENRES.length))) {
        const choices = shuffled(GENRES, seed * 11 + genre.name.length);
        problems.push(problem(`다음 설명에 알맞은 갈래는?<span style="display:block;margin:1mm 0 1mm 4mm">${escapeHtml(genre.feature)} (예: ${escapeHtml(genre.works)})</span>${choices.map((item, i) => `${circled(i)} ${item.name}`).join("&nbsp;&nbsp; ")}`,
          `${circled(choices.indexOf(genre))} ${genre.name} 갈래 — ${escapeHtml(genre.how)}`, { space: 4 }));
      }
    } else if (ask === "form") {
      for (const form of shuffled(POETRY_FORMS, seed * 7 + 3).slice(0, count)) {
        problems.push(problem(`다음 설명에 해당하는 고전 시가 갈래를 쓰시오.<span style="display:block;margin:1mm 0 1mm 4mm">형식: ${escapeHtml(form.form)} / ${escapeHtml(form.feature)}</span>`, `${escapeHtml(form.name)} (${escapeHtml(form.works)})`, { space: 8 }));
      }
    } else if (ask === "history") {
      const all = LITERARY_HISTORY.flatMap(period => period.items.map(item => ({ period: period.period, ...item })));
      const chosen = shuffled(all, seed * 19 + 2).slice(0, Math.min(all.length, count * 2));
      const keys = new Set(chosen.map(item => `${item.period}|${item.genre}`));
      // 정답은 표에 나오는 차례대로 적습니다.
      const ordered = all.filter(item => keys.has(`${item.period}|${item.genre}`));
      problems.push(problem(`다음 한국 문학사 표의 빈칸에 알맞은 갈래를 쓰시오.`, ordered.map(item => `${escapeHtml(item.period)} — ${escapeHtml(item.genre)}`).join("<br>"), { after: historyTableHtml(keys), space: 2 }));
    } else {
      const examples = shuffled(POV_EXAMPLES, seed * 23 + Math.floor(random() * 5)).slice(0, count);
      for (const example of examples) {
        const pov = POVS.find(item => item.key === example.key)!;
        problems.push(problem(`다음 글의 시점을 쓰고, 그렇게 판단한 근거를 쓰시오.<span style="display:block;margin:1mm 0 1mm 4mm;padding-left:2mm;border-left:2px solid #999">${escapeHtml(example.text)}</span>`, `${escapeHtml(pov.name)} — ${escapeHtml(pov.narrator)}`, { space: 12 }));
      }
    }
    if (problems.length) sections.push({ heading: historyAsks[ask], problems });
  }
  return sections;
}
