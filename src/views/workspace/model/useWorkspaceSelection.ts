"use client";

// 작업실의 '지금 보고 있는 문서' 상태.
// 마지막에 열었던 문서 복원(localStorage) · 첫 문서 자동 선택 · 사라진 문서 해제와,
// 에디터가 올려주는 실시간 분량(liveMeasure) 보관까지 한 곳에서 다룬다.

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { measureDocument, type DocumentNode } from "@entities/document";
import { ZERO_MEASURE, type TextMeasure } from "@shared/lib";

// 마지막으로 열었던 문서 — 다시 들어오면 그 자리에서 이어 쓴다(작품별).
const lastDocKey = (projectId: string) => `builbook:last-doc:${projectId}`;
function readLastDoc(projectId: string): string | null {
  try {
    return localStorage.getItem(lastDocKey(projectId));
  } catch {
    return null;
  }
}
function writeLastDoc(projectId: string, docId: string) {
  try {
    localStorage.setItem(lastDocKey(projectId), docId);
  } catch {
    /* 저장 불가 브라우저 — 무시 */
  }
}

export interface WorkspaceSelection {
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  selected: DocumentNode | null;
  liveMeasure: TextMeasure;
  setLiveMeasure: Dispatch<SetStateAction<TextMeasure>>;
}

export function useWorkspaceSelection(
  projectId: string,
  documents: DocumentNode[],
): WorkspaceSelection {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 에디터가 올려주는 실시간 분량(단어·글자) — 목표·집중모드 카운터가 즉시 반영되도록.
  const [liveMeasure, setLiveMeasure] = useState<TextMeasure>(ZERO_MEASURE);

  // 마지막에 열었던 문서를 우선 복원하고, 없으면 첫 DOC 자동 선택. 선택 문서가 사라지면 해제.
  useEffect(() => {
    if (selectedId && !documents.some((d) => d.id === selectedId)) {
      setSelectedId(null);
    }
    if (!selectedId) {
      const last = readLastDoc(projectId);
      const lastDoc = last ? documents.find((d) => d.id === last && d.type === "DOC") : null;
      const firstDoc = lastDoc ?? documents.find((d) => d.type === "DOC");
      if (firstDoc) setSelectedId(firstDoc.id);
    }
  }, [documents, selectedId, projectId]);

  // 폴더 선택은 기억하지 않는다 — 다시 들어왔을 때 복원하는 건 '쓰던 회차'뿐이다.
  useEffect(() => {
    const node = documents.find((d) => d.id === selectedId);
    if (node?.type === "DOC") writeLastDoc(projectId, node.id);
  }, [documents, projectId, selectedId]);

  const selected = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? null,
    [documents, selectedId],
  );

  // 문서 전환 시 저장된 값으로 즉시 리셋(에디터 콜백이 곧 실시간 값으로 보정).
  useEffect(() => {
    const d = documents.find((x) => x.id === selectedId);
    setLiveMeasure(d ? measureDocument(d) : ZERO_MEASURE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return { selectedId, setSelectedId, selected, liveMeasure, setLiveMeasure };
}
