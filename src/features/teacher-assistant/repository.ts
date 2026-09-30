import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { teacherAssistantEvents } from "@/db/schema";
import type { AssistantTeacher, AssistantUsageRow } from "./insights";

export type AssistantEventInput = {
  schoolId: string; userId: string; subject: string | null; tool: string | null;
  status: "SUCCEEDED" | "FAILED" | "CANCELLED"; offTopic: boolean; modelId: string;
  inputTokens?: number; outputTokens?: number; latencyMs?: number; errorCode?: string;
};

const rows = <T,>(result: unknown): T[] => (result as { rows?: T[] }).rows ?? [];

/** 대화 한 번의 결과를 통계에 남깁니다. 기록이 실패해도 선생님의 대화는 막지 않습니다. */
export async function recordAssistantEvent(event: AssistantEventInput) {
  if (!db) return;
  try {
    await db.insert(teacherAssistantEvents).values({
      schoolId: event.schoolId, userId: event.userId, subject: event.subject, tool: event.tool, status: event.status,
      offTopic: event.offTopic, modelId: event.modelId, inputTokens: event.inputTokens ?? 0, outputTokens: event.outputTokens ?? 0,
      latencyMs: event.latencyMs ?? null, errorCode: event.errorCode ?? null,
    });
  } catch (error) {
    console.error("teacher_assistant_record_failure", { code: error instanceof Error ? error.name : "UNKNOWN" });
  }
}

/** 학교 시간대 기준 조회 기간의 교사 AI 도우미 사용 기록을 날짜·교과·상태별로 묶어 가져옵니다. */
export async function queryAssistantUsage(schoolId: string, start: string, end: string, timeZone: string) {
  if (!db) return { teachers: [] as AssistantTeacher[], rows: [] as AssistantUsageRow[] };
  const [teacherResult, rowResult] = await Promise.all([
    db.execute(sql`SELECT id, name, role, active FROM users WHERE school_id = ${schoolId}::uuid AND role IN ('TEACHER', 'ADMIN')`),
    db.execute(sql`SELECT e.user_id AS "userId", to_char(e.created_at AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS date,
      e.subject, e.tool, e.status, e.off_topic AS "offTopic", COUNT(*)::int AS requests,
      SUM(e.input_tokens)::float AS "inputTokens", SUM(e.output_tokens)::float AS "outputTokens",
      COALESCE(SUM(e.latency_ms), 0)::float AS "latencyTotal", COUNT(e.latency_ms)::int AS "latencyCount",
      to_char(MAX(e.created_at) AT TIME ZONE ${timeZone}, 'YYYY-MM-DD HH24:MI') AS "lastAt"
      FROM teacher_assistant_events e
      WHERE e.school_id = ${schoolId}::uuid
        AND e.created_at >= (${start}::date::timestamp AT TIME ZONE ${timeZone})
        AND e.created_at < ((${end}::date + 1)::timestamp AT TIME ZONE ${timeZone})
      GROUP BY 1, 2, 3, 4, 5, 6`),
  ]);
  return { teachers: rows<AssistantTeacher>(teacherResult), rows: rows<AssistantUsageRow>(rowResult) };
}
