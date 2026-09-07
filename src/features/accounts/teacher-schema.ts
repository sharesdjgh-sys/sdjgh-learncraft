import { z } from "zod";

export const teacherAccountSchema = z.object({
  name: z.string().trim().min(1, "성함을 입력해 주세요.").max(40, "성함은 40자 이내로 입력해 주세요."),
  loginId: z.string().trim().max(80, "아이디는 80자 이내로 입력해 주세요.").default(""),
  initialPassword: z.string().min(6, "초기 비밀번호는 6자 이상이어야 합니다.").max(100, "초기 비밀번호는 100자 이내로 입력해 주세요."),
}).strict().transform((account) => ({
  ...account,
  loginId: (account.loginId || account.name).toLocaleLowerCase("en-US"),
})).refine((account) => /^[가-힣a-z0-9._-]+$/.test(account.loginId) && /[가-힣a-z]/.test(account.loginId), {
  path: ["loginId"],
  message: "아이디는 한글 또는 영문을 포함하고, 숫자와 . _ - 기호를 사용할 수 있습니다. 공백은 사용할 수 없습니다.",
});
