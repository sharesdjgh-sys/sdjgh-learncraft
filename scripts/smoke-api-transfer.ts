import assert from "node:assert/strict";

const argument = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

async function main() {
  const baseUrl = (argument("--base-url") ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const url = new URL(baseUrl);
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) throw new Error("Smoke test is restricted to localhost.");
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId: argument("--login") ?? "10501", password: argument("--password") ?? "student^^", destination: "learn" }),
  });
  assert.equal(login.status, 200, `Login failed: ${await login.text()}`);
  const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie, "Session cookie missing");
  const cases = [
    { path: "/api/curriculum?view=outline", budget: 256_000 },
    { path: "/api/bookmarks?limit=24", budget: 64_000 },
    { path: "/api/bookmarks/outline", budget: 128_000 },
    { path: "/api/usage", budget: 64_000 },
  ];
  const results: Array<{ path: string; status: number; bytes: number; budget: number }> = [];
  let unitId = "";
  for (const item of cases) {
    const response: Response = await fetch(baseUrl + item.path, { headers: { Cookie: cookie } });
    const body = await response.text();
    const bytes = Buffer.byteLength(body);
    assert.equal(response.status, 200, `${item.path} returned ${response.status}`);
    assert.ok(bytes <= item.budget, `${item.path} exceeded ${item.budget} bytes: ${bytes}`);
    results.push({ ...item, status: response.status, bytes });
    if (item.path.includes("view=outline")) {
      const parsed = JSON.parse(body) as { outline?: Array<{ chapters?: Array<{ sections?: Array<{ topics?: Array<{ id?: string }> }> }> }> };
      unitId = parsed.outline?.flatMap((course) => course.chapters ?? [])
        .flatMap((chapter) => chapter.sections ?? [])
        .flatMap((section) => section.topics ?? [])
        .find((topic) => topic.id)?.id ?? "";
    }
  }
  assert.ok(unitId, "Curriculum outline has no unit");
  const unitPath = `/api/curriculum?unit=${encodeURIComponent(unitId)}`;
  const unitResponse = await fetch(baseUrl + unitPath, { headers: { Cookie: cookie } });
  const unitBody = await unitResponse.text();
  const unitBytes = Buffer.byteLength(unitBody);
  assert.equal(unitResponse.status, 200);
  assert.ok(unitBytes <= 64_000, `Unit response exceeded 64000 bytes: ${unitBytes}`);
  results.push({ path: unitPath, status: unitResponse.status, bytes: unitBytes, budget: 64_000 });
  console.table(results);
}

void main();
