"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Textarea, cn } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import type { AiModelChoice } from "@entities/project";
import type { IdeaKind } from "@entities/idea";
import { extractPlainText } from "@shared/lib";
import {
  AI_MODELS,
  DEFAULT_MODEL,
  estimateCostUsd,
  formatUsd,
  looksLikeApiKey,
  maskApiKey,
  roughTokens,
  setApiKey,
  hasPersistedKey,
} from "@shared/ai-client";
import { useSelectionText } from "@features/editor-selection";
import { AI_TASKS, buildContext, findTask, useIdeaAi, type AiTaskKey } from "@features/idea-ai";
import { characterDocs, settingDocs } from "../lib/sources";

interface AiTabProps {
  projectTitle: string;
  aiModel: AiModelChoice | undefined;
  onSaveAiModel: (model: AiModelChoice) => void | Promise<void>;
  documents: readonly DocumentNode[];
  selectedDoc: DocumentNode | null;
  onSave: (kind: IdeaKind, text: string, source: string) => void;
}

function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** AI 탭 — 작가 본인의 키로, 보여 준 범위만, 동의한 뒤에 보낸다. 결과는 메모로만 남긴다. */
export function AiTab({ projectTitle, aiModel, onSaveAiModel, documents, selectedDoc, onSave }: AiTabProps) {
  const model = aiModel ?? DEFAULT_MODEL;
  const ai = useIdeaAi(model);
  const { state, apiKey } = ai;
  const online = useOnline();
  const selectionText = useSelectionText();

  const characters = useMemo(() => characterDocs(documents), [documents]);
  const settings = useMemo(() => settingDocs(documents), [documents]);
  const ctx = useMemo(
    () =>
      buildContext({
        projectTitle,
        doc: selectedDoc,
        selectionText,
        characterDocs: characters,
        settingDocs: settings,
      }),
    [projectTitle, selectedDoc, selectionText, characters, settings],
  );

  // 인물 심문 입력
  const [askOpen, setAskOpen] = useState(false);
  const [askCharacterId, setAskCharacterId] = useState<string>("");
  const [askQuestion, setAskQuestion] = useState("");

  function run(task: AiTaskKey) {
    if (task === "interrogate") {
      setAskOpen(true);
      return;
    }
    ai.prepare(task, ctx);
  }
  function runInterrogate() {
    const c = characters.find((d) => d.id === askCharacterId) ?? characters[0];
    if (!c || !askQuestion.trim()) return;
    ai.prepare("interrogate", ctx, {
      characterName: c.title,
      characterCard: extractPlainText(c.content).slice(0, 1000),
      question: askQuestion.trim(),
    });
    setAskOpen(false);
  }

  const busy = state.status === "streaming";

  return (
    <div className="flex flex-col gap-16">
      {/* 모델 */}
      <section className="flex items-center justify-between gap-8">
        <label htmlFor="ai-model" className="text-caption text-fg-weak">
          모델
        </label>
        <select
          id="ai-model"
          value={model}
          disabled={busy}
          onChange={(e) => void onSaveAiModel(e.target.value as AiModelChoice)}
          className="h-32 rounded-md border border-border bg-bg px-8 text-caption text-fg"
        >
          {Object.values(AI_MODELS).map((m) => (
            <option key={m.choice} value={m.choice}>
              {m.label} — {m.note}
            </option>
          ))}
        </select>
      </section>

      {!apiKey ? (
        <KeyForm error={state.error?.message ?? null} />
      ) : (
        <>
          <section className="flex items-center justify-between text-caption text-fg-weak">
            <span>
              키 <code className="text-fg">{maskApiKey(apiKey)}</code>
              {hasPersistedKey() ? " · 이 브라우저에 저장됨" : " · 이번 탭에서만"}
            </span>
            <button type="button" className="hover:text-fg" onClick={ai.forgetKey}>
              키 지우기
            </button>
          </section>

          {!online && (
            <p className="rounded-md bg-warning-weak p-8 text-caption text-fg">
              인터넷 연결이 필요해요. 뽑기 탭은 오프라인에서도 돼요.
            </p>
          )}

          {/* 무엇을 보낼지 */}
          <section className="text-caption text-fg-weak">
            {ctx.bodySource === "selection" && (
              <span>
                선택한 문단 <b className="text-fg">{ctx.body.length.toLocaleString()}자</b>를 보내요.
              </span>
            )}
            {ctx.bodySource === "document" && (
              <span>
                현재 회차 본문 <b className="text-fg">{ctx.body.length.toLocaleString()}자</b>를 보내요.
                문단을 드래그해 선택하면 그 부분만 보내요.
              </span>
            )}
            {ctx.bodySource === "none" && <span>본문 문서를 열거나 문단을 선택하면 그 내용을 함께 보내요.</span>}
            {ctx.bodyTruncated && <span> (긴 본문은 끝 8,000자만)</span>}
          </section>

          {(state.status === "ready" || state.status === "done" || state.status === "error") && (
            <section className="grid grid-cols-2 gap-6" aria-label="AI 작업">
              {AI_TASKS.map((t) => {
                const disabled = !online || (t.needsSelection && ctx.bodySource !== "selection") ||
                  (t.needsCharacter && characters.length === 0);
                return (
                  <button
                    key={t.key}
                    type="button"
                    disabled={disabled}
                    title={
                      t.needsSelection && ctx.bodySource !== "selection"
                        ? "본문에서 문단을 선택하면 쓸 수 있어요"
                        : t.needsCharacter && characters.length === 0
                          ? "인물 카드가 있어야 해요"
                          : t.description
                    }
                    onClick={() => run(t.key)}
                    className={cn(
                      "rounded-lg border border-border bg-bg p-10 text-left",
                      "hover:border-border-strong disabled:opacity-40 disabled:pointer-events-none",
                    )}
                  >
                    <span className="block text-body-sm font-medium text-fg">{t.label}</span>
                    <span className="mt-2 block text-caption text-fg-weak">{t.description}</span>
                  </button>
                );
              })}
            </section>
          )}

          {askOpen && (
            <section className="flex flex-col gap-8 rounded-lg border border-border bg-bg p-12" aria-label="인물 심문">
              <label className="text-caption text-fg-weak" htmlFor="ask-character">
                누구에게
              </label>
              <select
                id="ask-character"
                value={askCharacterId || characters[0]?.id || ""}
                onChange={(e) => setAskCharacterId(e.target.value)}
                className="h-32 rounded-md border border-border bg-bg px-8 text-caption text-fg"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <Textarea
                rows={2}
                aria-label="질문"
                placeholder="예: 왜 그날 밤 돌아왔나?"
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
              />
              <div className="flex justify-end gap-4">
                <Button variant="ghost" size="sm" onClick={() => setAskOpen(false)}>
                  취소
                </Button>
                <Button size="sm" onClick={runInterrogate} disabled={!askQuestion.trim()}>
                  물어보기
                </Button>
              </div>
            </section>
          )}

          {state.status === "confirm" && state.pending && (
            <ConfirmPreview
              taskLabel={findTask(state.pending.task).label}
              message={state.pending.message}
              inputTokens={state.pending.inputTokens}
              model={model}
              onSend={ai.send}
              onCancel={ai.cancelConfirm}
            />
          )}

          {(state.status === "streaming" || state.status === "done" || state.status === "error") &&
            (state.output || state.status !== "error" || state.error) && (
              <section className="flex flex-col gap-8" aria-live="polite" aria-label="AI 결과">
                <div className="flex items-center justify-between text-caption text-fg-weak">
                  <span>
                    {state.outputTask ? findTask(state.outputTask).label : "결과"}
                    {state.status === "streaming" && " · 생각 중…"}
                    {state.partial && " · 중간에 멈춤"}
                  </span>
                  {state.status === "streaming" && (
                    <button type="button" className="hover:text-fg" onClick={ai.abort}>
                      중단
                    </button>
                  )}
                </div>
                {state.refused && !state.output && (
                  <p className="text-body-sm text-fg-weak">이 요청은 처리되지 않았어요. 다른 방식으로 물어봐 주세요.</p>
                )}
                {state.error && (
                  <p role="alert" className="rounded-md bg-error-weak p-8 text-caption text-fg">
                    {state.error.message}
                  </p>
                )}
                {state.output && (
                  <pre className="whitespace-pre-wrap rounded-lg border border-border bg-bg p-12 font-sans text-body-sm text-fg">
                    {state.output}
                  </pre>
                )}
                {state.status !== "streaming" && (
                  <div className="flex gap-4">
                    {state.output && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          onSave("ai", state.output, state.outputTask ? findTask(state.outputTask).label : "AI")
                        }
                      >
                        메모로 저장
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={ai.reset}>
                      {state.output ? "버리기" : "닫기"}
                    </Button>
                  </div>
                )}
              </section>
            )}
        </>
      )}
    </div>
  );
}

function KeyForm({ error }: { error: string | null }) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [persist, setPersist] = useState(false);
  const valid = looksLikeApiKey(value);
  return (
    <section className="flex flex-col gap-8" aria-label="API 키 입력">
      <p className="text-body-sm text-fg">내 Anthropic API 키로 동작해요.</p>
      <ul className="list-disc pl-16 text-caption text-fg-weak">
        <li>원고는 요청할 때만, 미리 보여 준 범위만 전송돼요.</li>
        <li>키는 이 브라우저 밖으로 나가지 않아요(서버 없음). 백업 파일에도 안 들어가요.</li>
        <li>비용은 내 Anthropic 계정에 청구돼요(요청당 수 센트).</li>
      </ul>
      {error && (
        <p role="alert" className="rounded-md bg-error-weak p-8 text-caption text-fg">
          {error}
        </p>
      )}
      <div className="flex gap-4">
        <Input
          type={show ? "text" : "password"}
          aria-label="API 키"
          placeholder="sk-ant-…"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          invalid={value.length > 0 && !valid}
        />
        <Button variant="secondary" size="md" onClick={() => setShow((v) => !v)} aria-pressed={show}>
          {show ? "숨김" : "보기"}
        </Button>
      </div>
      <label className="flex items-center gap-6 text-caption text-fg-weak">
        <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
        이 브라우저에 저장 (공용 PC라면 끄세요)
      </label>
      <Button disabled={!valid} onClick={() => setApiKey(value, persist)}>
        키 사용
      </Button>
      <p className="text-caption text-fg-weak">
        키는{" "}
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-fg"
        >
          Anthropic 콘솔
        </a>
        에서 만들 수 있어요.
      </p>
    </section>
  );
}

function ConfirmPreview({
  taskLabel,
  message,
  inputTokens,
  model,
  onSend,
  onCancel,
}: {
  taskLabel: string;
  message: string;
  inputTokens: number | null;
  model: AiModelChoice;
  onSend: () => void;
  onCancel: () => void;
}) {
  const tokens = inputTokens ?? roughTokens(message.length);
  const cost = estimateCostUsd(tokens, model);
  return (
    <section className="flex flex-col gap-8 rounded-lg border border-primary bg-bg p-12" aria-label="보낼 내용 확인">
      <p className="text-body-sm font-medium text-fg">{taskLabel} — 이 내용을 보낼까요?</p>
      <pre className="max-h-[200px] overflow-y-auto whitespace-pre-wrap rounded-md bg-surface p-8 font-sans text-caption text-fg-weak">
        {message}
      </pre>
      <p className="text-caption text-fg-weak">
        {message.length.toLocaleString()}자 · {inputTokens === null ? "약 " : ""}
        {tokens.toLocaleString()} 토큰 · 예상 {formatUsd(cost)} ({AI_MODELS[model].label})
      </p>
      <div className="flex gap-4">
        <Button size="sm" className="flex-1" onClick={onSend}>
          보내기
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          취소
        </Button>
      </div>
    </section>
  );
}
