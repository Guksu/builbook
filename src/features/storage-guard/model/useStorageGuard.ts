"use client";

import useSWR from "swr";
import { summarizeStorage, type PersistState, type StorageEstimate } from "../lib/storage";

// 저장 공간 보호 요청 + 사용량 추정. 마운트 후 한 번 요청하고 SWR 키로 공유한다.
// navigator.storage.persist()는 브라우저가 거절할 수 있다(Chrome은 사이트 참여도 기준).
// 거절돼도 앱은 정상 동작하며, 안내 문구만 달라진다.
export const storageGuardKey = "storage-guard";

async function probe(): Promise<{ persist: PersistState; estimate: StorageEstimate | null }> {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!storage) return { persist: "unsupported", estimate: null };

  let persist: PersistState = "unsupported";
  try {
    if (typeof storage.persist === "function") {
      const already = typeof storage.persisted === "function" ? await storage.persisted() : false;
      const granted = already || (await storage.persist());
      persist = granted ? "persisted" : "not-persisted";
    }
  } catch {
    persist = "unsupported";
  }

  let estimate: StorageEstimate | null = null;
  try {
    if (typeof storage.estimate === "function") {
      const e = await storage.estimate();
      if (typeof e.usage === "number" && typeof e.quota === "number") {
        estimate = { usage: e.usage, quota: e.quota };
      }
    }
  } catch {
    estimate = null;
  }
  return { persist, estimate };
}

export function useStorageGuard() {
  const { data } = useSWR(storageGuardKey, probe, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return data ? summarizeStorage(data.persist, data.estimate) : null;
}
