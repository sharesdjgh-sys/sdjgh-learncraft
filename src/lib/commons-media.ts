export type CommonsImage = {
  file: string; title: string; description: string; artist: string;
  imageUrl: string; sourceUrl: string; license: string; licenseUrl: string;
  width: number; height: number;
};

function plain(value: unknown, max = 600) {
  return (typeof value === "string" ? value : "").replace(/<(div|span)\b[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().slice(0, max);
}
function safeUrl(value: unknown, hosts: string[]) {
  if (typeof value !== "string") return "";
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && hosts.includes(url.hostname) ? url.href : ""; } catch { return ""; }
}

export function commonsImages(payload: unknown): CommonsImage[] {
  const data = payload as { query?: { pages?: Array<{ title?: string; imageinfo?: Array<{
    mime?: string; thumburl?: string; thumbwidth?: number; thumbheight?: number;
    descriptionurl?: string; extmetadata?: Record<string, { value?: string }>;
  }> }> } };
  if (!Array.isArray(data?.query?.pages)) return [];
  return data.query.pages.flatMap(page => {
    const info = page.imageinfo?.[0];
    const meta = info?.extmetadata ?? {};
    const license = plain(meta.LicenseShortName?.value ?? meta.UsageTerms?.value, 100);
    const imageUrl = safeUrl(info?.thumburl, ["upload.wikimedia.org", "thumb.wikimedia.org"]);
    const sourceUrl = safeUrl(info?.descriptionurl, ["commons.wikimedia.org"]);
    if (!page.title?.startsWith("File:") || !info || !["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(info.mime ?? "")
      || !imageUrl || !sourceUrl || !/^(CC BY(?:-SA)?(?: |$)|CC0|Public domain|PDM)/i.test(license)) return [];
    if (!Number.isFinite(info.thumbwidth) || !Number.isFinite(info.thumbheight) || !info.thumbwidth || !info.thumbheight) return [];
    return [{ file: page.title, title: plain(meta.ObjectName?.value || page.title.replace(/^File:/, ""), 240),
      description: plain(meta.ImageDescription?.value), artist: plain(meta.Attribution?.value || meta.Artist?.value, 10000) || "제작자 정보는 원문 참고",
      imageUrl, sourceUrl, license, licenseUrl: safeUrl(meta.LicenseUrl?.value, ["creativecommons.org", "www.creativecommons.org"]),
      width: info.thumbwidth, height: info.thumbheight }];
  });
}

let retryAfter = 0;
const cache = new Map<string, { until: number; images: Promise<CommonsImage[]> }>();
async function requestImages(params: Record<string, string>): Promise<CommonsImage[]> {
  const key = JSON.stringify(params);
  const existing = cache.get(key);
  if (existing && existing.until > Date.now()) return existing.images;
  if (Date.now() < retryAfter) throw new Error("이미지 서비스의 요청 제한으로 잠시 쉬고 있어요.");
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "imageinfo",
    iiprop: "url|mime|extmetadata", iiurlwidth: "900", redirects: "1", iiextmetadatalanguage: "en", ...params }).toString();
  const images = (async () => {
    const response = await fetch(url, { headers: { "User-Agent": "LearnCraft/1.0 (school learning media; Wikimedia Commons)" }, signal: AbortSignal.timeout(8000) });
    if (response.status === 429) {
      const header = response.headers.get("Retry-After") ?? "";
      const delay = /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now();
      retryAfter = Date.now() + Math.max(60_000, Number.isFinite(delay) ? delay : 0);
    }
    if (!response.ok) throw new Error("참고 이미지를 불러오지 못했어요.");
    const payload = await response.json();
    if (payload.error) throw new Error("이미지 검색 서비스가 잠시 응답하지 않아요.");
    return commonsImages(payload);
  })();
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + 3600_000, images });
  try { return await images; } catch (error) { cache.delete(key); throw error; }
}

export async function searchCommonsImages(query: string) {
  return requestImages({ generator: "search", gsrsearch: query.trim().slice(0, 180), gsrnamespace: "6", gsrlimit: "8" });
}
export async function getCommonsImage(file: string) {
  if (!/^File:[^\r\n<>|]{1,235}$/.test(file)) return null;
  const images = await requestImages({ titles: file });
  return images[0] ?? null;
}
