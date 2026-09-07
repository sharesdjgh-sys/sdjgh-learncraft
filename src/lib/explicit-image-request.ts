export const EXPLICIT_IMAGE_FAILURE = "요청하신 Nano Banana 이미지를 생성하거나 품질 검수를 완료하지 못했어요. 다시 요청해 주세요.";
export const EXPLICIT_IMAGE_GUIDE = `이번 요청은 Nano Banana로 실제 생성 이미지를 만드는 요청입니다. 일반 시각자료 선택 규칙보다 이 요청을 우선합니다.
- 반드시 generate_learning_illustration을 호출합니다. 플로차트, Mermaid, flow, timeline, learncraft-figure, learncraft-graph, map, music, Markdown 표, ASCII 도식, 웹 검색 이미지로 대체하지 않습니다.
- 도구 호출 전에 정확한 내용과 문구를 구성하고, 생성용 prompt에는 평면적인 상자·화살표 도식이나 아이콘 나열 대신 설명을 담은 일러스트/인포그래픽을 요청합니다.
- 성공한 이미지는 앱이 표시합니다. 본문에는 그 이미지를 읽는 데 필요한 짧은 설명만 씁니다. 코드 블록과 별도 이미지는 출력하지 않습니다.
- 실패하면 Nano Banana 이미지 생성 또는 검수 실패를 정확히 알리고 다시 요청하도록 안내합니다. 도식이나 표를 대신 만들거나 생성이 완료됐다고 말하지 않습니다.
- 실제 원본이나 공식 정답으로 가장하지 않고 학습용 생성 이미지로 설명합니다.`;

export function requestsGeneratedImage(message: string) {
  const text = message.normalize("NFKC").toLowerCase();
  return text.split(/[\n.!?。]+/).some(clause => {
    // Explanations of terminology and requests to inspect an existing image are not generation requests.
    if (/인포그래픽(?:이란|의?\s*(?:뜻|정의))|인포그래픽이\s*뭐|what is an? infographic/.test(clause)) return false;
    const cleaned = clause
      .replace(/(?:인포그래픽|그림|이미지|삽화|일러스트)[^,;]{0,18}?(?:그리지|그려주지|만들지|생성하지)\s*(?:마|말)[^,;]{0,2}/g, "")
      .replace(/(?:인포그래픽|그림|이미지|삽화|일러스트)(?:은|는|을|를|으로|로)?\s*(?:말고|없이|빼고|필요\s*없[^,;]*)/g, "")
      .replace(/(?:그리|그려|생성하|만들)[^,;]{0,8}(?:하지\s*마|지\s*마|지\s*말)[^,;]*/g, "");
    if (/인포그래픽|나노\s*바나나|nano\s*banana|infographic/.test(cleaned)) return true;
    if (/(?:그림|이미지|삽화|일러스트)(?:으)?로\s*(?:설명|보여|표현|정리)/.test(cleaned)) return true;
    if (/(?:그림|이미지|삽화|일러스트).*(?:그려|그리|만들|생성|제작)|(?:그려|그리|만들|생성|제작).*(?:그림|이미지|삽화|일러스트)/.test(cleaned)) return true;
    if (/(?:draw|generate|create|make).*(?:picture|illustration|image)/.test(cleaned)) return true;
    return /그려\s*(?:줘|주|주세요|주세요)|그려줘/.test(cleaned) && !/(?:플로차트|순서도|흐름도|도식|mermaid)/.test(cleaned);
  });
}

export function explicitImageToolStep(stepNumber: number) {
  return stepNumber === 0
    ? { toolChoice: { type: "tool" as const, toolName: "generate_learning_illustration" as const } }
    : { toolChoice: stepNumber >= 3 ? "none" as const : "auto" as const, activeTools: ["generate_learning_illustration" as const] };
}

/** Only server-inserted image blocks are allowed; never display a model's substitute visual. */
export function finishExplicitImageAnswer(text: string, imageDelivered: boolean) {
  if (!imageDelivered) return EXPLICIT_IMAGE_FAILURE;
  let fence: { char: string; length: number } | undefined;
  return text.split("\n").filter(line => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      return false;
    }
    if (marker) { fence = { char: marker[1][0], length: marker[1].length }; return false; }
    return true;
  }).join("\n").replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
}
