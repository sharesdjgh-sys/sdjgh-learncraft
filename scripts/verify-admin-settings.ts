import assert from "node:assert/strict";
import { limitImpact } from "../src/features/admin/ai-models";

// 1회 쓴 날 9번, 20회 2번, 51회 1번
const stats = { days: 30, dist: [{ count: 1, n: 9 }, { count: 20, n: 2 }, { count: 51, n: 1 }] };
assert.deepEqual(limitImpact(stats, 100), { total: 12, hit: 0, max: 51, rate: 0 });
assert.equal(limitImpact(stats, 51).hit, 1, "한도와 같은 횟수를 쓴 날은 한도에 닿은 날입니다.");
assert.equal(limitImpact(stats, 20).hit, 3);
assert.equal(limitImpact(stats, 20).rate, 25);
assert.deepEqual(limitImpact({ days: 30, dist: [] }, 20), { total: 0, hit: 0, max: 0, rate: 0 });
console.log("Admin settings: daily limit impact passed.");
