import "server-only";

import { createHmac } from "node:crypto";
import { env } from "@/lib/env";

type RateLimitCategory = "login" | "tutor" | "image";
type Subject = { kind: "user" | "school" | "ip"; value: string; limit: number; windowSeconds: number };
type RateLimitInput = { category: RateLimitCategory; userId?: string; schoolId?: string; ip?: string };

const policies: Record<RateLimitCategory, (input: RateLimitInput) => Subject[]> = {
  login: ({ userId, ip }) => [
    userId && { kind: "user", value: userId, limit: 10, windowSeconds: 600 },
    ip && { kind: "ip", value: ip, limit: 50, windowSeconds: 600 },
  ].filter((item): item is Subject => Boolean(item)),
  tutor: ({ userId, schoolId, ip }) => [
    userId && { kind: "user", value: userId, limit: 6, windowSeconds: 60 },
    schoolId && { kind: "school", value: schoolId, limit: 300, windowSeconds: 60 },
    schoolId && { kind: "school", value: schoolId, limit: 10_000, windowSeconds: 86_400 },
    ip && { kind: "ip", value: ip, limit: 300, windowSeconds: 60 },
  ].filter((item): item is Subject => Boolean(item)),
  image: ({ userId, schoolId, ip }) => [
    userId && { kind: "user", value: userId, limit: 2, windowSeconds: 600 },
    userId && { kind: "user", value: userId, limit: 5, windowSeconds: 86_400 },
    schoolId && { kind: "school", value: schoolId, limit: 60, windowSeconds: 600 },
    schoolId && { kind: "school", value: schoolId, limit: 500, windowSeconds: 86_400 },
    ip && { kind: "ip", value: ip, limit: 60, windowSeconds: 600 },
  ].filter((item): item is Subject => Boolean(item)),
};

const incrementScript = `
local results = {}
for i, key in ipairs(KEYS) do
  local count = redis.call("INCR", key)
  if count == 1 then redis.call("EXPIRE", key, tonumber(ARGV[i])) end
  results[i] = count
end
return results
`;

let configurationWarningWritten = false;

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

function identityKey(value: string) {
  const secret = env.AUTH_SECRET ?? "learncraft-development-rate-limit";
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);
}

async function increment(subjects: Subject[], category: RateLimitCategory) {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN || subjects.length === 0) return null;
  const keys = subjects.map((subject) => `learncraft:rl:${category}:${subject.kind}:${subject.windowSeconds}:${identityKey(subject.value)}`);
  const response = await fetch(env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, ""), {
    method: "POST",
    headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(["EVAL", incrementScript, keys.length, ...keys, ...subjects.map((subject) => subject.windowSeconds)]),
    cache: "no-store",
    signal: AbortSignal.timeout(1_500),
  });
  if (!response.ok) throw new Error(`RATE_LIMIT_STORE_${response.status}`);
  const payload = await response.json() as { result?: unknown; error?: string };
  if (payload.error || !Array.isArray(payload.result)) throw new Error("RATE_LIMIT_STORE_RESPONSE");
  return payload.result.map(Number);
}

export async function checkRequestRateLimit(input: RateLimitInput) {
  const subjects = policies[input.category](input);
  const configured = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
  if (!configured && !configurationWarningWritten) {
    configurationWarningWritten = true;
    console.warn("rate_limit_store_unconfigured", { mode: env.RATE_LIMIT_MODE });
  }
  try {
    const counts = await increment(subjects, input.category);
    const exceeded = counts?.flatMap((count, index) => count > subjects[index].limit ? [{
      subject: subjects[index].kind,
      limit: subjects[index].limit,
      windowSeconds: subjects[index].windowSeconds,
    }] : []) ?? [];
    if (exceeded.length > 0) console.warn("rate_limit_exceeded", { category: input.category, mode: env.RATE_LIMIT_MODE, exceeded });
    return {
      allowed: exceeded.length === 0 || env.RATE_LIMIT_MODE === "shadow",
      exceeded,
      configured,
      mode: env.RATE_LIMIT_MODE,
    };
  } catch (error) {
    console.error("rate_limit_store_failure", { category: input.category, code: error instanceof Error ? error.message : "UNKNOWN" });
    return { allowed: true, exceeded: [], configured, mode: env.RATE_LIMIT_MODE };
  }
}
