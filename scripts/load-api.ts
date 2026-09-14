import { performance } from "node:perf_hooks";

type Sample = { endpoint: string; status: number; milliseconds: number; bytes: number };
const argument = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const percentile = (values: number[], ratio: number) => values.slice().sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * ratio) - 1)] ?? 0;

async function main() {
  const baseUrl = (argument("--base-url") ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const parsed = new URL(baseUrl);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname) && !process.argv.includes("--allow-remote")) {
    throw new Error("Remote load tests require --allow-remote");
  }
  let cookie = argument("--cookie") ?? "";
  if (!cookie) {
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId: argument("--login") ?? "10501", password: argument("--password") ?? "student^^", destination: "learn" }),
    });
    if (!login.ok) throw new Error(`Login failed with ${login.status}`);
    cookie = login.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
    if (!cookie) throw new Error("Session cookie missing");
  }
  const iterations = Math.min(200, Math.max(1, Number(argument("--iterations") ?? 10)));
  const concurrency = Math.min(20, Math.max(1, Number(argument("--concurrency") ?? 4)));
  const unitId = argument("--unit");
  const endpoints = ["/api/curriculum?view=outline", "/api/bookmarks?limit=24", "/api/bookmarks/outline", "/api/usage"];
  if (unitId) endpoints.push(`/api/curriculum?unit=${encodeURIComponent(unitId)}`);
  const jobs = Array.from({ length: iterations }, (_, index) => endpoints[index % endpoints.length]);
  const samples: Sample[] = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < jobs.length) {
      const endpoint = jobs[cursor++];
      const startedAt = performance.now();
      const response = await fetch(baseUrl + endpoint, { headers: cookie ? { Cookie: cookie } : undefined });
      const body = await response.arrayBuffer();
      samples.push({ endpoint, status: response.status, milliseconds: performance.now() - startedAt, bytes: body.byteLength });
    }
  }));
  const summary = endpoints.map((endpoint) => {
    const group = samples.filter((sample) => sample.endpoint === endpoint);
    return {
      endpoint,
      requests: group.length,
      errors: group.filter((sample) => sample.status >= 400).length,
      p50Ms: Math.round(percentile(group.map((sample) => sample.milliseconds), 0.5)),
      p95Ms: Math.round(percentile(group.map((sample) => sample.milliseconds), 0.95)),
      maxBytes: Math.max(0, ...group.map((sample) => sample.bytes)),
    };
  });
  console.table(summary);
  if (samples.some((sample) => sample.status >= 500)) process.exitCode = 1;
}

void main();
