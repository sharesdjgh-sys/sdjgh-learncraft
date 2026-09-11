import { learningTextContext } from "./inline-learning-image";

const genericAnswerHeadings = new Set([
  "답변",
  "설명",
  "핵심",
  "핵심 개념",
  "핵심 내용",
  "핵심 정리",
  "내용 정리",
  "한눈에 보기",
  "쉽게 설명",
  "풀이",
  "해설",
  "정리",
  "결론",
  "학습 목표",
  "확인 문제",
  "확인 정답",
]);

function cleanTopicCandidate(value: string) {
  return value
    .replace(/^\s*(?:\d+[.)]|[①-⑳])\s*/, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, "$1")
    .replace(/\\(?:quad|qquad|enspace|space|thinspace|medspace|thickspace)\b/g, " ")
    .replace(/\\[,;:! ]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_`~$#{}]/g, "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?,;·\- ]+$/g, "")
    .slice(0, 52)
    .trim()
    .replace(/[. ]+$/g, "");
}

function specificTopic(value: string) {
  const cleaned = cleanTopicCandidate(value);
  if (!cleaned) return "";

  const colonParts = value.split(/[:：]/).map(cleanTopicCandidate).filter(Boolean);
  if (colonParts.length > 1 && genericAnswerHeadings.has(colonParts[0])) {
    return colonParts.slice(1).join(" ").slice(0, 52).trim();
  }

  return genericAnswerHeadings.has(cleaned) ? "" : cleaned;
}

export function answerTopicForPdfFileName(answerMarkdown: string) {
  const answer = learningTextContext(answerMarkdown);
  const headings = Array.from(answer.matchAll(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm), (match) => match[1]);
  const standaloneEmphasis = Array.from(answer.matchAll(/^\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*$/gm), (match) => match[1]);

  for (const candidate of [...headings, ...standaloneEmphasis]) {
    const topic = specificTopic(candidate);
    if (topic) return topic;
  }

  const proseLines = answer
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\r?\n/)
    .map((line) => line
      .replace(/^\s*(?:#{1,6}|>|[-+*]|\d+[.)])\s*/, "")
      .replace(/^\s*(?:좋아요|물론이에요|알겠습니다)[!,.\s]*/u, "")
      .trim())
    .filter((line) => line.length >= 4 && !/^\|.*\|$/.test(line));

  for (const line of proseLines) {
    const firstSentence = line.split(/(?<=[.!?])\s+/u)[0];
    const topic = specificTopic(firstSentence);
    if (topic) return topic;
  }

  return "AI 학습 답변";
}

export function makeAnswerPdfFileName(answerMarkdown: string, createdAt = new Date()) {
  const date = [
    String(createdAt.getFullYear()).slice(-2),
    String(createdAt.getMonth() + 1).padStart(2, "0"),
    String(createdAt.getDate()).padStart(2, "0"),
  ].join("");

  return `LearnCraft_${answerTopicForPdfFileName(answerMarkdown)}_${date}`;
}
