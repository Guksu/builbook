import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, apiError, UNAUTHENTICATED } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// 소유권 확인 헬퍼: 존재하지 않으면 null, 타인 소유면 false
async function ownProject(projectId: string, userId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) return null;
  return p.ownerId === userId ? p : false;
}

// GET /api/projects/[id] → Project
export async function GET(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;
  const { id } = await params;

  const p = await ownProject(id, user.id);
  if (p === null) return apiError("NOT_FOUND", "작품을 찾을 수 없습니다.", 404);
  if (p === false) return apiError("FORBIDDEN", "권한이 없습니다.", 403);
  return NextResponse.json(p);
}

const UpdateProject = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

// PATCH /api/projects/[id] → 수정된 Project
export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;
  const { id } = await params;

  const owned = await ownProject(id, user.id);
  if (owned === null) return apiError("NOT_FOUND", "작품을 찾을 수 없습니다.", 404);
  if (owned === false) return apiError("FORBIDDEN", "권한이 없습니다.", 403);

  const parsed = UpdateProject.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID", "입력이 올바르지 않습니다.", 400);

  const updated = await prisma.project.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

// DELETE /api/projects/[id] → 204
export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;
  const { id } = await params;

  const owned = await ownProject(id, user.id);
  if (owned === null) return apiError("NOT_FOUND", "작품을 찾을 수 없습니다.", 404);
  if (owned === false) return apiError("FORBIDDEN", "권한이 없습니다.", 403);

  await prisma.project.delete({ where: { id } }); // documents cascade
  return new NextResponse(null, { status: 204 });
}
