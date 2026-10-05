"use client";

import { useMemo, useState } from "react";
import { Button, ConfirmModal, Input } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import { searchDocuments } from "../lib/searchDocuments";
import { planProjectReplace } from "../lib/replaceAcross";

interface SearchPanelProps {
  // 정상 문서 목록(휴지통 제외된 useDocuments.documents를 그대로 전달).
  documents: DocumentNode[];
  // 결과 클릭 — 그 문서를 열고 본문에서 검색어 위치를 보여 준다(찾기 바에 검색어를 넣어서).
  onSelect: (id: string, query: string) => void;
  // 작품 전체 바꾸기 — 열린 에디터 저장·스냅샷·다시 불러오기까지 호출하는 쪽이 맡는다.
  onReplaceAll?: (query: string, replacement: string) => Promise<void>;
}

export function SearchPanel({ documents, onSelect, onReplaceAll }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const results = useMemo(
    () => searchDocuments(documents, query),
    [documents, query],
  );
  const plan = useMemo(() => planProjectReplace(documents, query), [documents, query]);
  const total = plan.reduce((sum, p) => sum + p.count, 0);
  const trimmed = query.trim();

  return (
    <section aria-label="작품 검색" className="flex h-full flex-col">
      <div className="mb-12 flex items-center justify-between">
        <span className="text-caption font-medium text-fg-weak">검색</span>
      </div>

      <Input
        autoFocus
        placeholder="제목·본문에서 찾기"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="문서 검색"
      />

      {/* 작품 전체 바꾸기 — 본문에서만. 바꾸기 전 문서마다 스냅샷을 남긴다. */}
      {onReplaceAll && (
        <div className="mt-8 flex items-center gap-6">
          <Input
            placeholder="바꿀 말 (작품 전체 본문)"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            aria-label="작품 전체에서 바꿀 말"
            className="min-w-0 flex-1"
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || plan.length === 0}
            onClick={() => setConfirmOpen(true)}
            className="shrink-0"
          >
            전체 바꾸기
          </Button>
        </div>
      )}

      <div className="mt-12 flex-1 overflow-y-auto">
        {!trimmed && (
          <p className="px-4 py-16 text-body-sm text-fg-weak">
            찾을 단어를 입력하세요.
            <br />
            제목과 본문을 모두 검색해요. 결과를 누르면 본문의 그 위치를 보여 줘요.
          </p>
        )}

        {trimmed && results.length === 0 && (
          <p className="px-4 py-16 text-body-sm text-fg-weak">
            <b className="text-fg">&lsquo;{trimmed}&rsquo;</b> 검색 결과가 없어요.
          </p>
        )}

        {results.length > 0 && (
          <ul aria-label="검색 결과" className="flex flex-col gap-2">
            {results.map((m) => (
              <li key={m.doc.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m.doc.id, trimmed)}
                  className="w-full rounded-md px-8 py-8 text-left hover:bg-surface"
                >
                  <span className="block truncate text-body-sm font-medium text-fg">
                    {m.doc.title}
                  </span>
                  <span className="mt-2 block truncate text-caption text-fg-weak">
                    {m.field === "title" ? "제목 일치" : m.snippet}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (!onReplaceAll || busy) return;
          setBusy(true);
          try {
            await onReplaceAll(trimmed, replacement);
          } finally {
            setBusy(false);
          }
        }}
        title={`'${trimmed}' → '${replacement}' 전체 바꾸기`}
        description={`문서 ${plan.length}개, ${total}곳을 바꿉니다(본문만). 바꾸기 전에 문서마다 스냅샷을 남겨요 — 인스펙터 › 스냅샷에서 되돌릴 수 있어요.`}
        confirmText="전체 바꾸기"
      />
    </section>
  );
}
