import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, apiError, UNAUTHENTICATED } from "@/lib/api";

// GET /api/projects → { items: Project[] }  (본인 소유, 최근 수정순)
export async function GET() {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;

  const items = await prisma.project.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items });
}

const CreateProject = z.object({
  title: z.string().min(1, "제목을 입력하세요."),
  description: z.string().optional(),
});

// POST /api/projects → 생성된 Project (201)
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return UNAUTHENTICATED;

  const parsed = CreateProject.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID", "입력이 올바르지 않습니다.", 400);

  const project = await prisma.project.create({
    data: { ...parsed.data, ownerId: user.id },
  });
  return NextResponse.json(project, { status: 201 });
}
