// 탭 간 메시지 계약(BroadcastChannel) — 순수 타입·판정 함수. 브라우저 API 비종속.
// 목적: 같은 문서를 두 탭에서 동시에 편집해 자동저장이 서로 덮어쓰는 사고를 미리 알린다.

export const TAB_CHANNEL = "builbook:tabs";

export type TabMessage =
  | { type: "open"; tabId: string; documentId: string } // 이 탭이 문서를 열었다
  | { type: "busy"; tabId: string; documentId: string } // 나도 그 문서를 열고 있다 (open에 대한 응답)
  | { type: "close"; tabId: string; documentId: string }; // 이 탭이 문서를 닫았다(전환·종료)

/** 받은 메시지가 "내가 연 문서를 다른 탭도 쓰고 있다"는 뜻인지. */
export function conflictsWithMine(
  msg: TabMessage,
  me: { tabId: string; documentId: string | null },
): boolean {
  if (!me.documentId || msg.tabId === me.tabId) return false;
  if (msg.type === "close") return false;
  return msg.documentId === me.documentId;
}

/** 받은 메시지에 "나도 그 문서를 열고 있다"고 답해야 하는지(open에만 답한다). */
export function shouldAnswerBusy(
  msg: TabMessage,
  me: { tabId: string; documentId: string | null },
): boolean {
  return msg.type === "open" && conflictsWithMine(msg, me);
}

/** 다른 탭이 문서를 닫았다는 메시지가 현재 경고를 해제해야 하는지. */
export function clearsConflict(
  msg: TabMessage,
  me: { tabId: string; documentId: string | null },
): boolean {
  return (
    msg.type === "close" && msg.tabId !== me.tabId && msg.documentId === me.documentId
  );
}
