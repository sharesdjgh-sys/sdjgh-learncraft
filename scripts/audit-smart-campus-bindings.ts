import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { mapSmartCampusRole, smartCampusExternalIdCandidates } from "../src/lib/smart-campus-identity";

// 명부에는 C열 비밀번호가 포함될 수 있다. 출력은 집계값만 허용하고 원문을 로그에 남기지 않는다.
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const REGISTRATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
// 운영 E열은 5자리 단독 학번과 입학연도-5자리 형태를 모두 사용한다.
const UID_STUDENT_NUMBER = /^(?:\d{2,4}-)?(\d{5})$/;

export type RosterSnapshot = {
  headers: string[];
  rows: (string | number | null)[][];
  registrationIds: (string | null)[];
};

export type LocalUser = {
  id: string;
  school_id: string;
  external_id: string;
  name: string;
  role: string;
  active: boolean;
};

export type Binding = {
  school_id: string;
  platform_user_id: string;
  registration_id: string;
  user_id: string;
};

type RecordCount = { source: string; user_id: string; record_count: number };
const RECORD_SOURCES = ["bookmarks", "feedback", "learningReports", "learningReflections",
  "quizMistakes", "dailyUsage", "usageEvents", "teacherAssistantEvents"] as const;

export function summarizeRecordCounts(rows: RecordCount[], bindings: Binding[]) {
  // 개인별 기록 건수는 메모리에서만 다루고 종류별 총계·연결 행이 없는 건수만 출력한다.
  const boundUsers = new Set(bindings.map(binding => binding.user_id));
  const summary = Object.fromEntries(RECORD_SOURCES.map(source => [source,
    { totalRecords: 0, holderAccounts: 0, recordsWithoutBindingRow: 0,
      holdersWithoutBindingRow: 0 }])) as Record<typeof RECORD_SOURCES[number], {
        totalRecords: number; holderAccounts: number; recordsWithoutBindingRow: number;
        holdersWithoutBindingRow: number } >;
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.source}:${row.user_id}`;
    if (!Object.hasOwn(summary, row.source) || !row.user_id ||
        !Number.isSafeInteger(row.record_count) || row.record_count < 0 || seen.has(key)) {
      throw Error("unexpected_database_schema");
    }
    seen.add(key);
    const item = summary[row.source as keyof typeof summary];
    item.totalRecords += row.record_count;
    item.holderAccounts++;
    if (!boundUsers.has(row.user_id)) {
      item.recordsWithoutBindingRow += row.record_count;
      item.holdersWithoutBindingRow++;
    }
  }
  return summary;
}

function normalizedName(value: unknown) {
  return String(value ?? "").normalize("NFC").trim();
}

function rosterIsValid(snapshot: RosterSnapshot): boolean {
  return Array.isArray(snapshot?.headers) && snapshot.headers.length === 10 &&
    snapshot.headers.every(header => typeof header === "string") &&
    snapshot.headers[1] === "ID" && snapshot.headers[3] === "이름" &&
    snapshot.headers[4].includes("학번") && snapshot.headers[5] === "권한" &&
    snapshot.headers[6] === "상태" && Array.isArray(snapshot.rows) &&
    snapshot.rows.length <= 100000 && Array.isArray(snapshot.registrationIds) &&
    snapshot.registrationIds.length === snapshot.rows.length &&
    snapshot.rows.every(row => Array.isArray(row) && row.length <= 10 &&
      row.every(cell => cell === null || typeof cell === "string" || typeof cell === "number")) &&
    snapshot.registrationIds.every(id => id === null || typeof id === "string");
}

export function auditBindings(snapshot: RosterSnapshot, schoolId: string,
  localUsers: LocalUser[], bindings: Binding[], bindingTablePresent: boolean) {
  if (!rosterIsValid(snapshot) || typeof schoolId !== "string" || !schoolId ||
      !Array.isArray(localUsers) || !Array.isArray(bindings)) throw Error("invalid_audit_input");

  const active = snapshot.rows.map((row, index) => ({ row, index }))
    .filter(({ row }) => row[6] === "Active");
  const eligible = active.map(({ row, index }) => ({ row, index,
    role: mapSmartCampusRole(String(row[5] ?? "")) }))
    .filter((item): item is typeof item & { role: NonNullable<typeof item.role> } => Boolean(item.role));
  const idCounts = new Map<string, number>();
  const registrationCounts = new Map<string, number>();
  const numberCounts = new Map<string, number>();
  for (const { row, index, role } of eligible) {
    const id = String(row[1] ?? "");
    const registrationId = snapshot.registrationIds[index];
    if (id) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    if (registrationId) registrationCounts.set(registrationId,
      (registrationCounts.get(registrationId) ?? 0) + 1);
    const number = role === "STUDENT" ? UID_STUDENT_NUMBER.exec(String(row[4] ?? ""))?.[1] : null;
    if (number) numberCounts.set(number, (numberCounts.get(number) ?? 0) + 1);
  }

  const usersByExternalId = new Map<string, LocalUser[]>();
  const usersById = new Map<string, LocalUser>();
  for (const user of localUsers) {
    if (user.school_id !== schoolId) continue;
    usersById.set(user.id, user);
    const list = usersByExternalId.get(user.external_id) ?? [];
    list.push(user);
    usersByExternalId.set(user.external_id, list);
  }
  const bindingsByPlatformId = new Map<string, Binding[]>();
  for (const binding of bindings) {
    if (binding.school_id !== schoolId) continue;
    const list = bindingsByPlatformId.get(binding.platform_user_id) ?? [];
    list.push(binding);
    bindingsByPlatformId.set(binding.platform_user_id, list);
  }

  const counts = {
    activeRosterRows: active.length,
    eligibleActiveRows: eligible.length,
    activeStudentRows: eligible.filter(item => item.role === "STUDENT").length,
    activeStaffRows: eligible.filter(item => item.role !== "STUDENT").length,
    unsupportedActiveRoleRows: active.length - eligible.length,
    missingOrInvalidAccountIdRows: 0,
    duplicateAccountIdRows: 0,
    missingOrInvalidRegistrationRows: 0,
    duplicateRegistrationRows: 0,
    invalidStudentUidRows: 0,
    centralFiveDigitCollisionRows: 0,
    noLegacyCandidateRows: 0,
    oneLegacyCandidateRows: 0,
    multipleLegacyCandidateRows: 0,
    soleCandidateNameAndRoleMatches: 0,
    exactBindings: 0,
    unboundRows: 0,
    staleOrConflictingBindings: 0,
    boundUserOutsideLegacyCandidates: 0,
  };
  for (const { row, index, role } of eligible) {
    const id = row[1];
    const registrationId = snapshot.registrationIds[index];
    if (typeof id !== "string" || !id || id !== id.trim() || id.length > 200) {
      counts.missingOrInvalidAccountIdRows++;
    }
    if (idCounts.get(String(id ?? ""))! > 1) counts.duplicateAccountIdRows++;
    if (!REGISTRATION_ID.test(String(registrationId ?? ""))) counts.missingOrInvalidRegistrationRows++;
    if (registrationCounts.get(String(registrationId ?? ""))! > 1) counts.duplicateRegistrationRows++;

    const uid = String(row[4] ?? "");
    const number = role === "STUDENT" ? UID_STUDENT_NUMBER.exec(uid)?.[1] : null;
    if (role === "STUDENT" && !number) counts.invalidStudentUidRows++;
    if (number && numberCounts.get(number)! > 1) counts.centralFiveDigitCollisionRows++;
    const candidates = [...new Map(smartCampusExternalIdCandidates({ uid, userId: String(id ?? "") })
      .flatMap(candidate => usersByExternalId.get(candidate) ?? [])
      .map(user => [user.id, user])).values()];
    if (candidates.length === 0) counts.noLegacyCandidateRows++;
    else if (candidates.length === 1) {
      counts.oneLegacyCandidateRows++;
      if (candidates[0].role === role && normalizedName(candidates[0].name) &&
          normalizedName(candidates[0].name) === normalizedName(row[3])) {
        counts.soleCandidateNameAndRoleMatches++;
      }
    } else counts.multipleLegacyCandidateRows++;

    const linked = bindingsByPlatformId.get(String(id ?? "")) ?? [];
    if (linked.length === 0) {
      counts.unboundRows++;
    } else if (linked.length === 1 && linked[0].registration_id === registrationId &&
        usersById.get(linked[0].user_id)?.active === true &&
        usersById.get(linked[0].user_id)?.role === role) {
      counts.exactBindings++;
      if (!candidates.some(user => user.id === linked[0].user_id)) {
        counts.boundUserOutsideLegacyCandidates++;
      }
    } else {
      counts.staleOrConflictingBindings++;
    }
  }

  const blockers: string[] = [];
  if (!bindingTablePresent) blockers.push("binding_table_missing");
  if (counts.missingOrInvalidAccountIdRows || counts.duplicateAccountIdRows ||
      counts.missingOrInvalidRegistrationRows || counts.duplicateRegistrationRows ||
      counts.invalidStudentUidRows) blockers.push("roster_identity_invalid");
  if (counts.centralFiveDigitCollisionRows || counts.multipleLegacyCandidateRows) {
    blockers.push("legacy_candidate_collision_review");
  }
  if (counts.staleOrConflictingBindings) blockers.push("binding_conflict_review");
  if (counts.boundUserOutsideLegacyCandidates) blockers.push("bound_user_candidate_mismatch_review");
  if (counts.unboundRows) blockers.push("private_manual_binding_review");
  if (counts.eligibleActiveRows && !counts.soleCandidateNameAndRoleMatches) {
    blockers.push("no_positive_control_signal");
  }
  return { mode: "read-only", applied: false, schema: { bindingTablePresent }, counts, blockers,
    note: "이 집계만으로 바인딩하지 않습니다. 사용자 확정 2026년 학번·이름 동일인 규칙은 별도 결정 생성·등록 UUID 검사에서만 적용합니다." };
}

async function readPrivateSnapshot(file: string): Promise<RosterSnapshot> {
  const privateDirectory = process.env.CAMPUS_ROSTER_PRIVATE_DIR;
  if (!privateDirectory || !file.endsWith(".json")) throw Error("invalid_audit_input");
  const root = await realpath(privateDirectory);
  const actual = await realpath(resolve(file));
  if (dirname(actual) !== root) throw Error("invalid_audit_input");
  const info = await stat(actual);
  if (!info.isFile() || info.size > MAX_INPUT_BYTES) throw Error("invalid_audit_input");
  return JSON.parse(await readFile(actual, "utf8")) as RosterSnapshot;
}

export async function readPrivateSnapshotFromStdin(
  stream: AsyncIterable<Uint8Array | string> = process.stdin,
): Promise<RosterSnapshot> {
  // GPG 복호화 결과를 파이프로 받아 명부의 평문 중간 파일을 남기지 않는다.
  // 큰 입력과 빈 입력은 DB 조회 전에 거부하고 원문은 오류·로그에 출력하지 않는다.
  if (stream === process.stdin && process.stdin.isTTY) throw Error("invalid_audit_input");
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;
    if (length > MAX_INPUT_BYTES) throw Error("invalid_audit_input");
    chunks.push(bytes);
  }
  if (!length) throw Error("invalid_audit_input");
  return JSON.parse(Buffer.concat(chunks, length).toString("utf8")) as RosterSnapshot;
}

async function readDatabase(schoolName: string) {
  if (!process.env.DATABASE_URL) throw Error("database_not_configured");
  const sql = neon(process.env.DATABASE_URL);
  // Neon HTTP의 읽기 전용 트랜잭션만 사용한다. 운영에서는 DB 읽기 전용 계정을 권장한다.
  const [userColumns, schoolRows, existingTable] = await sql.transaction([
    sql`SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'`,
    sql`SELECT id::text AS id, active FROM public.schools WHERE name = ${schoolName} LIMIT 2`,
    sql`SELECT to_regclass('public.smart_campus_user_bindings') AS binding_table`,
  ], { readOnly: true, isolationLevel: "RepeatableRead" });
  const columns = new Set(userColumns.map(row => row.column_name));
  if (["id", "school_id", "external_id", "name", "role", "active"]
    .some(column => !columns.has(column))) throw Error("unexpected_database_schema");
  if (schoolRows.length !== 1 || schoolRows[0].active !== true) throw Error("school_not_unique_or_active");
  const schoolId = String(schoolRows[0].id);
  const bindingTablePresent = Boolean(existingTable[0]?.binding_table);
  if (bindingTablePresent) {
    const [bindingColumns] = await sql.transaction([
      sql`SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'smart_campus_user_bindings'`,
    ], { readOnly: true });
    const bindingNames = new Set(bindingColumns.map(row => row.column_name));
    if (["school_id", "platform_user_id", "registration_id", "user_id"]
      .some(column => !bindingNames.has(column))) throw Error("unexpected_database_schema");
  }
  const queries = [sql`SELECT id::text, school_id::text, external_id, name, role::text, active
    FROM public.users WHERE school_id = ${schoolId}::uuid`];
  if (bindingTablePresent) queries.push(sql`SELECT school_id::text, platform_user_id,
    registration_id::text, user_id::text FROM public.smart_campus_user_bindings
    WHERE school_id = ${schoolId}::uuid`);
  // 기록 본문을 읽지 않고 소유 계정별 건수만 같은 읽기 전용 스냅샷에서 구한다.
  const recordQueries = [
    { source: "bookmarks", query: sql`SELECT b.student_id::text AS user_id, COUNT(*)::integer AS record_count
      FROM public.bookmarks b JOIN public.users u ON u.id = b.student_id
      WHERE u.school_id = ${schoolId}::uuid GROUP BY b.student_id` },
    { source: "feedback", query: sql`SELECT f.student_id::text AS user_id, COUNT(*)::integer AS record_count
      FROM public.feedback f JOIN public.users u ON u.id = f.student_id
      WHERE u.school_id = ${schoolId}::uuid GROUP BY f.student_id` },
    { source: "learningReports", query: sql`SELECT r.student_id::text AS user_id, COUNT(*)::integer AS record_count
      FROM public.learning_reports r JOIN public.users u ON u.id = r.student_id
      WHERE u.school_id = ${schoolId}::uuid GROUP BY r.student_id` },
    { source: "learningReflections", query: sql`SELECT r.student_id::text AS user_id, COUNT(*)::integer AS record_count
      FROM public.learning_reflections r JOIN public.users u ON u.id = r.student_id
      WHERE u.school_id = ${schoolId}::uuid GROUP BY r.student_id` },
    { source: "quizMistakes", query: sql`SELECT q.student_id::text AS user_id, COUNT(*)::integer AS record_count
      FROM public.quiz_mistakes q JOIN public.users u ON u.id = q.student_id
      WHERE u.school_id = ${schoolId}::uuid GROUP BY q.student_id` },
    { source: "dailyUsage", query: sql`SELECT d.student_id::text AS user_id, COUNT(*)::integer AS record_count
      FROM public.daily_usage d JOIN public.users u ON u.id = d.student_id
      WHERE u.school_id = ${schoolId}::uuid GROUP BY d.student_id` },
    { source: "usageEvents", query: sql`SELECT e.student_id::text AS user_id, COUNT(*)::integer AS record_count
      FROM public.usage_events e JOIN public.users u ON u.id = e.student_id
      WHERE u.school_id = ${schoolId}::uuid GROUP BY e.student_id` },
    { source: "teacherAssistantEvents", query: sql`SELECT t.user_id::text AS user_id, COUNT(*)::integer AS record_count
      FROM public.teacher_assistant_events t JOIN public.users u ON u.id = t.user_id
      WHERE u.school_id = ${schoolId}::uuid GROUP BY t.user_id` },
  ] as const;
  const uncovered = new Set<string>(RECORD_SOURCES);
  if (recordQueries.length !== uncovered.size ||
      recordQueries.some(item => !uncovered.delete(item.source)) || uncovered.size) {
    throw Error("unexpected_database_schema");
  }
  queries.push(...recordQueries.map(item => item.query));
  const results = await sql.transaction(queries, { readOnly: true, isolationLevel: "RepeatableRead" });
  const recordOffset = bindingTablePresent ? 2 : 1;
  const recordCounts = recordQueries.flatMap(({ source }, index) =>
    (results[recordOffset + index] as { user_id: string; record_count: number }[])
      .map(row => ({ ...row, source })));
  return { schoolId, localUsers: results[0] as LocalUser[],
    bindings: (bindingTablePresent ? results[1] : []) as Binding[],
    recordCounts, bindingTablePresent };
}

async function main(args = process.argv.slice(2)) {
  if (!((args.length === 2 && args[0] === "--input") ||
      (args.length === 1 && args[0] === "--stdin"))) throw Error("usage");
  const snapshot = args[0] === "--stdin"
    ? await readPrivateSnapshotFromStdin() : await readPrivateSnapshot(args[1]);
  const database = await readDatabase(process.env.SMART_CAMPUS_SCHOOL_NAME || "서대전여자고등학교");
  const result = auditBindings(snapshot, database.schoolId, database.localUsers,
    database.bindings, database.bindingTablePresent);
  process.stdout.write(JSON.stringify({ ...result,
    records: summarizeRecordCounts(database.recordCounts, database.bindings) }) + "\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    // DB 오류 원문은 질의나 개인 값을 포함할 수 있어 허용된 오류 코드만 표시한다.
    const known = new Set(["usage", "invalid_audit_input", "database_not_configured",
      "unexpected_database_schema", "school_not_unique_or_active"]);
    process.stderr.write(`audit_failed: ${known.has(error.message) ? error.message : "private_input_or_connection"}\n`);
    process.exitCode = 1;
  });
}
