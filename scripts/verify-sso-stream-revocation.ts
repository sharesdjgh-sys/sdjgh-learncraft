import assert from "node:assert/strict";
import { guardSmartCampusStream } from "../src/lib/sso-stream-revocation";

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function expectRevoked(verify: () => Promise<boolean>) {
  const upstreamAbort = new AbortController();
  let cancelled = false;
  let revoked = 0;
  const source = new ReadableStream<string>({
    pull() { return new Promise<void>(() => undefined); },
    cancel() { cancelled = true; },
  });
  const reader = guardSmartCampusStream(source, verify,
    () => { revoked++; upstreamAbort.abort(); },
    () => upstreamAbort.abort(), 10, 200).getReader();
  await assert.rejects(reader.read(), { name: "AbortError" });
  assert.equal(revoked, 1);
  assert.equal(upstreamAbort.signal.aborted, true);
  await pause(10);
  assert.equal(cancelled, true);
}

async function main() {
  const direct = new ReadableStream<string>({ start(controller) { controller.enqueue("local"); controller.close(); } });
  const same = guardSmartCampusStream(direct, null, () => { throw new Error("direct login revoked"); }, () => undefined, 5);
  assert.equal(same, direct, "앱 자체 로그인은 중앙 증명 검증 대상이 아니다");
  assert.equal((await same.getReader().read()).value, "local");

  await expectRevoked(async () => false);
  await expectRevoked(async () => { throw new Error("central verifier unavailable"); });

  const alreadyRevoked = new ReadableStream<string>({ start(controller) { controller.enqueue("private"); } });
  const firstReader = guardSmartCampusStream(alreadyRevoked, async () => false,
    () => undefined, () => undefined, 10, 100).getReader();
  await assert.rejects(firstReader.read(), { name: "AbortError" }, "기존에 대기 중인 첫 청크도 재검증 전에는 보낼 수 없다");

  let checks = 0;
  let sourceController: ReadableStreamDefaultController<string> | undefined;
  let cancelled = false;
  const source = new ReadableStream<string>({
    start(controller) { sourceController = controller; controller.enqueue("first"); },
    cancel() { cancelled = true; },
  });
  const reader = guardSmartCampusStream(source, async () => ++checks === 1,
    () => undefined, () => undefined, 15, 200).getReader();
  assert.equal((await reader.read()).value, "first");
  await pause(25);
  assert.throws(() => sourceController?.enqueue("must-not-leak"), { code: "ERR_INVALID_STATE" });
  await assert.rejects(reader.read(), { name: "AbortError" });
  assert.equal(cancelled, true, "중앙 증명 폐기 후 원본 스트림도 취소한다");

  checks = 0;
  const complete = new ReadableStream<string>({ start(controller) { controller.enqueue("done"); controller.close(); } });
  const completeReader = guardSmartCampusStream(complete, async () => { checks++; return true; },
    () => undefined, () => undefined, 10, 100).getReader();
  assert.equal((await completeReader.read()).value, "done");
  assert.equal((await completeReader.read()).done, true);
  const completedChecks = checks;
  await pause(35);
  assert.equal(checks, completedChecks, "정상 완료 후 중앙 API를 다시 호출하지 않는다");

  let clientCancelled = false;
  let revokeOnClientCancel = false;
  const clientSource = new ReadableStream<string>({ pull() { return new Promise<void>(() => undefined); } });
  const clientReader = guardSmartCampusStream(clientSource, async () => true,
    () => { revokeOnClientCancel = true; }, () => { clientCancelled = true; }, 10, 100).getReader();
  await clientReader.cancel("navigation");
  assert.equal(clientCancelled, true);
  assert.equal(revokeOnClientCancel, false);

  let timedOut = false;
  let lifetimeChecks = 0;
  const idle = new ReadableStream<string>({ pull() { return new Promise<void>(() => undefined); } });
  const idleReader = guardSmartCampusStream(idle, async () => { lifetimeChecks++; return true; },
    () => { throw new Error("timeout must not be reported as revocation"); },
    () => { timedOut = true; }, 10, 35).getReader();
  await assert.rejects(idleReader.read(), { name: "AbortError" });
  assert.equal(timedOut, true);
  const checksAtTimeout = lifetimeChecks;
  await pause(30);
  assert.equal(lifetimeChecks, checksAtTimeout, "수명 종료 후 주기 검증이 멈춘다");

  console.log("sso stream revocation: direct, revoked, verifier failure, no stale chunk, completion, timeout OK");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
