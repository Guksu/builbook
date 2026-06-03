// 데모 시드: 빈 상태/채워진 상태를 모두 테스트할 수 있도록 작품 1개 + 문서 트리 일부 생성.
// 실행: npm run db:seed (tsx prisma/seed.ts)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Tiptap(ProseMirror) 빈 문서 골격
const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@builbook.app" },
    update: {},
    create: { email: "demo@builbook.app", name: "데모 작가" },
  });

  const project = await prisma.project.create({
    data: {
      title: "첫 번째 웹소설",
      description: "데모 작품입니다.",
      ownerId: user.id,
    },
  });

  const part1 = await prisma.document.create({
    data: { projectId: project.id, type: "FOLDER", title: "1부", order: 0 },
  });

  await prisma.document.create({
    data: {
      projectId: project.id,
      parentId: part1.id,
      type: "DOC",
      title: "1화 - 프롤로그",
      order: 0,
      content: emptyDoc,
      synopsis: "주인공이 처음 등장하는 장면.",
    },
  });

  console.log("seed 완료:", { user: user.email, project: project.title });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
