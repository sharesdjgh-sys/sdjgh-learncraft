import { planLearnCraftProvisioning, publicProvisioningSummary } from
  "./plan-smart-campus-provisioning";
import type { Binding, LocalUser, RosterSnapshot } from "./audit-smart-campus-bindings";

// Neon Pool에서 전용 연결을 빌려 사용한다. CLI 진입점은 제공하지 않으며
// 현재 후보는 운영 DB를 대상으로 실행하지 않는다.
type QueryClient = { query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  release(): void };
type QueryPool = { connect(): Promise<QueryClient> };
const SCHOOL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IDENTITY_COLUMNS = [0, 1, 3, 4, 5, 6, 7, 8, 9] as const;

function sameRosterIdentity(reviewed: RosterSnapshot, current: RosterSnapshot) {
  if (!Array.isArray(reviewed?.headers) || !Array.isArray(current?.headers) ||
      !Array.isArray(reviewed.rows) || !Array.isArray(current.rows) ||
      !Array.isArray(reviewed.registrationIds) || !Array.isArray(current.registrationIds) ||
      reviewed.headers.length !== current.headers.length ||
      reviewed.rows.length !== current.rows.length ||
      reviewed.registrationIds.length !== current.registrationIds.length) return false;
  // C열 비밀번호를 제외한 A:J와 행 순서, 등록 UUID를 다시 비교한다.
  // 검토 후 명부의 식별·역할·상태가 바뀌었으면 어떤 앱 계정도 연결하지 않는다.
  return reviewed.headers.every((value, index) => value === current.headers[index]) &&
    reviewed.registrationIds.every((value, index) => value === current.registrationIds[index]) &&
    reviewed.rows.every((row, index) => Array.isArray(row) &&
      Array.isArray(current.rows[index]) && IDENTITY_COLUMNS.every(column =>
        (row[column] ?? "") === (current.rows[index][column] ?? "")));
}

function sameDatabaseRows<T extends object>(reviewed: T[], current: T[], keys: (keyof T)[]) {
  if (!Array.isArray(reviewed) || !Array.isArray(current) || reviewed.length !== current.length) return false;
  const values = (rows: T[]) => rows.map(row => JSON.stringify(keys.map(key => row[key] ?? null)))
    .sort((a, b) => a.localeCompare(b));
  return JSON.stringify(values(reviewed)) === JSON.stringify(values(current));
}

export async function applyLearnCraftProvisioning(pool: QueryPool, input: {
  schoolId: string; schoolName: string; snapshot: RosterSnapshot;
  decisions: Parameters<typeof planLearnCraftProvisioning>[3];
  reviewedLocalUsers: LocalUser[]; reviewedBindings: Binding[];
  loadLatestRoster: () => Promise<RosterSnapshot>;
}) {
  if (typeof pool?.connect !== "function" || !SCHOOL_ID.test(input.schoolId) || !input.schoolName?.trim() ||
      !Array.isArray(input.reviewedLocalUsers) || !Array.isArray(input.reviewedBindings) ||
      typeof input.loadLatestRoster !== "function") {
    throw Error("invalid_provisioning_input");
  }
  // 풀의 개별 query()는 연결을 보장하지 않는다. BEGIN부터 종료까지
  // 같은 연결에서 실행하고, 오류가 나도 연결을 반드시 반환한다.
  const client = await pool.connect();
  let begun = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    begun = true;
    // 학교 행을 잠근 상태에서 최신 사용자·바인딩을 다시 읽는다. 검토 시점과
    // 현재 DB가 달라졌다면 계획기를 다시 통과해야만 삽입한다.
    const school = await client.query(`SELECT id::text FROM public.schools
      WHERE id = $1::uuid AND name = $2 AND active = true FOR UPDATE`,
    [input.schoolId, input.schoolName]);
    if (school.rows.length !== 1) throw Error("school_not_unique_or_active");
    const latestRoster = await input.loadLatestRoster();
    if (!sameRosterIdentity(input.snapshot, latestRoster)) throw Error("roster_snapshot_stale");
    const userRows = await client.query(`SELECT id::text, school_id::text, external_id,
      name, role::text, active FROM public.users WHERE school_id = $1::uuid FOR UPDATE`,
    [input.schoolId]);
    const bindingRows = await client.query(`SELECT school_id::text, platform_user_id,
      registration_id::text, user_id::text FROM public.smart_campus_user_bindings
      WHERE school_id = $1::uuid FOR UPDATE`, [input.schoolId]);
    // 검토한 앱 사용자·바인딩 목록이 바뀌었으면 기존 PK 판단을 다시 받아야 한다.
    if (!sameDatabaseRows(input.reviewedLocalUsers, userRows.rows as LocalUser[],
      ["id", "school_id", "external_id", "name", "role", "active"]) ||
        !sameDatabaseRows(input.reviewedBindings, bindingRows.rows as Binding[],
          ["school_id", "platform_user_id", "registration_id", "user_id"])) {
      throw Error("database_snapshot_stale");
    }
    const plan = planLearnCraftProvisioning(input.snapshot, input.schoolId,
      userRows.rows as LocalUser[], input.decisions, bindingRows.rows as Binding[]);
    if (!plan.structurallyReady) throw Error("provisioning_plan_not_ready");

    let createdUsers = 0;
    let insertedBindings = 0;
    for (const action of plan.actions) {
      let userId = action.localUserId;
      if (action.kind === "create") {
        // SSO 신규 계정은 account_credentials를 만들지 않는다. 기존 자체
        // 비밀번호 계정을 덮어쓰지 않고 중앙 증명과 바인딩으로만 로그인한다.
        const added = await client.query(`INSERT INTO public.users
          (school_id, external_id, name, role, official_grade, learning_grade, active)
          VALUES ($1::uuid,$2,$3,$4,$5,$5,true) RETURNING id::text`,
        [input.schoolId, action.externalId, action.name, action.role, action.officialGrade ?? null]);
        if (added.rows.length !== 1 || typeof added.rows[0].id !== "string") {
          throw Error("user_insert_failed");
        }
        userId = added.rows[0].id;
        createdUsers++;
      }
      const linked = await client.query(`INSERT INTO public.smart_campus_user_bindings
        (school_id, platform_user_id, registration_id, user_id)
        VALUES ($1::uuid,$2,$3::uuid,$4::uuid) RETURNING user_id::text`,
      [input.schoolId, action.platformUserId, action.registrationId, userId]);
      if (linked.rows.length !== 1 || linked.rows[0].user_id !== userId) {
        throw Error("binding_insert_failed");
      }
      insertedBindings++;
    }
    if (createdUsers !== plan.counts.create || insertedBindings !== plan.actions.length) {
      throw Error("provisioning_count_mismatch");
    }
    await client.query("COMMIT");
    return { ...publicProvisioningSummary(plan), applied: true,
      createdUsers, insertedBindings };
  } catch (error) {
    if (begun) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
