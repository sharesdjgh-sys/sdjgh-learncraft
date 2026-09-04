import {
  canonicalPublisherOfficialUrl,
  isPublisherOfficialUrl,
  publisherSourceGuides,
  resolvePublisherSourceGuide,
} from "../src/data/publisher-sources";
import { schoolCourseCatalog } from "../src/data/school-course-catalog";

const unmatchedPublishers = [...new Set(
  schoolCourseCatalog
    .filter((course) => !resolvePublisherSourceGuide(course.publisherName))
    .map((course) => course.publisherName),
)];

if (unmatchedPublishers.length > 0) {
  throw new Error(`공식 출처 레지스트리에 없는 출판사: ${unmatchedPublishers.join(", ")}`);
}

const aliasCases = [
  ["비상교육(강호영)", "VISANG"],
  ["㈜미래엔", "MIRAEN"],
  ["(주)천재교육", "CHUNJAE"],
  ["와이비엠", "YBM"],
  ["㈜엔이능률", "NEUNGYULE"],
] as const;

for (const [publisherName, expectedKey] of aliasCases) {
  const resolved = resolvePublisherSourceGuide(publisherName);
  if (resolved?.key !== expectedKey) {
    throw new Error(`${publisherName} 별칭을 ${expectedKey}로 인식하지 못했습니다.`);
  }
}

for (const guide of publisherSourceGuides) {
  if (guide.sites.length === 0 || guide.allowedDomains.length === 0) {
    throw new Error(`${guide.canonicalName}의 공식 사이트 또는 허용 도메인이 비어 있습니다.`);
  }
  for (const site of guide.sites) {
    const url = new URL(site.url);
    if (url.protocol !== "https:") throw new Error(`${site.label}은 HTTPS URL이어야 합니다.`);
  }
}

const visang = resolvePublisherSourceGuide("비상교육");
if (!visang) throw new Error("비상교육 공식 출처를 찾지 못했습니다.");
if (!visang.sites.some((site) => site.url === "https://text.vivasam.com/detail/152")) {
  throw new Error("비상교육 지리 부도 공식 상세 페이지가 등록되지 않았습니다.");
}
const redirectedVisangUrl = "http://text.vivasam.com/list/high?subjectCd=DH410&label=career";
if (!isPublisherOfficialUrl(redirectedVisangUrl, visang)) {
  throw new Error("비상교육의 HTTP 리디렉션 URL을 공식 출처로 인식하지 못했습니다.");
}
if (canonicalPublisherOfficialUrl(redirectedVisangUrl, visang)?.startsWith("https://") !== true) {
  throw new Error("비상교육 공식 URL을 HTTPS로 정규화하지 못했습니다.");
}
const geographyAtlasPdfUrl = "https://dn.vivasam.com/vs/promotion2022/830/index/download/%EA%B3%A0%EB%93%B1-%EC%A7%80%EB%A6%AC%EB%B6%80%EB%8F%84.pdf";
if (!isPublisherOfficialUrl(geographyAtlasPdfUrl, visang)) {
  throw new Error("비상교육 지리 부도 공식 목차 PDF를 공식 출처로 인식하지 못했습니다.");
}

const cmass = resolvePublisherSourceGuide("씨마스");
if (!cmass) throw new Error("씨마스 공식 출처를 찾지 못했습니다.");
for (const [label, url] of [
  ["고등일반 교과서 목록", "https://www.cmass.kr/books/002003"],
  ["2022 개정 고등 교과서 전시관", "https://viewer.cmass.kr/html/textbook/main_list.shtml?grade=high"],
  ["티칭샘 교과서 자료실", "https://teachingsaem.cmass.kr/textbook-material/list"],
] as const) {
  if (!cmass.sites.some((site) => site.url === url) || !isPublisherOfficialUrl(url, cmass)) {
    throw new Error(`씨마스 ${label}이 공식 출처로 등록되지 않았습니다.`);
  }
}

console.log(
  `출판사 공식 출처 검증 완료: ${publisherSourceGuides.length}개 출판사 그룹, 학교 카탈로그 ${schoolCourseCatalog.length}개 과목 100% 연결`,
);
