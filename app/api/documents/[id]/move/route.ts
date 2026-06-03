import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, apiError, UNAUTHENTICATED } from "@/lib/api";
import { loadOwnedDocument, isDescendantOrSelf } from "@/lib/documents";

type Params = { params: Promise<{ id: string }> };

const Move = z.object({
  parentId: z.string().nullable(), // null = 루트로 이동
  order: z.number().int(),
});

// PATCH /api/documents/[id]/move → 이동·재정렬된 Document
export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;
  const { id } = await params;

  const res = await loadOwnedDocument(id, user.id);
  if (res === "not_found") return apiError("NOT_FOUND", "문서를 찾을 수 없습니다.", 404);
  if (res === "forbidden") return apiError("FORBIDDEN", "권한이 없습니다.", 403);

  const parsed = Move.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID", "입력이 올바르지 않습니다.", 400);
  const { parentId, order } = parsed.data;

  if (parentId) {
    // 대상 부모가 같은 프로젝트인지
    const parent = await prisma.document.findUnique({ where: { id: parentId } });
    if (!parent || parent.projectId !== res.doc.projectId) {
      return apiError("INVALID", "이동 대상이 올바르지 않습니다.", 400);
    }
    // 순환 참조 차단: 자기 자신 또는 자손을 부모로 지정 불가
    if (await isDescendantOrSelf(id, parentId)) {
      return apiError("CONFLICT", "자기 자신이나 하위 노드로는 이동할 수 없습니다.", 409);
    }
  }

  const updated = await prisma.document.update({
    where: { id },
    data: { parentId, order },
  });
  return NextResponse.json(updated);
}
