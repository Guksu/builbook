"use client";

import { Textarea } from "@shared/ui";
import type { DocumentNode } from "@entities/document";

interface InspectorProps {
  doc: DocumentNode | null;
  onSaveSynopsis: (id: string, synopsis: string) => void;
}

// 인스펙터: 단어 수 + 편집 가능한 시놉시스(blur 시 변경분만 저장).
export function Inspector({ doc, onSaveSynopsis }: InspectorProps) {
  if (!doc) {
    return <p className="text-body-sm text-fg-weak">문서를 선택하세요.</p>;
  }
  return (
    <div className="flex flex-col gap-16 text-body-sm">
      <div>
        <span className="text-fg-weak">단어 수</span>
        <p className="text-fg">{doc.wordCount}</p>
      </div>
      <div>
        <label htmlFor="synopsis" className="mb-6 block text-fg-weak">
          시놉시스
        </label>
        {/* key=doc.id 로 문서 전환 시 입력값 리셋. blur 시 변경분만 저장. */}
        <Textarea
          id="synopsis"
          key={doc.id}
          rows={6}
          defaultValue={doc.synopsis ?? ""}
          placeholder="이 문서의 줄거리·메모를 남겨보세요."
          onBlur={(e) => {
            const next = e.target.value;
            if (next !== (doc.synopsis ?? "")) onSaveSynopsis(doc.id, next);
          }}
        />
      </div>
    </div>
  );
}
