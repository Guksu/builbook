// 에디터의 현재 선택 텍스트를 다른 패널(영감 서랍 AI 탭)이 읽을 수 있게 하는 아주 작은 저장소.
// 에디터가 publish하고, 패널이 구독한다 — 작업실을 거쳐 props를 내려보내지 않아도 된다.
import { useSyncExternalStore } from "react";

let selectionText = "";
const listeners = new Set<() => void>();

export function publishSelectionText(text: string): void {
  if (text === selectionText) return;
  selectionText = text;
  for (const l of listeners) l();
}

export function getSelectionText(): string {
  return selectionText;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const getServerSnapshot = () => "";

export function useSelectionText(): string {
  return useSyncExternalStore(subscribe, getSelectionText, getServerSnapshot);
}
