export async function prepareFeedbackImage(file: File): Promise<File> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("PNG, JPG, WebP 이미지를 선택해 주세요.");
  if (file.size > 10 * 1024 * 1024) throw new Error("원본 이미지는 장당 10MB 이하로 선택해 주세요.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("이미지를 읽지 못했어요. 다른 파일을 선택해 주세요."); });
  try {
    if (bitmap.width * bitmap.height > 24_000_000) throw new Error("이미지 해상도가 너무 커요. 2,400만 화소 이하로 줄여 주세요.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이 브라우저에서는 이미지를 변환할 수 없어요.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob?.type !== "image/webp") throw new Error("WebP 변환을 지원하는 브라우저를 사용해 주세요.");
      if (blob.size <= 1024 * 1024) return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
    }
    throw new Error("압축 후에도 이미지가 커요. 더 작은 이미지를 선택해 주세요.");
  } finally { bitmap.close(); }
}
