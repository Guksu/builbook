import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, apiError, UNAUTHENTICATED } from "@/lib/api";
import { loadOwnedDocument } from "@/lib/documents";

type Params = { params: Promise<{ id: string }> };

// 자동저장. 빈번하므로 가볍게 — content와 wordCount만 갱신.
const SaveContent = z.object({
  content: z.any(), // ProseMirror JSON (doc 노드)
  wordCount: z.number().int().nonnegative().optional(),
});

// PUT /api/documents/[id]/content → { ok: true, updatedAt }
export async function PUT(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;
  const { id } = await params;

  const res = await loadOwnedDocument(id, user.id);
  if (res === "not_found") return apiError("NOT_FOUND", "문서를 찾을 수 없습니다.", 404);
  if (res === "forbidden") return apiError("FORBIDDEN", "권한이 없습니다.", 403);

  const parsed = SaveContent.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID", "저장 데이터가 올바르지 않습니다.", 400);

  const updated = await prisma.document.update({
    where: { id },
    data: {
      content: parsed.data.content,
      ...(parsed.data.wordCount !== undefined ? { wordCount: parsed.data.wordCount } : {}),
    },
    select: { updatedAt: true },
  });
  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt });
}
