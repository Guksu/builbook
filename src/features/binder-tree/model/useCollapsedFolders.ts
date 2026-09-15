"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collapsedStorageKey,
  parseCollapsed,
  serializeCollapsed,
} from "../lib/collapsed";

/**
 * 접힌 폴더 집합 상태 + 작품별 localStorage 영속.
 *
 * 첫 렌더는 항상 빈 집합(= 다 펼침)으로 시작하고 마운트 뒤에 저장값을 읽는다 —
 * 서버 렌더 결과와 달라져 hydration이 깨지는 걸 막기 위해서다.
 * 저장은 setState와 같은 순간에 직접 한다(effect로 미루면 첫 로드가 빈 값을 덮어쓴다).
 */
export function useCollapsedFolders(projectId: string) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  useEffect(() => {
    try {
      setCollapsed(parseCollapsed(localStorage.getItem(collapsedStorageKey(projectId))));
    } catch {
      setCollapsed(new Set());
    }
  }, [projectId]);

  const apply = useCallback(
    (next: ReadonlySet<string>) => {
      setCollapsed(next);
      try {
        localStorage.setItem(collapsedStorageKey(projectId), serializeCollapsed(next));
      } catch {
        /* 저장 불가 브라우저(프라이빗 모드 등) — 접힘은 화면 편의라 실패해도 그냥 넘어간다 */
      }
    },
    [projectId],
  );

  const toggle = useCallback(
    (id: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
          localStorage.setItem(collapsedStorageKey(projectId), serializeCollapsed(next));
        } catch {
          /* 위와 동일 */
        }
        return next;
      });
    },
    [projectId],
  );

  const expand = useCallback(
    (id: string) => {
      setCollapsed((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        try {
          localStorage.setItem(collapsedStorageKey(projectId), serializeCollapsed(next));
        } catch {
          /* 위와 동일 */
        }
        return next;
      });
    },
    [projectId],
  );

  const collapseAll = useCallback(
    (folderIds: readonly string[]) => apply(new Set(folderIds)),
    [apply],
  );
  const expandAll = useCallback(() => apply(new Set<string>()), [apply]);

  return { collapsed, toggle, expand, collapseAll, expandAll };
}
