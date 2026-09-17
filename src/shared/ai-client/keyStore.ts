// API 키 보관 — 기본은 이 탭의 메모리(세션)에만. 사용자가 고르면 localStorage(평문)에 남긴다.
// 서버가 없으므로 키는 이 브라우저 밖으로 나가지 않는다(Anthropic 요청 헤더 제외).
// 백업 파일·IndexedDB에는 절대 넣지 않는다.
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "builbook:ai-key";

let sessionKey: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function readPersisted(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** 형태만 본다 — 진짜 유효성은 첫 요청(401)이 판정한다. */
export function looksLikeApiKey(key: string): boolean {
  const k = key.trim();
  return k.startsWith("sk-ant-") && k.length >= 30 && !/\s/.test(k);
}

export function getApiKey(): string | null {
  return sessionKey ?? readPersisted();
}

export function hasPersistedKey(): boolean {
  return readPersisted() !== null;
}

export function setApiKey(key: string, persist: boolean): void {
  const k = key.trim();
  sessionKey = k;
  try {
    if (persist) localStorage.setItem(STORAGE_KEY, k);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 저장 불가 — 세션만 */
  }
  emit();
}

export function clearApiKey(): void {
  sessionKey = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 무시 */
  }
  emit();
}

/** 화면 표시용 — 앞 7자 + 끝 4자만. */
export function maskApiKey(key: string): string {
  if (key.length <= 12) return "•".repeat(key.length);
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const getServerSnapshot = () => null;

/** 현재 키(없으면 null). 저장·삭제 시 즉시 다시 렌더된다. */
export function useApiKey(): string | null {
  return useSyncExternalStore(subscribe, getApiKey, getServerSnapshot);
}
