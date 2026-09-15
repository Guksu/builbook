"use client";

import { useEffect, useRef, useState } from "react";
import {
  TAB_CHANNEL,
  clearsConflict,
  conflictsWithMine,
  shouldAnswerBusy,
  type TabMessage,
} from "../lib/protocol";

const newTabId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

/**
 * 현재 문서를 다른 탭도 열고 있으면 true.
 * 문서를 열 때 "open"을 알리고, 같은 문서를 가진 탭은 "busy"로 답한다.
 * 문서를 바꾸거나 탭을 닫으면 "close"를 보내 상대 탭의 경고를 푼다.
 * BroadcastChannel이 없는 브라우저에서는 항상 false(기능만 조용히 꺼진다).
 */
export function useTabGuard(documentId: string | null): boolean {
  const [conflict, setConflict] = useState(false);
  const tabIdRef = useRef<string | null>(null);
  if (tabIdRef.current === null) tabIdRef.current = newTabId();

  useEffect(() => {
    setConflict(false);
    if (!documentId || typeof BroadcastChannel === "undefined") return;

    const tabId = tabIdRef.current!;
    const me = { tabId, documentId };
    const channel = new BroadcastChannel(TAB_CHANNEL);
    const send = (msg: TabMessage) => channel.postMessage(msg);

    channel.onmessage = (e: MessageEvent<TabMessage>) => {
      const msg = e.data;
      if (shouldAnswerBusy(msg, me)) send({ type: "busy", tabId, documentId });
      if (conflictsWithMine(msg, me)) setConflict(true);
      else if (clearsConflict(msg, me)) setConflict(false);
    };

    send({ type: "open", tabId, documentId });
    const close = () => send({ type: "close", tabId, documentId });
    window.addEventListener("pagehide", close);

    return () => {
      window.removeEventListener("pagehide", close);
      close();
      channel.close();
    };
  }, [documentId]);

  return conflict;
}
