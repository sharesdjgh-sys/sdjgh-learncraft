import type { UserRole } from "@/types";

export function canUseLearning(role: UserRole) {
  return role === "STUDENT" || role === "TEACHER";
}

export function canUseTeacherTools(role: UserRole) {
  return role === "TEACHER" || role === "ADMIN";
}

export function homeForRole(role: UserRole) {
  return role === "ADMIN" ? "/admin/dashboard" : "/learn";
}
