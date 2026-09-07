import { z } from "zod";
import { teacherAccountSchema } from "./teacher-schema";

export type AccountRole = "STUDENT" | "TEACHER";
export type AccountInput = { loginId: string; name: string; initialPassword: string };
export const studentAccountSchema = z.object({
  loginId: z.string().trim().regex(/^\d{4,12}$/, "학번은 숫자 4~12자리여야 합니다."),
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(40, "이름은 40자 이내로 입력해 주세요."),
  initialPassword: z.string().min(6, "초기 비밀번호는 6자 이상이어야 합니다.").max(100, "초기 비밀번호는 100자 이내로 입력해 주세요."),
}).strict();
export const statusSchema = z.object({ id: z.string().uuid(), active: z.boolean() }).strict();

export function registrationSchema(role: AccountRole) {
  const account = role === "STUDENT" ? studentAccountSchema : teacherAccountSchema;
  return z.object({ accounts: z.array(account).min(1, "등록할 계정이 없습니다.").max(300, "한 번에 최대 300명까지 등록할 수 있습니다."), updateExisting: z.boolean().default(false) }).strict().superRefine((input, ctx) => {
    const ids = new Set<string>();
    input.accounts.forEach((item, index) => {
      if (ids.has(item.loginId)) ctx.addIssue({ code: "custom", path: ["accounts", index, "loginId"], message: "파일에 중복된 학번 또는 아이디가 있습니다." });
      ids.add(item.loginId);
    });
  });
}

export function accountsFromCsv(text: string, role: AccountRole): AccountInput[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === "," && !quoted) { row.push(field); field = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field); if (row.some((cell) => cell.trim())) rows.push(row);
      row = []; field = "";
    } else field += c;
  }
  if (quoted) throw new Error("CSV의 따옴표가 닫히지 않았습니다.");
  row.push(field); if (row.some((cell) => cell.trim())) rows.push(row);
  const idLabel = role === "STUDENT" ? "학번" : "아이디";
  const header = rows.shift()?.map((cell) => cell.replace(/\s/g, ""));
  if (!header || header.length !== 3 || header[0] !== idLabel || !["이름", "성함"].includes(header[1]) || header[2] !== "초기비밀번호") {
    throw new Error(`첫 줄은 ‘${idLabel},이름,초기비밀번호’ 형식으로 작성해 주세요.`);
  }
  const accountSchema = role === "STUDENT" ? studentAccountSchema : teacherAccountSchema;
  const accounts = rows.map((cells, index) => {
    if (cells.length !== 3) throw new Error(`${index + 2}행은 정확히 3개 열로 작성해 주세요.`);
    const parsed = accountSchema.safeParse({ loginId: cells[0], name: cells[1], initialPassword: cells[2] });
    if (!parsed.success) throw new Error(`${index + 2}행: ${parsed.error.issues[0].message}`);
    return parsed.data;
  });
  const parsed = registrationSchema(role).safeParse({ accounts });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return parsed.data.accounts;
}
