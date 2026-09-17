"use client";

import { useMemo } from "react";
import useSWR from "swr";
import {
  STORES,
  dbGetAllByProject,
  dbGet,
  dbPut,
  dbBulkPut,
  dbBulkDelete,
} from "@shared/db";
import { deleteSnapshotsForDocuments } from "@entities/snapshot";
import { recordWriting } from "@entities/writing-log";
import type { TextMeasure } from "@shared/lib";
import type { DocumentNode, DocType } from "../model/types";
import type { DocumentKind } from "../lib/templates";
import {
  collectSubtreeIds,
  selectActiveDocuments,
  selectTrashedDocuments,
} from "../lib/tree";
import { measureDocument } from "../lib/count";

// 문서 목록 SWR 키 — 자동저장 등 외부에서 캐시 무효화할 때 동일 키 사용.
export const documentsKey = (projectId: string) => `documents:${projectId}`;

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
const now = () => new Date().toISOString();

function listDocuments(projectId: string) {
  return dbGetAllByProject<DocumentNode>(STORES.documents, projectId);
}

// 자동저장(feature)에서 호출하는 독립 함수 — content와 분량(단어·글자) 수치만 갱신.
export async function saveDocumentContent(
  id: string,
  content: unknown,
  measure: TextMeasure,
) {
  const doc = await dbGet<DocumentNode>(STORES.documents, id);
  if (!doc) return;
  // 저장 직전 값과의 차이가 곧 "방금 쓴 분량" — 일별 집필 기록의 유일한 입력이다.
  const before = measureDocument(doc);
  const delta = { words: measure.words - before.words, chars: measure.chars - before.chars };
  await dbPut(STORES.documents, {
    ...doc,
    content,
    wordCount: measure.words,
    charCount: measure.chars,
    charCountNoSpace: measure.charsNoSpace,
    updatedAt: now(),
  });
  try {
    await recordWriting(doc.projectId, delta);
  } catch {
    // 통계는 부가 정보 — 기록에 실패해도 원고 저장은 이미 끝났고 실패로 취급하지 않는다.
  }
}

export function useDocuments(projectId: string) {
  // SWR은 휴지통 포함 전체(raw)를 읽는다 — 소프트삭제/복원/영구삭제가 같은 캐시를 공유.
  const { data, error, isLoading, mutate } = useSWR<DocumentNode[]>(
    projectId ? documentsKey(projectId) : null,
    () => listDocuments(projectId),
  );

  const allDocuments = data ?? [];
  // 바인더·검색·목표 합계 등 문서를 소비하는 모든 곳은 '정상 문서'만 본다(휴지통 제외).
  const documents = selectActiveDocuments(allDocuments);
  // 휴지통 패널이 소비할 삭제 문서(루트 선별은 패널이 selectTrashRoots로 처리).
  const trashedDocuments = selectTrashedDocuments(allDocuments);

  // 액션 묶음은 projectId·mutate에만 묶어 렌더마다 새 함수가 생기지 않게 한다 —
  // 소비처(단축키 리스너·memo)가 매 타이핑마다 다시 붙는 낭비를 막는다.
  // 그래서 액션 안에서는 SWR 캐시(allDocuments) 대신 DB를 신선하게 읽는다(stale 방지도 겸함).
  const actions = useMemo(() => ({
    async createDocument(input: {
      title: string;
      type?: DocType;
      parentId?: string | null;
      /** 템플릿 본문(인물·설정 카드). 없으면 빈 문단. */
      content?: unknown;
      /** 문서 종류 — 회차(기본)는 저장하지 않는다(옛 레코드와 같은 모양 유지). */
      kind?: DocumentKind;
    }) {
      const title = input.title.trim();
      if (!title) return null; // 공백 제목 방어
      const type = input.type ?? "DOC";
      const parentId = input.parentId ?? null;
      const ts = now();
      // order는 IndexedDB의 최신 형제들에서 max+1로 계산한다.
      // (SWR 스냅샷 documents는 빠른 연속 생성 시 stale → order 충돌 가능)
      const siblings = await dbGetAllByProject<DocumentNode>(
        STORES.documents,
        projectId,
      );
      const order = siblings
        .filter((d) => d.parentId === parentId)
        .reduce((max, d) => Math.max(max, d.order + 1), 0);
      const doc: DocumentNode = {
        id: crypto.randomUUID(),
        projectId,
        parentId,
        type,
        title,
        order,
        content: type === "DOC" ? (input.content ?? EMPTY_DOC) : null,
        ...(type === "DOC" && input.kind && input.kind !== "episode" ? { kind: input.kind } : {}),
        synopsis: null,
        wordCount: 0,
        charCount: 0,
        charCountNoSpace: 0,
        createdAt: ts,
        updatedAt: ts,
      };
      await dbPut(STORES.documents, doc);
      await mutate();
      return doc;
    },

    async renameDocument(id: string, title: string) {
      const next = title.trim();
      if (!next) return; // 공백 제목 방어
      const doc = await dbGet<DocumentNode>(STORES.documents, id);
      if (!doc) return;
      await dbPut(STORES.documents, { ...doc, title: next, updatedAt: now() });
      await mutate();
    },

    async updateSynopsis(id: string, synopsis: string) {
      const doc = await dbGet<DocumentNode>(STORES.documents, id);
      if (!doc) return;
      await dbPut(STORES.documents, { ...doc, synopsis, updatedAt: now() });
      await mutate();
    },

    // 진행 상태 설정(초고/퇴고/완료). 코르크보드 상태 칩이 호출한다.
    async updateStatus(id: string, status: string) {
      const doc = await dbGet<DocumentNode>(STORES.documents, id);
      if (!doc) return;
      await dbPut(STORES.documents, { ...doc, status, updatedAt: now() });
      await mutate();
    },

    // 라벨 지정. null이면 라벨 해제(undefined 저장).
    async updateLabel(id: string, labelId: string | null) {
      const doc = await dbGet<DocumentNode>(STORES.documents, id);
      if (!doc) return;
      await dbPut(STORES.documents, {
        ...doc,
        label: labelId ?? undefined,
        updatedAt: now(),
      });
      await mutate();
    },

    // 작품에서 라벨을 지울 때, 그 라벨을 달고 있던 문서들의 참조를 함께 비운다(죽은 id 방지).
    async clearLabelFromDocuments(labelId: string) {
      const ts = now();
      const all = await dbGetAllByProject<DocumentNode>(STORES.documents, projectId);
      const targets = all.filter((d) => d.label === labelId);
      if (targets.length === 0) return;
      const updated = targets.map((d) => {
        const next = { ...d, updatedAt: ts };
        delete next.label;
        return next;
      });
      await dbBulkPut(STORES.documents, updated);
      await mutate();
    },

    // 문서 메모(작가 노트). 인스펙터 '정보' 탭에서 blur 시 저장.
    async updateNote(id: string, note: string) {
      const doc = await dbGet<DocumentNode>(STORES.documents, id);
      if (!doc) return;
      await dbPut(STORES.documents, { ...doc, note, updatedAt: now() });
      await mutate();
    },

    // 문서 목표 단어 수 설정. null이면 목표 해제(undefined 저장).
    async updateGoal(id: string, goal: number | null) {
      const doc = await dbGet<DocumentNode>(STORES.documents, id);
      if (!doc) return;
      await dbPut(STORES.documents, {
        ...doc,
        goal: goal ?? undefined,
        updatedAt: now(),
      });
      await mutate();
    },

    // 소프트 삭제(휴지통으로 이동). 폴더면 하위 서브트리 전체를 함께 휴지통으로.
    // 스냅샷은 여기서 지우지 않는다 — 복원 가능해야 하므로 '영구 삭제' 시점까지 보존.
    async deleteDocument(id: string) {
      const ts = now();
      // 현재 정상 문서들 기준으로 서브트리를 모은다(이미 휴지통인 노드는 대상 아님).
      const active = selectActiveDocuments(
        await dbGetAllByProject<DocumentNode>(STORES.documents, projectId),
      );
      const subtree = collectSubtreeIds(active, id);
      const targets = new Set(subtree);
      const updated = active
        .filter((d) => targets.has(d.id))
        .map((d) => ({ ...d, trashedAt: ts, updatedAt: ts }));
      await dbBulkPut(STORES.documents, updated);
      await mutate();
    },

    // 여러 개를 한 번에 휴지통으로(바인더 다중 선택). 각 항목의 서브트리를 모아 한 번만 쓰고
    // 한 번만 갱신한다 — deleteDocument를 반복하면 그 사이 목록이 갈아엎히며 순서가 꼬인다.
    async deleteDocuments(ids: string[]) {
      const ts = now();
      const active = selectActiveDocuments(
        await dbGetAllByProject<DocumentNode>(STORES.documents, projectId),
      );
      const targets = new Set(ids.flatMap((id) => collectSubtreeIds(active, id)));
      const updated = active
        .filter((d) => targets.has(d.id))
        .map((d) => ({ ...d, trashedAt: ts, updatedAt: ts }));
      if (updated.length === 0) return;
      await dbBulkPut(STORES.documents, updated);
      await mutate();
    },

    // 휴지통에서 복원(trashedAt 제거). 폴더면 서브트리 전체를 함께 복원.
    async restoreDocument(id: string) {
      const ts = now();
      // 휴지통 포함 전체(DB)에서 서브트리를 모은다(자손도 휴지통 상태이므로).
      const all = await dbGetAllByProject<DocumentNode>(STORES.documents, projectId);
      const subtree = collectSubtreeIds(all, id);
      const targets = new Set(subtree);
      const updated = all
        .filter((d) => targets.has(d.id) && d.trashedAt)
        .map((d) => {
          const next = { ...d, updatedAt: ts };
          delete next.trashedAt; // 휴지통 표식 제거 = 정상 문서로 복원
          return next;
        });
      await dbBulkPut(STORES.documents, updated);
      await mutate();
    },

    // 영구 삭제(진짜 하드 삭제 + 스냅샷 정리). 폴더면 서브트리 전체를 완전 제거.
    async permanentlyDeleteDocument(id: string) {
      const all = await dbGetAllByProject<DocumentNode>(STORES.documents, projectId);
      const subtree = collectSubtreeIds(all, id);
      await dbBulkDelete(STORES.documents, subtree);
      // 딸린 스냅샷도 함께 정리 — 고아 스냅샷 누적 방지(하드 삭제 로직이 여기로 이동).
      await deleteSnapshotsForDocuments(subtree);
      await mutate();
    },

    async moveDocument(id: string, parentId: string | null, order: number) {
      const doc = await dbGet<DocumentNode>(STORES.documents, id);
      if (!doc) return;
      await dbPut(STORES.documents, { ...doc, parentId, order, updatedAt: now() });
      await mutate();
    },

    // 형제 그룹을 orderedIds 순서로 parentId 통일 + 0..n-1 재인덱싱(드래그 재정렬).
    async reorderSiblings(parentId: string | null, orderedIds: string[]) {
      const ts = now();
      const updated: DocumentNode[] = [];
      for (let i = 0; i < orderedIds.length; i++) {
        const doc = await dbGet<DocumentNode>(STORES.documents, orderedIds[i]);
        if (doc) updated.push({ ...doc, parentId, order: i, updatedAt: ts });
      }
      await dbBulkPut(STORES.documents, updated);
      await mutate();
    },
  }), [projectId, mutate]);

  return { documents, trashedDocuments, isLoading, error, mutate, ...actions };
}
