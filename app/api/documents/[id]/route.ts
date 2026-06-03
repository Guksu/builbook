import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, apiError, UNAUTHENTICATED } from "@/lib/api";
import { loadOwnedDocument } from "@/lib/documents";

type Params = { params: Promise<{ id: string }> };

const UpdateDocument = z.object({
  title: z.string().min(1).optional(),
  synopsis: z.string().nullable().optional(),
});

// PATCH /api/documents/[id] → 수정된 Document (이름변경·시놉시스)
export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;
  const { id } = await params;

  const res = await loadOwnedDocument(id, user.id);
  if (res === "not_found") return apiError("NOT_FOUND", "문서를 찾을 수 없습니다.", 404);
  if (res === "forbidden") return apiError("FORBIDDEN", "권한이 없습니다.", 403);

  const parsed = UpdateDocument.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID", "입력이 올바르지 않습니다.", 400);

  const updated = await prisma.document.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

// DELETE /api/documents/[id] → 204 (하위 cascade)
export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;
  const { id } = await params;

  const res = await loadOwnedDocument(id, user.id);
  if (res === "not_found") return apiError("NOT_FOUND", "문서를 찾을 수 없습니다.", 404);
  if (res === "forbidden") return apiError("FORBIDDEN", "권한이 없습니다.", 403);

  await prisma.document.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
