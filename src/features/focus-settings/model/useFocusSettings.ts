"use client";

import { usePersistedState } from "@shared/ui";
import { DEFAULT_FOCUS_SETTINGS, isFocusSettings, type FocusSettings } from "../lib/settings";

const KEY = "builbook:focus-settings";

/** 본문 표시 설정 — 브라우저 전체에 하나(취향은 작품과 무관). */
export function useFocusSettings(): [FocusSettings, (next: Partial<FocusSettings>) => void] {
  const [settings, set] = usePersistedState<FocusSettings>(KEY, DEFAULT_FOCUS_SETTINGS, isFocusSettings);
  return [settings, (next) => set({ ...settings, ...next })];
}
