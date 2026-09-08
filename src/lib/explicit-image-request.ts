export const EXPLICIT_IMAGE_FAILURE = "요청하신 Nano Banana 이미지를 생성하거나 품질 검수를 완료하지 못했어요. 다시 요청해 주세요.";
export const EXPLICIT_IMAGE_GUIDE = `이번 요청은 Nano Banana로 실제 생성 이미지를 만드는 요청입니다. 일반 시각자료 선택 규칙보다 이 요청을 우선합니다.
- 반드시 generate_learning_illustration을 호출합니다. 플로차트, Mermaid, flow, timeline, learncraft-figure, learncraft-graph, map, music, Markdown 표, ASCII 도식, 웹 검색 이미지로 대체하지 않습니다.
- 도구 호출 전에 핵심·기본 개념 2~4개와 시각 구성을 설계합니다. 생성용 prompt에는 그림 중심의 일러스트/인포그래픽을 요청하고, 이미지에는 짧은 제목·핵심 라벨과 필요한 기본 개념 설명 한 줄 정도를 담습니다. 개념을 이해할 최소 설명은 남기되 긴 정의·유도 과정·예외·부가 예시·심화 내용은 제외하고 본문에서 설명합니다. 실제 장면·구조·비교를 크게 그려 이해를 돕고 글자를 빽빽하게 채우지 않습니다.
- 도구가 scheduled:true를 반환하면 이미지 생성은 별도로 진행 중입니다. 기다리지 말고 핵심 개념과 원리를 본문으로 먼저 충분히 설명합니다. 실제 그림을 보았거나 완성됐다고 말하지 않습니다. 성공한 이미지는 검수 후 앱이 답변에 표시합니다. 도구가 placementMarker를 반환하면 관련 설명 직후의 독립된 줄에 그 표식을 정확히 한 번 출력하고 설명을 이어갑니다. 코드 블록과 별도 이미지는 출력하지 않습니다.
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

/** Line-framed filter: show prose while generation runs, but never leak partial visual fences. */
export function createExplicitImageTextFilter() {
  let pending = "";
  let fence: { char: string; length: number } | undefined;
  return (chunk: string, final = false) => {
    pending += chunk;
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    if (final && pending) { lines.push(pending); pending = ""; }
    const result: string[] = [];
    for (const line of lines) {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (fence) {
        if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
        continue;
      }
      if (marker) { fence = { char: marker[1][0], length: marker[1].length }; continue; }
      result.push(line.replace(/!\[[^\]]*\]\([^)]*\)/g, ""));
    }
    return result.length ? result.join("\n") + "\n" : "";
  };
}

export function finishExplicitImageAnswer(text: string, imageDelivered: boolean) {
  return imageDelivered ? createExplicitImageTextFilter()(text, true).trim() : EXPLICIT_IMAGE_FAILURE;
}
