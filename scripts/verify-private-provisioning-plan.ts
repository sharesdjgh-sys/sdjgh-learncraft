import { readFileSync } from "node:fs";
import { planLearnCraftProvisioning, publicProvisioningSummary } from
  "./plan-smart-campus-provisioning";

// 사람별 이름·B ID·UUID·앱 PK는 출력하지 않고 구조 검증 집계만 남긴다.
const input = JSON.parse(readFileSync(process.argv[2], "utf8"));
const plan = planLearnCraftProvisioning(input.snapshot, input.schoolId,
  input.localUsers, input.decisions, input.bindings ?? []);
process.stdout.write(`${JSON.stringify(publicProvisioningSummary(plan))}\n`);
if (!plan.structurallyReady) process.exitCode = 1;
