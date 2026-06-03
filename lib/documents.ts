import { prisma } from "@/lib/prisma";

// 문서를 로드하고 소유권을 확인한다.
// 반환: { doc } | "not_found" | "forbidden"
export async function loadOwnedDocument(documentId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { project: { select: { ownerId: true } } },
  });
  if (!doc) return "not_found" as const;
  if (doc.project.ownerId !== userId) return "forbidden" as const;
  return { doc };
}

// parentId가 document의 자기 자신 또는 자손이면 true (순환 참조).
export async function isDescendantOrSelf(
  documentId: string,
  candidateParentId: string,
): Promise<boolean> {
  if (candidateParentId === documentId) return true;
  let cursor: string | null = candidateParentId;
  // 부모 체인을 거슬러 올라가며 documentId를 만나면 순환.
  const guard = new Set<string>();
  while (cursor) {
    const currentId: string = cursor; // string으로 좁힘
    if (guard.has(currentId)) break; // 안전장치
    guard.add(currentId);
    const node = await prisma.document.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!node) break;
    if (node.parentId === documentId) return true;
    cursor = node.parentId;
  }
  return false;
}
