"use client";

import { useMemo, useState } from "react";
import { Input } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import { searchDocuments } from "../lib/searchDocuments";

interface SearchPanelProps {
  // 정상 문서 목록(휴지통 제외된 useDocuments.documents를 그대로 전달).
  documents: DocumentNode[];
  // 결과 클릭 시 해당 문서 선택.
  onSelect: (id: string) => void;
}

export function SearchPanel({ documents, onSelect }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => searchDocuments(documents, query),
    [documents, query],
  );
  const trimmed = query.trim();

  return (
    <div className="flex h-full flex-col">
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

      <div className="mt-12 flex-1 overflow-y-auto">
        {!trimmed && (
          <p className="px-4 py-16 text-body-sm text-fg-weak">
            찾을 단어를 입력하세요.
            <br />
            제목과 본문을 모두 검색해요.
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
                  onClick={() => onSelect(m.doc.id)}
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
    </div>
  );
}
