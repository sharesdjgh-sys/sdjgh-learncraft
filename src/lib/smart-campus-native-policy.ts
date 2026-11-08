/** 중앙 연결 계정의 자체 로그인 허용 여부를 새 로그인과 기존 세션에 동일하게 적용한다. */
export async function nativeAccountAllowed(
  userId: string,
  schoolId: string,
  boundAccountsSsoOnly: boolean,
  isBound: (userId: string, schoolId: string) => Promise<boolean>,
): Promise<boolean> {
  if (!boundAccountsSsoOnly) return true;
  if (!userId || !schoolId) return false;
  try { return !(await isBound(userId, schoolId)); }
  catch { return false; }
}
