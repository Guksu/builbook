"use client";

// 검색 패널이 부르는 작업실 동작 — 결과 열기(그 위치 보여 주기)와 작품 전체 바꾸기.
// 전체 바꾸기는 DB의 본문을 직접 고치므로 순서가 중요하다:
// 열린 에디터 저장 끝내기 → 문서마다 스냅샷 + 바꾸기 → 문서 캐시 갱신·에디터 다시 불러오기.

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { flushAllAutosaves } from "@features/autosave-document";
import { replaceAcrossProject } from "@features/search-document";
import type { DocumentNode } from "@entities/document";
import { useToast } from "@shared/ui";
import type { WorkspaceViewMode } from "./useWorkspacePanels";

export interface FindRequest {
  docId: string;
  query: string;
  nonce: number;
}

interface UseSearchActionsParams {
  documents: DocumentNode[];
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setViewMode: Dispatch<SetStateAction<WorkspaceViewMode>>;
  closeSearch: () => void;
  /** 문서 캐시 갱신 + 에디터 재마운트(스냅샷 복원과 같은 후처리). */
  reloadEditors: () => Promise<void>;
}

export function useSearchActions({
  documents,
  selectedId,
  setSelectedId,
  setViewMode,
  closeSearch,
  reloadEditors,
}: UseSearchActionsParams) {
  const { toast } = useToast();
  const [findRequest, setFindRequest] = useState<FindRequest | null>(null);

  // 다른 문서로 옮기면 지난 검색 요청은 버린다 — 돌아왔을 때 찾기 바가 다시 뜨지 않게.
  useEffect(() => {
    setFindRequest((r) => (r && r.docId !== selectedId ? null : r));
  }, [selectedId]);

  function openResult(docId: string, query: string) {
    setSelectedId(docId);
    setViewMode("editor"); // 카드·관계 화면에서 눌러도 본문으로 넘어간다
    setFindRequest({ docId, query, nonce: Date.now() });
    // 좁은 화면에서는 패널이 본문을 덮으므로 닫아서 그 위치를 보이게 한다.
    if (window.matchMedia("(max-width: 767px)").matches) closeSearch();
  }

  async function replaceAll(query: string, replacement: string) {
    try {
      await flushAllAutosaves();
      const ids = documents.filter((d) => d.type === "DOC").map((d) => d.id);
      const result = await replaceAcrossProject(ids, query, replacement);
      setFindRequest(null);
      await reloadEditors();
      toast(
        result.count
          ? `문서 ${result.docs}개에서 ${result.count}곳을 바꿨어요. 바꾸기 전 본문은 스냅샷에 있어요.`
          : "바꿀 곳이 없었어요.",
        "success",
      );
    } catch {
      toast("바꾸기에 실패했어요.", "error");
    }
  }

  return { findRequest, openResult, replaceAll };
}
