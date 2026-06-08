"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Textarea } from "@shared/ui";
import { MODEL_LABEL, MODEL_APPROX_MB } from "@shared/ai";
import type { UseAiChat } from "@features/ai-chat";

interface AiAssistantProps {
  ai: UseAiChat;
}

// 작업실 우측 AI 문답 패널. useAiChat의 공개 API만 소비한다(엔진 내부 비접근).
export function AiAssistant({ ai }: AiAssistantProps) {
  const { status, percent, messages, streaming, error, enable, send, stop, retry } = ai;
  const [draft, setDraft] = useState("");

  // 자동 스크롤 — 사용자가 위로 스크롤하면 추종 중단.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, status]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || status !== "ready") return;
    send(text);
    setDraft("");
    stickRef.current = true;
  }

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-12 shrink-0 text-caption font-medium text-fg-weak">AI 문답</h2>

      {/* idle — 기능 사용 게이팅 */}
      {status === "idle" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-12 text-center">
          <p className="text-body text-fg">집필을 돕는 AI에게 물어보세요.</p>
          <p className="text-body-sm text-fg-weak">
            처음 한 번 <b className="text-fg">{MODEL_LABEL}</b> 모델(약{" "}
            {MODEL_APPROX_MB >= 1000
              ? `${(MODEL_APPROX_MB / 1000).toFixed(1)}GB`
              : `${MODEL_APPROX_MB}MB`}
            )을 브라우저에 내려받아요. 이후엔 인터넷 없이도, 내 글이 서버로 가지 않고 기기 안에서만
            동작합니다.
          </p>
          <Button onClick={enable}>기능 사용</Button>
        </div>
      )}

      {/* downloading — 진행률 */}
      {status === "downloading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-12 px-8 text-center">
          <p className="text-body text-fg">
            {percent > 0 ? `모델 다운로드 중… ${percent}%` : "준비 중…"}
          </p>
          <div className="h-8 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${Math.max(4, percent)}%` }}
            />
          </div>
          <p className="text-caption text-fg-weak">처음 한 번만 받으면 다음부턴 빨라요.</p>
        </div>
      )}

      {/* error — 복구 */}
      {status === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-12 px-8 text-center">
          <p className="text-body-sm text-error">{error ?? "AI 기능을 시작하지 못했어요."}</p>
          <p className="text-caption text-fg-weak">
            이 브라우저가 온디바이스 AI를 지원하지 않거나 메모리가 부족할 수 있어요.
          </p>
          <Button variant="secondary" onClick={retry}>
            다시 시도
          </Button>
        </div>
      )}

      {/* ready / generating — 채팅 */}
      {(status === "ready" || status === "generating") && (
        <>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex min-h-0 flex-1 flex-col gap-12 overflow-y-auto pr-4"
          >
            {messages.length === 0 && !streaming && (
              <p className="mt-8 text-body-sm text-fg-weak">
                예: “주인공의 첫 등장 장면을 묘사해줘”, “이 문단을 더 긴장감 있게 고쳐줘”.
              </p>
            )}
            {messages.map((m) => (
              <Bubble key={m.id} role={m.role} partial={m.partial}>
                {m.content}
              </Bubble>
            ))}
            {status === "generating" && (
              <Bubble role="assistant">
                {streaming || <span className="text-fg-weak">생각 중…</span>}
              </Bubble>
            )}
            {error && status === "ready" && (
              <p className="text-caption text-error">{error}</p>
            )}
          </div>

          {/* composer */}
          <div className="mt-12 shrink-0">
            <Textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                status === "generating" ? "응답을 생성하는 중…" : "무엇이든 물어보세요 (Enter 전송)"
              }
              disabled={status === "generating"}
            />
            <div className="mt-8 flex justify-end">
              {status === "generating" ? (
                <Button variant="secondary" size="sm" onClick={stop}>
                  중단
                </Button>
              ) : (
                <Button size="sm" onClick={handleSend} disabled={!draft.trim()}>
                  보내기
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Bubble({
  role,
  partial,
  children,
}: {
  role: "user" | "assistant";
  partial?: boolean;
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[90%] whitespace-pre-wrap rounded-md px-12 py-8 text-body-sm " +
          (isUser ? "bg-primary text-primary-fg" : "bg-surface text-fg")
        }
      >
        {children}
        {partial && (
          <span className="ml-4 align-middle text-caption text-fg-weak">(중단됨)</span>
        )}
      </div>
    </div>
  );
}
