export type PublisherSiteKind = "company" | "textbook" | "teacher-support";

export type PublisherSourceSite = {
  kind: PublisherSiteKind;
  label: string;
  url: string;
  purpose: string;
};

export type PublisherSourceGuide = {
  key: string;
  canonicalName: string;
  aliases: readonly string[];
  allowedDomains: readonly string[];
  sites: readonly PublisherSourceSite[];
  note?: string;
};

/**
 * 학교 카탈로그에 등장하는 교과서 발행사를 기준으로 정리한 공식 출처 레지스트리.
 * URL은 회사 소개보다 교과서 목차·미리보기·교수 자료를 확인할 수 있는 페이지를 우선한다.
 */
export const publisherSourceGuides: readonly PublisherSourceGuide[] = [
  {
    key: "VISANG",
    canonicalName: "비상교육",
    aliases: ["비상", "비상교육"],
    allowedDomains: ["visang.com", "vivasam.com"],
    sites: [
      { kind: "company", label: "비상교육", url: "https://www.visang.com/", purpose: "발행사와 브랜드 확인" },
      { kind: "textbook", label: "2022 개정 비상교과서", url: "https://text.vivasam.com/", purpose: "학교급·과목·저자·교과서 목차·미리보기 확인" },
      { kind: "textbook", label: "비상교육 고등학교 지리 부도", url: "https://text.vivasam.com/detail/152", purpose: "2022 개정 지리 부도(정성훈) 교과서 정보와 공식 목차 자료 확인" },
      { kind: "teacher-support", label: "중고등 비바샘", url: "https://v.vivasam.com/", purpose: "교과서별 수업 자료와 단원 자료 확인" },
    ],
  },
  {
    key: "MIRAEN",
    canonicalName: "미래엔",
    aliases: ["미래엔", "대한교과서", "미래엔컬처그룹"],
    allowedDomains: ["mirae-n.com", "m-teacher.co.kr"],
    sites: [
      { kind: "company", label: "미래엔", url: "https://www.mirae-n.com/", purpose: "발행사와 교육출판 사업 확인" },
      { kind: "textbook", label: "2022 개정 미래엔 교과서", url: "https://22txbook.m-teacher.co.kr/", purpose: "학교급·과목·저자·목차·교과서 미리보기 확인" },
      { kind: "teacher-support", label: "엠티처", url: "https://www.m-teacher.co.kr/", purpose: "교과서별 교수학습 자료와 E-book 확인" },
    ],
  },
  {
    key: "CHUNJAE",
    canonicalName: "천재교과서·천재교육",
    aliases: ["천재교과서", "천재교육", "천재"],
    allowedDomains: ["chunjaetext.co.kr", "chunjae.co.kr", "text.tsherpa.co.kr", "tsherpa.co.kr"],
    sites: [
      { kind: "company", label: "천재교과서", url: "https://www.chunjaetext.co.kr/", purpose: "발행사와 교과용 도서 발행 정보 확인" },
      { kind: "textbook", label: "T셀파 교과서", url: "https://text.tsherpa.co.kr/", purpose: "천재교과서·천재교육 학교급별 교과서와 목차 확인" },
      { kind: "textbook", label: "T셀파 고등 교과서", url: "https://text.tsherpa.co.kr/high/", purpose: "2022 개정 고등학교 과목·저자·교과서 상세 페이지와 목차 확인" },
      { kind: "teacher-support", label: "T셀파", url: "https://www.tsherpa.co.kr/", purpose: "교과서별 차시·수업·평가 자료 확인" },
    ],
    note: "천재교과서와 천재교육은 발행사명이 다를 수 있으므로 입력된 발행사와 저자명을 함께 대조한다.",
  },
  {
    key: "DONGA",
    canonicalName: "동아출판",
    aliases: ["동아출판", "두산동아", "동아"],
    allowedDomains: ["dong-a.com", "douclass.com", "dongapublishing.com"],
    sites: [
      { kind: "company", label: "동아출판", url: "https://company.dong-a.com/", purpose: "발행사와 교과서 사업 확인" },
      { kind: "textbook", label: "2022 개정 동아출판 교과서", url: "https://promotion.douclass.com/pc/", purpose: "학교급·과목별 교과서 전시와 미리보기 확인" },
      { kind: "teacher-support", label: "두클래스", url: "https://www.douclass.com/", purpose: "교과서별 수업·평가 자료 확인" },
    ],
  },
  {
    key: "JIHAKSA",
    canonicalName: "지학사",
    aliases: ["지학사"],
    allowedDomains: ["jihak.co.kr", "tsol.jihak.co.kr"],
    sites: [
      { kind: "company", label: "지학사", url: "https://www.jihak.co.kr/", purpose: "발행사와 교과서 목록 확인" },
      { kind: "textbook", label: "지학사 2022 개정 고등 교과서", url: "https://textbook.jihak.co.kr/book-hi-car.php", purpose: "과목·저자·목차·E-book·선정 자료 확인" },
      { kind: "teacher-support", label: "티솔루션", url: "https://tsol.jihak.co.kr/", purpose: "교과서별 교수학습 자료 확인" },
    ],
  },
  {
    key: "CMASS",
    canonicalName: "씨마스",
    aliases: ["씨마스", "CMASS"],
    allowedDomains: ["cmass.kr"],
    sites: [
      { kind: "company", label: "씨마스", url: "https://www.cmass.kr/", purpose: "학교급·교과별 발행 교과서 확인" },
      { kind: "textbook", label: "씨마스 고등일반 교과서", url: "https://www.cmass.kr/books/002003", purpose: "고등학교 일반 교과서의 과목명·개정 교육과정·상세 자료 확인" },
      { kind: "textbook", label: "씨마스 교과서 전시관", url: "https://viewer.cmass.kr/html/textbook/intro.shtml", purpose: "2022 개정 교과서 목차·미리보기·선정 자료 확인" },
      { kind: "textbook", label: "씨마스 2022 개정 고등 교과서", url: "https://viewer.cmass.kr/html/textbook/main_list.shtml?grade=high", purpose: "2022 개정 고등학교 과목별 교과서 목록과 상세 페이지 확인" },
      { kind: "teacher-support", label: "씨마스 티칭샘 교과서 자료실", url: "https://teachingsaem.cmass.kr/textbook-material/list", purpose: "과목명으로 교과서·지도서·E-book·단원별 수업 자료 검색" },
    ],
  },
  {
    key: "CHANGBI",
    canonicalName: "창비교육",
    aliases: ["창비교육", "창비"],
    allowedDomains: ["changbiedu.com", "changbi.com"],
    sites: [
      { kind: "company", label: "창비교육", url: "https://www.changbiedu.com/", purpose: "발행사와 교육출판 사업 확인" },
      { kind: "textbook", label: "창비교육 교과서·참고서", url: "https://textbook.changbiedu.com/", purpose: "2022 개정 중·고등 교과서, 과목, 목차와 정오표 확인" },
    ],
  },
  {
    key: "HAENAM_EDU",
    canonicalName: "해냄에듀",
    aliases: ["해냄에듀", "해냄"],
    allowedDomains: ["hnedu.co.kr"],
    sites: [
      { kind: "textbook", label: "해냄에듀 2022 개정 교과서", url: "https://preview.hnedu.co.kr/hnedu/", purpose: "학교급·과목별 교과서, 목차, 브로슈어와 교수학습 자료 확인" },
    ],
  },
  {
    key: "DARAKWON",
    canonicalName: "다락원",
    aliases: ["다락원"],
    allowedDomains: ["darakwon.co.kr"],
    sites: [
      { kind: "company", label: "다락원", url: "https://www.darakwon.co.kr/", purpose: "발행사와 교재 정보 확인" },
      { kind: "textbook", label: "다다익샘", url: "https://textbook.darakwon.co.kr/", purpose: "2022 개정 교과서와 교사용 자료 확인" },
      { kind: "teacher-support", label: "다락원 학습자료", url: "https://www.darakwon.co.kr/studydata/default.asp?pc_id_2=12", purpose: "교과서 음원·정오표·부가 자료 확인" },
    ],
  },
  {
    key: "YBM",
    canonicalName: "YBM",
    aliases: ["YBM", "와이비엠"],
    allowedDomains: ["ybm.co.kr", "ybmcloud.com", "ybmsmartschool.com"],
    sites: [
      { kind: "company", label: "YBM", url: "https://www.ybm.co.kr/", purpose: "발행사와 교과서 사업 확인" },
      { kind: "textbook", label: "YBM 교과서", url: "https://www.ybmcloud.com/prcenter/ybmtextbook", purpose: "2022 개정 학교급·과목·저자별 교과서 확인" },
      { kind: "teacher-support", label: "Y클라우드", url: "https://www.ybmcloud.com/home.html", purpose: "교과서별 수업·평가·멀티미디어 자료 확인" },
    ],
  },
  {
    key: "NEUNGYULE",
    canonicalName: "NE능률",
    aliases: ["NE능률", "엔이능률", "능률", "능률교육"],
    allowedDomains: ["neungyule.com", "neteacher.co.kr", "netutor.co.kr"],
    sites: [
      { kind: "company", label: "NE능률", url: "https://www.neungyule.com/", purpose: "발행사와 교육출판 사업 확인" },
      { kind: "textbook", label: "엔이티처 교과서", url: "https://www.neteacher.co.kr/", purpose: "NE능률 교과서와 과목·저자 정보 확인" },
      { kind: "teacher-support", label: "엔이티처", url: "https://www.neteacher.co.kr/brand/index.asp", purpose: "교과서 수업·평가 자료 확인" },
      { kind: "teacher-support", label: "NE Tutor", url: "https://www.netutor.co.kr/", purpose: "참고서와 학습 부가자료 확인" },
    ],
  },
  {
    key: "LIBER_SCHOOL",
    canonicalName: "리베르스쿨",
    aliases: ["리베르스쿨", "리베르"],
    allowedDomains: ["liber.site"],
    sites: [
      { kind: "company", label: "리베르", url: "https://www.liber.site/", purpose: "발행사 정보 확인" },
      { kind: "textbook", label: "리베르스쿨 교과서", url: "https://textbook.liber.site/", purpose: "리베르스쿨 교과서와 목차·미리보기 확인" },
    ],
  },
] as const;

export const curriculumAuthoritySites = [
  {
    label: "NCIC 2022 개정 교육과정 자료",
    url: "https://ncic.re.kr/bbs/eduNotice2022/list.do",
    purpose: "교과별 교육과정 원문과 성취기준 확인",
  },
  {
    label: "한국교과서협회",
    url: "https://www.ktbook.com/",
    purpose: "검·인정 정보, 발행사 회원 여부와 교과서 기본정보 교차 확인",
  },
  {
    label: "고교학점제 공식 홈페이지",
    url: "https://www.hscredit.kr/curriculum/intro",
    purpose: "2022 개정 고등학교 과목 체계와 적용 범위 확인",
  },
] as const;

const curriculumAuthorityDomains = ["ncic.re.kr", "ncic.go.kr", "moe.go.kr", "kice.re.kr"] as const;

function normalizePublisherName(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/\([^)]*\)/g, "")
    .replace(/주식회사|\(주\)|㈜/g, "")
    .replace(/[\s·._-]/g, "")
    .trim();
}

function hostnameMatches(hostname: string, domain: string) {
  const normalizedHost = hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  const normalizedDomain = domain.toLocaleLowerCase("en-US").replace(/^www\./, "");
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}

function urlMatchesDomains(url: string, domains: readonly string[]) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && domains.some((domain) => hostnameMatches(parsed.hostname, domain));
  } catch {
    return false;
  }
}

function canonicalOfficialUrl(url: string, domains: readonly string[]) {
  try {
    const parsed = new URL(url);
    if (
      !["http:", "https:"].includes(parsed.protocol)
      || !domains.some((domain) => hostnameMatches(parsed.hostname, domain))
    ) return null;
    parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function resolvePublisherSourceGuide(publisherName: string) {
  const normalized = normalizePublisherName(publisherName);
  return publisherSourceGuides.find((guide) => guide.aliases.some((alias) => {
    const normalizedAlias = normalizePublisherName(alias);
    return normalized === normalizedAlias || normalized.startsWith(normalizedAlias);
  })) ?? null;
}

export function isPublisherOfficialUrl(url: string, guide: PublisherSourceGuide) {
  return canonicalPublisherOfficialUrl(url, guide) !== null;
}

export function canonicalPublisherOfficialUrl(url: string, guide: PublisherSourceGuide) {
  return canonicalOfficialUrl(url, guide.allowedDomains);
}

export function isCurriculumAuthorityUrl(url: string) {
  return urlMatchesDomains(url, curriculumAuthorityDomains);
}

export function publisherResearchGuide(publisherName: string) {
  const guide = resolvePublisherSourceGuide(publisherName);
  if (!guide) {
    return [
      `등록되지 않은 출판사 '${publisherName}'입니다.`,
      "한국교과서협회에서 정확한 법인명과 발행 여부를 먼저 교차 확인한 뒤, 해당 발행사의 공식 도메인만 사용하세요.",
    ].join("\n");
  }

  return [
    `출판사 표준명: ${guide.canonicalName}`,
    `인식 별칭: ${guide.aliases.join(", ")}`,
    "우선 확인할 공식 사이트:",
    ...guide.sites.map((site) => `- ${site.label} (${site.url}): ${site.purpose}`),
    `허용 공식 도메인: ${guide.allowedDomains.join(", ")}`,
    guide.note ? `주의: ${guide.note}` : "",
  ].filter(Boolean).join("\n");
}

export function curriculumAuthorityResearchGuide() {
  return [
    "국가 교육과정 교차 검증 사이트:",
    ...curriculumAuthoritySites.map((site) => `- ${site.label} (${site.url}): ${site.purpose}`),
    "성취기준 코드와 원문은 NCIC·교육부·한국교육과정평가원 공식 도메인에서만 확정하세요.",
  ].join("\n");
}
