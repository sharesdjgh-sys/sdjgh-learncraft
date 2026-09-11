import assert from "node:assert/strict";
import { browserRandomUUID } from "../src/lib/browser-random-uuid";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const fallbackUuid = browserRandomUUID({
  getRandomValues(bytes) {
    bytes.fill(0xab);
    return bytes;
  },
});
assert.match(fallbackUuid, uuidPattern);
assert.equal(fallbackUuid, "abababab-abab-4bab-abab-abababababab");
assert.match(browserRandomUUID({}), uuidPattern);

console.log("PASS: browser UUID generation works without crypto.randomUUID");
