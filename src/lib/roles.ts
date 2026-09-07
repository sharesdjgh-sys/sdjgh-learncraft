import type { UserRole } from "@/types";

export function canUseLearning(role: UserRole) {
  return role === "STUDENT" || role === "TEACHER";
}

export function homeForRole(role: UserRole) {
  return role === "ADMIN" ? "/admin/dashboard" : "/learn";
}
