import { NextResponse } from "next/server";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import type { AccountRole } from "./model";

/** 이 기간 넘게 로그인하지 않은 활성 계정을 '장기 미접속'으로 봅니다. */
export const DORMANT_DAYS = 30;
/** 최근 이용(AI 성공 요청)을 세는 기간입니다. */
export const USAGE_DAYS = 30;
export const PAGE_SIZE = 50;
export const accountStatuses = ["all", "active", "inactive", "never", "dormant", "unused"] as const;
export const accountSorts = ["recent", "name", "id", "login", "stale", "usage"] as const;
export type AccountStatusFilter = (typeof accountStatuses)[number];
export type AccountSort = (typeof accountSorts)[number];

export type AccountRow = {
  id: string; loginId: string; name: string; grade: number | null; active: boolean;
  /** 학교 시간대 기준 `YYYY-MM-DD HH:MM` */
  createdAt: string; lastLoginAt: string | null; passwordUpdatedAt: string | null; lastUsedAt: string | null;
  loginDaysAgo: number | null; requests: number; activeDays: number;
};
/** 학년별(교사는 null 한 줄) 계정 상태 건수 */
export type AccountSummaryRow = { grade: number | null; total: number; active: number; inactive: number; never: number; dormant: number; unused: number };
export type AccountPage = {
  accounts: AccountRow[]; total: number; page: number; pageSize: number; hasMore: boolean;
  summary: AccountSummaryRow[]; timeZone: string; dormantDays: number; usageDays: number;
};

const fail = (message: string, status: number, code = "ACCOUNT_ERROR") => NextResponse.json({ error: { code, message } }, { status });
const rows = <T,>(result: unknown): T[] => (result as { rows?: T[] }).rows ?? [];
const pick = <T extends readonly string[]>(values: T, value: string | null, fallback: T[number]): T[number] => values.includes(value ?? "") ? value as T[number] : fallback;

const statusWhere: Record<AccountStatusFilter, SQL | undefined> = {
  all: undefined,
  active: sql`active`,
  inactive: sql`NOT active`,
  never: sql`active AND last_login IS NULL`,
  dormant: sql`active AND last_login < now() - ${DORMANT_DAYS} * interval '1 day'`,
  unused: sql`active AND requests = 0`,
};
const orderBy: Record<AccountSort, SQL> = {
  recent: sql`updated_at DESC, id`,
  name: sql`name, external_id`,
  id: sql`external_id`,
  login: sql`last_login DESC NULLS LAST, name`,
  stale: sql`last_login ASC NULLS FIRST, name`,
  usage: sql`requests DESC, name`,
};

/** 계정 목록과 로그인·최근 이용 상태를 함께 조회합니다. `export=1`이면 조건에 맞는 전체(최대 5000명)를 돌려줍니다. */
export async function listAccountsWithActivity(request: Request, role: AccountRole) {
  const admin = await requireAdmin();
  if (!admin) return fail("관리자 권한이 필요합니다.", 403, "FORBIDDEN");
  if (!db) return fail("계정 관리를 사용하려면 데이터베이스 연결이 필요합니다.", 503);
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim().slice(0, 80) ?? "";
  const status = pick(accountStatuses, params.get("status"), "all");
  const sort = pick(accountSorts, params.get("sort"), "recent");
  const grade = role === "STUDENT" ? pick(["ALL", "1", "2", "3", "none"] as const, params.get("grade"), "ALL") : "ALL";
  const exporting = params.get("export") === "1";
  const pageSize = exporting ? 5000 : PAGE_SIZE;
  const page = exporting ? 1 : Math.max(1, Math.min(1000, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  try {
    const [school] = rows<{ timezone: string }>(await db.execute(sql`SELECT timezone FROM schools WHERE id = ${admin.schoolId}::uuid`));
    const timeZone = school?.timezone ?? "Asia/Seoul";
    const local = (column: string) => sql`to_char(${sql.raw(column)} AT TIME ZONE ${timeZone}, 'YYYY-MM-DD HH24:MI')`;
    const base = sql`WITH recent AS (
        SELECT student_id, COUNT(*)::int AS requests,
          COUNT(DISTINCT (created_at AT TIME ZONE ${timeZone})::date)::int AS active_days, MAX(created_at) AS last_used
        FROM usage_events
        WHERE school_id = ${admin.schoolId}::uuid AND status = 'SUCCEEDED' AND created_at >= now() - ${USAGE_DAYS} * interval '1 day'
        GROUP BY student_id
      ), base AS (
        SELECT u.id, u.external_id, u.name, u.official_grade, u.active, u.created_at, u.updated_at, u.last_login_at AS last_login,
          c.password_updated_at, COALESCE(r.requests, 0) AS requests, COALESCE(r.active_days, 0) AS active_days, r.last_used
        FROM users u
        LEFT JOIN recent r ON r.student_id = u.id
        LEFT JOIN account_credentials c ON c.user_id = u.id
        WHERE u.school_id = ${admin.schoolId}::uuid AND u.role::text = ${role}
      )`;
    const filters = [
      q ? sql`(external_id ILIKE ${pattern} OR name ILIKE ${pattern})` : undefined,
      grade === "none" ? sql`official_grade IS NULL` : grade !== "ALL" ? sql`official_grade = ${Number(grade)}` : undefined,
      statusWhere[status],
    ].filter((item): item is SQL => Boolean(item));
    const where = filters.length ? sql`WHERE ${sql.join(filters, sql` AND `)}` : sql``;
    const [listResult, summaryResult] = await Promise.all([
      db.execute(sql`${base}
        SELECT id, external_id AS "loginId", name, official_grade AS grade, active,
          ${local("created_at")} AS "createdAt", ${local("last_login")} AS "lastLoginAt",
          ${local("password_updated_at")} AS "passwordUpdatedAt", ${local("last_used")} AS "lastUsedAt",
          floor(extract(epoch FROM now() - last_login) / 86400)::int AS "loginDaysAgo",
          requests, active_days AS "activeDays", COUNT(*) OVER()::int AS "totalCount"
        FROM base ${where} ORDER BY ${orderBy[sort]} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
      db.execute(sql`${base}
        SELECT official_grade AS grade, COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE active)::int AS active, COUNT(*) FILTER (WHERE NOT active)::int AS inactive,
          COUNT(*) FILTER (WHERE active AND last_login IS NULL)::int AS never,
          COUNT(*) FILTER (WHERE active AND last_login < now() - ${DORMANT_DAYS} * interval '1 day')::int AS dormant,
          COUNT(*) FILTER (WHERE active AND requests = 0)::int AS unused
        FROM base GROUP BY official_grade ORDER BY official_grade NULLS LAST`),
    ]);
    const list = rows<AccountRow & { totalCount: number }>(listResult);
    const total = list[0]?.totalCount ?? 0;
    const accounts = list.map((row) => { const { totalCount, ...account } = row; void totalCount; return account; });
    return NextResponse.json({
      accounts, total, page, pageSize, hasMore: page * pageSize < total,
      summary: rows<AccountSummaryRow>(summaryResult), timeZone, dormantDays: DORMANT_DAYS, usageDays: USAGE_DAYS,
    } satisfies AccountPage, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return fail("계정 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
