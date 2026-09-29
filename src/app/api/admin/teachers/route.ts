import { registerAccounts, changeAccountStatus } from "@/features/accounts/handlers";
import { listAccountsWithActivity } from "@/features/accounts/monitoring";

export async function GET(request: Request) { return listAccountsWithActivity(request, "TEACHER"); }
export async function POST(request: Request) { return registerAccounts(request, "TEACHER"); }
export async function PATCH(request: Request) { return changeAccountStatus(request, "TEACHER"); }
