import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, apiError, UNAUTHENTICATED } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/documents → { items: Document[] }
// 평면 배열 반환. 클라이언트가 parentId로 트리를 구성한다.
export async function GET(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;
  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return apiError("NOT_FOUND", "작품을 찾을 수 없습니다.", 404);
  if (project.ownerId !== user.id) return apiError("FORBIDDEN", "권한이 없습니다.", 403);

  const items = await prisma.document.findMany({
    where: { projectId },
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
  });
  return NextResponse.json({ items });
}

const CreateDocument = z.object({
  title: z.string().min(1),
  type: z.enum(["FOLDER", "DOC"]).default("DOC"),
  parentId: z.string().nullable().optional(),
  order: z.number().int().optional(),
});

// POST /api/projects/[id]/documents → 생성된 Document (201)
export async function POST(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;
  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return apiError("NOT_FOUND", "작품을 찾을 수 없습니다.", 404);
  if (project.ownerId !== user.id) return apiError("FORBIDDEN", "권한이 없습니다.", 403);

  const parsed = CreateDocument.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID", "입력이 올바르지 않습니다.", 400);

  // parentId가 주어지면 같은 프로젝트의 노드인지 검증
  if (parsed.data.parentId) {
    const parent = await prisma.document.findUnique({ where: { id: parsed.data.parentId } });
    if (!parent || parent.projectId !== projectId) {
      return apiError("INVALID", "상위 노드가 올바르지 않습니다.", 400);
    }
  }

  const doc = await prisma.document.create({
    data: {
      projectId,
      title: parsed.data.title,
      type: parsed.data.type,
      parentId: parsed.data.parentId ?? null,
      order: parsed.data.order ?? 0,
      content: parsed.data.type === "DOC" ? { type: "doc", content: [{ type: "paragraph" }] } : undefined,
    },
  });
  return NextResponse.json(doc, { status: 201 });
}
