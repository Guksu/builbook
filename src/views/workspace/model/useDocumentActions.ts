"use client";

// 바인더·코르크보드가 호출하는 문서 조작 액션 모음.
// 생성/이동(재정렬·부모 변경·다중 이동)과 스냅샷 복원 후처리를 모아 실패 토스트까지 책임진다.

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { planReorder, planMoveToParent } from "@features/reorder-document";
import type { DocumentKind, DocumentNode } from "@entities/document";
import { useToast } from "@shared/ui";
import type { DocumentsApi } from "./types";

interface UseDocumentActionsParams {
  documents: DocumentNode[];
  createDocument: DocumentsApi["createDocument"];
  moveDocument: DocumentsApi["moveDocument"];
  reorderSiblings: DocumentsApi["reorderSiblings"];
  mutateDocuments: DocumentsApi["mutate"];
  setSelectedId: Dispatch<SetStateAction<string | null>>;
}

export function useDocumentActions({
  documents,
  createDocument,
  moveDocument,
  reorderSiblings,
  mutateDocuments,
  setSelectedId,
}: UseDocumentActionsParams) {
  const { toast } = useToast();
  // 스냅샷 복원 시 에디터를 강제 재마운트해 교체된 content를 다시 로드하는 토큰.
  const [reloadToken, setReloadToken] = useState(0);

  async function handleCreate(input: {
    title: string;
    type: "FOLDER" | "DOC";
    parentId: string | null;
    content?: unknown;
    kind?: DocumentKind;
  }) {
    // 바인더가 생성된 문서를 곧바로 인라인 이름 편집으로 열기 때문에 결과를 돌려준다.
    try {
      const doc = await createDocument(input);
      if (doc?.type === "DOC") setSelectedId(doc.id);
      return doc;
    } catch {
      toast("문서 생성에 실패했어요.", "error");
      return null;
    }
  }

  // 스냅샷 복원 완료 후: 문서 캐시 갱신 → selected.content 최신화 → 에디터 재마운트.
  async function handleRestored() {
    await mutateDocuments();
    setReloadToken((t) => t + 1);
  }

  async function handleMove(
    dragId: string,
    targetId: string,
    mode: "into" | "before",
  ) {
    const plan = planReorder(documents, dragId, targetId, mode);
    if (!plan) return; // 순환·무의미 이동은 무시
    try {
      if (plan.kind === "move") {
        await moveDocument(plan.id, plan.parentId, plan.order);
      } else {
        await reorderSiblings(plan.parentId, plan.orderedIds);
      }
    } catch {
      toast("이동에 실패했어요.", "error");
    }
  }

  // 메뉴 "최상위로 이동"·트리 아래 드롭: 지정 부모의 맨 끝으로.
  async function handleMoveToParent(docId: string, parentId: string | null) {
    const plan = planMoveToParent(documents, docId, parentId);
    if (!plan || plan.kind !== "move") return;
    try {
      await moveDocument(plan.id, plan.parentId, plan.order);
    } catch {
      toast("이동에 실패했어요.", "error");
    }
  }

  // 다중 선택 이동: 하나씩 옮기되, 옮긴 결과를 반영한 사본으로 다음 자리를 계산한다
  // (매번 원래 목록으로 계산하면 전부 같은 order를 받아 한자리에 겹친다).
  async function handleMoveManyToParent(ids: string[], parentId: string | null) {
    let working = documents;
    for (const docId of ids) {
      const plan = planMoveToParent(working, docId, parentId);
      if (!plan || plan.kind !== "move") continue;
      try {
        await moveDocument(plan.id, plan.parentId, plan.order);
      } catch {
        toast("이동에 실패했어요.", "error");
        return;
      }
      working = working.map((d) =>
        d.id === plan.id ? { ...d, parentId: plan.parentId, order: plan.order } : d,
      );
    }
  }

  return {
    reloadToken,
    handleCreate,
    handleRestored,
    handleMove,
    handleMoveToParent,
    handleMoveManyToParent,
  };
}
