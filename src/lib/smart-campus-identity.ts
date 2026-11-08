import type { UserRole } from "@/types";

export type SmartCampusUser = {
  userId: string;
  uid: string;
  name: string;
  role: string;
};

const roleMap: Record<string, UserRole> = {
  "학생": "STUDENT",
  "교사": "TEACHER",
  "업무담당자": "TEACHER",
  "관리자": "ADMIN",
};

function normalizeIdentifier(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

export function mapSmartCampusRole(role: string): UserRole | null {
  return roleMap[role.normalize("NFKC").trim()] ?? null;
}

export function smartCampusExternalIdCandidates(user: Pick<SmartCampusUser, "uid" | "userId">) {
  const uid = normalizeIdentifier(user.uid);
  const userId = normalizeIdentifier(user.userId);
  const strippedUid = uid.match(/^\d{2,4}-(\d{5})$/)?.[1] ?? uid;
  return [...new Set([strippedUid, uid, userId].filter(Boolean))];
}

export function primarySmartCampusExternalId(user: Pick<SmartCampusUser, "uid" | "userId">) {
  return smartCampusExternalIdCandidates(user)[0] ?? null;
}

export function inferOfficialGrade(externalId: string): 1 | 2 | 3 | null {
  const normalized = normalizeIdentifier(externalId);
  const schoolNumber = normalized.match(/(?:^|-)\d{0,4}([123])\d{4}$/)?.[1];
  return schoolNumber ? Number(schoolNumber) as 1 | 2 | 3 : null;
}
