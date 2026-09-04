import assert from "node:assert/strict";

const baseUrl = process.argv[2] ?? process.env.PWA_TEST_BASE_URL ?? "http://127.0.0.1:3000";

function readPngSize(bytes: Uint8Array) {
  assert.deepEqual(
    [...bytes.slice(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    "PWA icon must be a PNG image.",
  );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

async function main() {
  const [manifestResponse, workerResponse, offlineResponse, icon192Response, icon512Response] = await Promise.all([
    fetch(`${baseUrl}/manifest.webmanifest`),
    fetch(`${baseUrl}/sw.js`),
    fetch(`${baseUrl}/offline`),
    fetch(`${baseUrl}/pwa-icon/192`),
    fetch(`${baseUrl}/pwa-icon/512`),
  ]);

  for (const response of [manifestResponse, workerResponse, offlineResponse, icon192Response, icon512Response]) {
    assert.equal(response.status, 200, `${response.url} must return HTTP 200.`);
  }

  const manifest = await manifestResponse.json();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/learn");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.orientation, "portrait-primary");
  assert.ok(manifest.icons.some((icon: { sizes?: string }) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon: { sizes?: string; purpose?: string }) => (
    icon.sizes === "512x512" && icon.purpose?.includes("maskable")
  )));

  assert.match(workerResponse.headers.get("cache-control") ?? "", /no-cache|no-store/);
  assert.equal(workerResponse.headers.get("service-worker-allowed"), "/");
  const worker = await workerResponse.text();
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/, "Service worker must bypass API requests.");
  assert.match(worker, /request\.mode === "navigate"/, "Service worker must handle offline navigation separately.");
  assert.match(worker, /caches\.match\("\/offline"\)/, "Navigation must fall back to the offline page.");

  const offlineHtml = await offlineResponse.text();
  assert.match(offlineHtml, /인터넷 연결을 확인해 주세요/);
  assert.match(offlineHtml, /viewport-fit=cover/);
  assert.match(offlineHtml, /manifest\.webmanifest/);

  for (const [response, expected] of [[icon192Response, 192], [icon512Response, 512]] as const) {
    assert.match(response.headers.get("content-type") ?? "", /image\/png/);
    const size = readPngSize(new Uint8Array(await response.arrayBuffer()));
    assert.deepEqual(size, { width: expected, height: expected });
  }

  console.log(`PWA production checks passed at ${baseUrl}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
