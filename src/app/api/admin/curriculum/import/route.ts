import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createCurriculumDraft } from "@/data/school-curriculum";
import { requireAdmin } from "@/lib/auth";
import { parseCurriculumPdf } from "@/lib/curriculum-pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const academicYear = Number(form?.get("academicYear"));
  if (!(file instanceof File) || !Number.isInteger(academicYear) || academicYear < 2020 || academicYear > 2100) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "PDF 파일과 학년도를 확인해 주세요." } },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: { code: "FILE_SIZE_INVALID", message: "10MB 이하의 PDF 파일을 선택해 주세요." } },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder("ascii").decode(bytes.slice(0, 5)) !== "%PDF-") {
    return NextResponse.json(
      { error: { code: "FILE_TYPE_INVALID", message: "올바른 PDF 파일이 아닙니다." } },
      { status: 400 },
    );
  }

  try {
    const parsed = await Promise.race([
      parseCurriculumPdf(bytes),
      new Promise<never>((_, reject) => setTimeout(
        () => reject(new Error("PDF 분석 시간이 초과되었습니다. 더 작은 파일로 다시 시도해 주세요.")),
        20_000,
      )),
    ]);
    const fileHash = createHash("sha256").update(bytes).digest("hex");
    return NextResponse.json(await createCurriculumDraft({
      schoolId: admin.schoolId,
      adminId: admin.id,
      academicYear,
      fileName: file.name.slice(0, 240),
      fileSize: file.size,
      fileHash,
      pageCount: parsed.totalPages,
      items: parsed.offerings,
    }));
  } catch (error) {
    return NextResponse.json({
      error: {
        code: "PDF_PARSE_FAILED",
        message: error instanceof Error ? error.message : "PDF를 분석하지 못했습니다.",
      },
    }, { status: 422 });
  }
}

