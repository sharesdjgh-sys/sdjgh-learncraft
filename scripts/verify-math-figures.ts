import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const scripts = [
  "scripts/verify-math-figure-coverage.ts",
  "scripts/verify-math-figure-lab.ts",
  "scripts/verify-math-figure-angle.ts",
  "scripts/verify-math-figure-hemisphere.ts",
  "scripts/verify-math-figure-dimension.ts",
  "scripts/verify-math-figure-export.ts",
  "scripts/verify-math-figure-construction-render.tsx",
  "scripts/verify-graph.tsx",
];
for (const script of scripts) {
  const result = spawnSync(process.execPath,["--import","tsx",script],{stdio:"inherit"});
  if (result.error || result.status !== 0) { console.error(`Failed: ${script}`,result.error ?? ""); process.exit(1); }
}
const reference = "ref/수학 도형 문제 그림/반구와 단면.svg";
if (existsSync(reference)) {
  const result = spawnSync(process.execPath,["--import","tsx","scripts/verify-hemisphere-reference.ts",reference],{stdio:"inherit"});
  if (result.error || result.status !== 0) process.exit(1);
} else console.log("Optional private hemisphere SVG fixture not present; synthetic hemisphere tests ran.");
console.log("All math figure regression suites passed. No live AI calls or browser interaction are included.");
