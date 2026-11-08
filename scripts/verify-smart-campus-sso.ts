import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  inferOfficialGrade,
  mapSmartCampusRole,
  primarySmartCampusExternalId,
  smartCampusExternalIdCandidates,
} from "../src/lib/smart-campus-identity";

assert.equal(mapSmartCampusRole("학생"), "STUDENT");
assert.equal(mapSmartCampusRole("교사"), "TEACHER");
assert.equal(mapSmartCampusRole("업무담당자"), "TEACHER");
assert.equal(mapSmartCampusRole("관리자"), "ADMIN");
assert.equal(mapSmartCampusRole("외부사용자"), null);

const student = { uid: "26-10101", userId: "student@example" };
assert.equal(primarySmartCampusExternalId(student), "10101");
assert.deepEqual(smartCampusExternalIdCandidates(student), ["10101", "26-10101", "student@example"]);
assert.equal(inferOfficialGrade("10101"), 1);
assert.equal(inferOfficialGrade("30101"), 3);
assert.equal(inferOfficialGrade("teacher"), null);

async function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const bridge = await readFile(`${root}/src/components/auth/smart-campus-sso.tsx`, "utf8");
  const route = await readFile(`${root}/src/app/api/auth/sso/route.ts`, "utf8");
  const config = await readFile(`${root}/next.config.ts`, "utf8");
  const auth = await readFile(`${root}/src/lib/auth.ts`, "utf8");

  assert.match(bridge, /event\.origin !== parentOrigin/);
  assert.match(bridge, /event\.source !== window\.parent/);
  assert.match(bridge, /postMessage\(\{ type: "sso:ready" \}, parentOrigin\)/);
  assert.doesNotMatch(bridge, /\?token=/);
  assert.match(route, /verifySmartCampusToken/);
  assert.match(route, /createSession\(user, \{ embedded: true \}\)/);
  assert.match(config, /frame-ancestors https:\/\/platform\.sdjgh-ai\.kr/);
  assert.match(auth, /partitioned: embeddedCookie/);

  console.log("Smart Campus SSO mapping, message boundary, cookie, and framing checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
