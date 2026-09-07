import { listAccounts, registerAccounts, changeAccountStatus } from "@/features/accounts/handlers";

export async function GET(request: Request) { return listAccounts(request, "STUDENT"); }
export async function POST(request: Request) { return registerAccounts(request, "STUDENT"); }
export async function PATCH(request: Request) { return changeAccountStatus(request, "STUDENT"); }
