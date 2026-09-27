import { z } from "zod";

export const escapeActivity = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export const lines = (count = 2) => Array.from({ length: count }, () => '<div style="height:10mm;border-bottom:1px solid #ccc"></div>').join("");
export const sheetHeader = (title: string) => `<h1 style="font-size:20pt;margin:0 0 5mm">${escapeActivity(title)}</h1><p style="text-align:right">학년 ___ 반 ___ 번호 ___ 이름 __________</p>`;
export const question = (title: string, body = "", count = 2) => `<section style="break-inside:avoid;margin:6mm 0"><h2 style="font-size:12pt">${escapeActivity(title)}</h2>${body}${lines(count)}</section>`;
export const answerPage = (body: string) => `<section style="break-before:page;margin-top:10mm"><h2>교사용 참고 답안</h2>${body}</section>`;
export const MAX_RHYTHM_TRACKS = 8;
/** 파트마다 다른 높이의 소리로 재생해 서로 구분되게 합니다. */
export const trackFrequencies = [620, 330, 170, 880, 460, 250, 1180, 540] as const;
export const newRhythmTrack = (count: number) => ({ name: `${count + 1}번 파트`, enabled: true, cells: Array(8).fill(false) as boolean[] });
export const rhythmSchema = z.object({
  title: z.string().max(100), bpm: z.number().int().min(40).max(200), beats: z.number().int().min(2).max(4), subdivision: z.union([z.literal(1), z.literal(2)]),
  tracks: z.array(z.object({ name: z.string().max(30), enabled: z.boolean(), cells: z.array(z.boolean()).length(8) })).min(1).max(MAX_RHYTHM_TRACKS),
});
export type RhythmDraft = z.infer<typeof rhythmSchema>;
export const defaultRhythm: RhythmDraft = { title: "우리 반 리듬 합주", bpm: 90, beats: 4, subdivision: 2, tracks: [
  { name: "손뼉", enabled: true, cells: [true, false, true, false, true, false, true, false] },
  { name: "무릎", enabled: true, cells: [true, false, false, false, true, false, false, false] },
  { name: "발 구르기", enabled: true, cells: [false, false, true, false, false, false, true, false] },
] };
export function rhythmSteps(draft: RhythmDraft) { return draft.beats * draft.subdivision; }
export function stepSeconds(draft: RhythmDraft) { return 60 / draft.bpm / draft.subdivision; }
export function beatLabel(step: number, subdivision: number) { return step % subdivision === 0 ? String(Math.floor(step / subdivision) + 1) : "앤"; }
export function rhythmHtml(draft: RhythmDraft) {
  const cell = 'style="border:1px solid #999;padding:3mm;text-align:center"';
  return sheetHeader(draft.title || "리듬 합주") + `<p>${draft.beats}/4박자 · ♩ = ${draft.bpm} · ${draft.subdivision === 2 ? "8분음표" : "4분음표"} 단위</p><p>● 소리 내기 / — 쉬기 · 한 칸은 ${draft.subdivision === 2 ? "반 박" : "한 박"}입니다.</p><table style="width:100%;border-collapse:collapse"><thead><tr><th ${cell}>파트</th>${Array.from({ length: rhythmSteps(draft) }, (_, i) => `<th ${cell}>${beatLabel(i, draft.subdivision)}</th>`).join("")}</tr></thead><tbody>${draft.tracks.filter(t => t.enabled).map(t => `<tr><th ${cell}>${escapeActivity(t.name)}</th>${t.cells.slice(0, rhythmSteps(draft)).map(on => `<td ${cell}>${on ? "●" : "—"}</td>`).join("")}</tr>`).join("")}</tbody></table>` + question("1. 모둠별로 파트를 나누고 네 번 반복해 연주해 봅시다.", "<p>나의 파트: __________ · 시작하고 끝내는 신호: __________</p>", 1) + question("2. 리듬의 일부를 바꾸어 새로운 합주를 만들어 봅시다.", "", 3) + question("3. 일정한 빠르기를 유지했나요? 다른 파트의 소리를 들었나요?");
}
export const listeningPresets = {
  elements: ["처음 들었을 때 떠오른 느낌과 그 이유는 무엇인가요?", "빠르기·셈여림·음색 중 두 가지를 골라 들은 장면과 함께 설명해 봅시다.", "반복되거나 달라지는 부분을 찾고, 들은 순서를 기호나 그림으로 나타내 봅시다.", "다시 듣고 생각이 달라진 부분과 그 근거를 적어 봅시다."],
  compare: ["두 곡을 듣고 각각의 첫인상을 적어 봅시다.", "빠르기·셈여림·악기 소리의 공통점과 차이점을 적어 봅시다.", "같은 느낌을 다른 음악적 방법으로 표현한 부분이 있나요? 들은 장면을 근거로 설명해 봅시다.", "어떤 곡을 어떤 상황에 추천하고 싶은가요? 음악적 특징을 근거로 써 봅시다."],
  performance: ["연주하려는 곡의 분위기와 표현하고 싶은 느낌을 적어 봅시다.", "강약·빠르기·프레이징을 어떻게 표현할지 연주 계획을 세워 봅시다.", "서로의 연주를 듣고 잘 전달된 표현과 그 이유를 적어 봅시다.", "다음 연습에서 개선할 한 가지와 구체적인 연습 방법을 적어 봅시다."],
};
export const idioms = [
  { hanja: "溫故知新", reading: "온고지신", meaning: "옛것을 익히고 그것을 바탕으로 새로운 것을 앎.", situation: "지난 실험 기록을 다시 살펴보다가 새로운 실험 방법을 떠올렸다." },
  { hanja: "切磋琢磨", reading: "절차탁마", meaning: "학문이나 인격을 갈고닦음.", situation: "친구와 서로의 글을 읽고 고칠 점을 나누며 꾸준히 글쓰기 실력을 길렀다." },
  { hanja: "易地思之", reading: "역지사지", meaning: "처지를 바꾸어 상대방의 입장에서 생각함.", situation: "발표를 어려워하는 친구를 이해하려고 내가 그 친구라면 어떨지 생각해 보았다." },
  { hanja: "言行一致", reading: "언행일치", meaning: "말과 행동이 같음.", situation: "교실을 깨끗이 쓰자고 제안한 학생이 매일 먼저 주변을 정리했다." },
  { hanja: "大器晩成", reading: "대기만성", meaning: "큰 인물이 되려면 많은 노력과 시간이 필요함.", situation: "당장 좋은 결과가 나오지 않더라도 목표를 향해 오랫동안 실력을 쌓기로 했다." },
  { hanja: "百聞不如一見", reading: "백문불여일견", meaning: "백 번 듣는 것이 한 번 보는 것만 못함.", situation: "설명으로만 들었던 유물을 박물관에서 직접 보고 생김새를 이해했다." },
];
// 성어 탭의 ‘목록에서 추가’에 쓰는 교과서 빈출 성어입니다. 생활 상황은 수업용으로 만든 문장입니다.
export const idiomLibrary = [...idioms,
  { hanja: "塞翁之馬", reading: "새옹지마", meaning: "인생의 길흉화복은 늘 바뀌어 미리 헤아리기 어려움.", situation: "대회 예선에서 떨어져 실망했지만, 그 덕분에 생긴 시간에 준비한 공모전에서 상을 받았다." },
  { hanja: "螢雪之功", reading: "형설지공", meaning: "어려운 형편에서도 부지런히 공부하여 이룬 보람.", situation: "아르바이트를 하면서도 밤마다 공부해 자격증 시험에 합격했다." },
  { hanja: "漁父之利", reading: "어부지리", meaning: "둘이 다투는 사이에 엉뚱한 제삼자가 이익을 봄.", situation: "두 모둠이 발표 순서를 두고 다투는 사이, 조용히 준비한 세 번째 모둠이 먼저 발표 기회를 얻었다." },
  { hanja: "臥薪嘗膽", reading: "와신상담", meaning: "목표를 이루기 위해 괴로움을 참고 견딤.", situation: "지난해 결승에서 진 뒤 한 해 동안 매일 새벽 훈련을 견디며 재대결을 준비했다." },
  { hanja: "結草報恩", reading: "결초보은", meaning: "죽어서라도 은혜를 잊지 않고 갚음.", situation: "어려울 때 도와준 이웃에게 언젠가 꼭 보답하겠다고 다짐했다." },
  { hanja: "刻舟求劍", reading: "각주구검", meaning: "시세의 변화를 모르고 융통성 없이 낡은 방법만 고집함.", situation: "시험 범위가 바뀌었는데도 작년 문제만 외우며 준비했다." },
  { hanja: "朝三暮四", reading: "조삼모사", meaning: "눈앞의 차이만 알고 결과가 같은 것을 모름. 또는 간사한 꾀로 남을 속임.", situation: "용돈을 한꺼번에 받든 나누어 받든 합계는 같은데, 먼저 많이 받는 쪽이 이득이라며 좋아했다." },
  { hanja: "管鮑之交", reading: "관포지교", meaning: "서로 깊이 이해하고 믿는 친구 사이의 사귐.", situation: "친구가 실수했을 때 사정을 먼저 헤아려 주고 끝까지 믿어 주었다." },
  { hanja: "竹馬故友", reading: "죽마고우", meaning: "어릴 때부터 함께 놀며 자란 벗.", situation: "유치원 때부터 함께 자란 친구와 같은 고등학교에 입학했다." },
  { hanja: "過猶不及", reading: "과유불급", meaning: "정도를 지나침은 미치지 못함과 같음.", situation: "시험 전날 밤을 새워 공부했다가 정작 시험 시간에 졸았다." },
  { hanja: "一石二鳥", reading: "일석이조", meaning: "한 가지 일로 두 가지 이익을 얻음.", situation: "자전거로 등교하니 교통비도 아끼고 운동도 되었다." },
  { hanja: "自業自得", reading: "자업자득", meaning: "자기가 저지른 일의 결과를 자기가 받음.", situation: "과제를 계속 미루다가 마감 전날 밤을 새우게 되었다." },
  { hanja: "有備無患", reading: "유비무환", meaning: "미리 준비가 되어 있으면 걱정할 것이 없음.", situation: "현장 체험 전날 우산을 챙겨 두어서 갑자기 내린 비에도 당황하지 않았다." },
  { hanja: "知彼知己", reading: "지피지기", meaning: "상대를 알고 나를 앎. 그러면 백 번 싸워도 위태롭지 않음.", situation: "상대 팀의 경기 영상을 분석하고 우리 팀의 약점을 보완했다." },
  { hanja: "見物生心", reading: "견물생심", meaning: "물건을 보면 그것을 갖고 싶은 마음이 생김.", situation: "계획 없이 문구점에 들렀다가 필요 없는 물건을 잔뜩 샀다." },
  { hanja: "同苦同樂", reading: "동고동락", meaning: "괴로움도 즐거움도 함께함.", situation: "합창 대회를 준비하며 힘든 연습과 수상의 기쁨을 반 친구들과 함께했다." },
  { hanja: "愚公移山", reading: "우공이산", meaning: "어떤 일이든 끊임없이 노력하면 마침내 이룰 수 있음.", situation: "매일 영어 단어 열 개씩 꾸준히 외워 1년 뒤 영어 원서를 읽게 되었다." },
  { hanja: "他山之石", reading: "타산지석", meaning: "다른 사람의 하찮은 말이나 행동도 나를 닦는 데 도움이 됨.", situation: "다른 모둠 발표에서 나온 실수를 보고 우리 모둠의 발표 자료를 다시 점검했다." },
  { hanja: "捲土重來", reading: "권토중래", meaning: "한 번 실패한 뒤 힘을 가다듬어 다시 도전함.", situation: "작년 대회에서 탈락한 동아리가 더 준비해 올해 다시 도전했다." },
  { hanja: "敎學相長", reading: "교학상장", meaning: "가르치고 배우는 일이 서로를 성장하게 함.", situation: "친구에게 수학 문제를 설명하다가 나도 개념을 더 확실히 이해했다." },
  { hanja: "靑出於藍", reading: "청출어람", meaning: "제자가 스승보다 나음.", situation: "처음 악기를 가르쳐 준 선배보다 후배가 대회에서 더 좋은 연주를 했다." },
  { hanja: "三顧草廬", reading: "삼고초려", meaning: "인재를 맞아들이기 위해 참을성 있게 정성을 다함.", situation: "동아리 회장이 그림을 잘 그리는 친구를 세 번이나 찾아가 함께하자고 부탁했다." },
  { hanja: "四面楚歌", reading: "사면초가", meaning: "사방이 적에게 둘러싸여 도움을 받을 수 없는 곤란한 처지.", situation: "모둠 과제를 혼자 떠맡았는데 자료도 없고 도와줄 친구도 없었다." },
  { hanja: "殺身成仁", reading: "살신성인", meaning: "자기 몸을 희생하여 옳은 도리를 이룸.", situation: "물에 빠진 아이를 구하려고 위험을 무릅쓰고 뛰어든 시민의 이야기를 들었다." },
  { hanja: "苦盡甘來", reading: "고진감래", meaning: "쓴 것이 다하면 단 것이 옴. 고생 끝에 즐거움이 옴.", situation: "몇 달 동안 힘들게 연습한 끝에 연주회를 무사히 마쳤다." },
  { hanja: "登高自卑", reading: "등고자비", meaning: "높은 곳에 오르려면 낮은 곳부터 오름. 일은 차례를 밟아야 함.", situation: "어려운 문제를 풀기 전에 기본 개념부터 차근차근 복습했다." },
];
export function shuffledIndices(length: number, seed: number) {
  const result = Array.from({ length }, (_, i) => i);
  let state = seed >>> 0;
  for (let i = length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (length > 1 && result.every((value, i) => value === i)) result.push(result.shift()!);
  return result;
}
