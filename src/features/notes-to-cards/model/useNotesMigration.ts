"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { documentsKey } from "@entities/document";
import { projectKey } from "@entities/project";
import { useToast } from "@shared/ui";
import { migrateNotesToCards } from "./migrateNotes";

/** 작업실을 열 때 리서치 노트를 카드로 옮기고, 옮겼으면 바인더를 다시 읽고 알린다. */
export function useNotesMigration(projectId: string) {
  const { toast } = useToast();
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    migrateNotesToCards(projectId)
      .then(async (count) => {
        if (cancelled || count === 0) return;
        await Promise.all([mutate(documentsKey(projectId)), mutate(projectKey(projectId))]);
        toast(`리서치 노트 ${count}개를 바인더 '리서치 노트' 폴더의 카드로 옮겼어요.`, "success");
      })
      .catch(() => {
        // 옮기기에 실패해도 노트는 그대로 남아 있다 — 다음에 열 때 다시 시도한다.
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, toast]);
}
