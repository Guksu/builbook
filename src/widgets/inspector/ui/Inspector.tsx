"use client";

import { Textarea } from "@shared/ui";
import { GoalMeter } from "@features/writing-goals";
import type { DocumentNode } from "@entities/document";

interface InspectorProps {
  doc: DocumentNode | null;
  onSaveSynopsis: (id: string, synopsis: string) => void;
  // 문서 목표 카운터
  currentWords: number;
  onSaveDocGoal: (id: string, goal: number | null) => void;
  // 작품 전체 목표 카운터
  projectTotalWords: number;
  projectGoal: number | null | undefined;
  onSaveProjectGoal: (goal: number | null) => void;
}

// 인스펙터: 목표 카운터(문서·작품) + 편집 가능한 시놉시스(blur 시 변경분만 저장).
export function Inspector({
  doc,
  onSaveSynopsis,
  currentWords,
  onSaveDocGoal,
  projectTotalWords,
  projectGoal,
  onSaveProjectGoal,
}: InspectorProps) {
  return (
    <div className="flex flex-col gap-16 text-body-sm">
      {/* 작품 전체 목표 — 문서 선택과 무관하게 항상 표시 */}
      <GoalMeter
        id="project-goal"
        label="작품 전체"
        inputLabel="작품 목표 단어 수"
        current={projectTotalWords}
        goal={projectGoal}
        onSave={onSaveProjectGoal}
      />

      {doc ? (
        <>
          <div className="h-px bg-border" />
          {/* key=doc.id 로 문서 전환 시 목표 입력값 리셋 */}
          <GoalMeter
            key={doc.id}
            id="doc-goal"
            label="이 문서"
            inputLabel="문서 목표 단어 수"
            current={currentWords}
            goal={doc.goal}
            onSave={(g) => onSaveDocGoal(doc.id, g)}
          />
          <div>
            <label htmlFor="synopsis" className="mb-6 block text-fg-weak">
              시놉시스
            </label>
            {/* key=doc.id 로 문서 전환 시 입력값 리셋. blur 시 변경분만 저장. */}
            <Textarea
              id="synopsis"
              key={`synopsis-${doc.id}`}
              rows={6}
              defaultValue={doc.synopsis ?? ""}
              placeholder="이 문서의 줄거리·메모를 남겨보세요."
              onBlur={(e) => {
                const next = e.target.value;
                if (next !== (doc.synopsis ?? "")) onSaveSynopsis(doc.id, next);
              }}
            />
          </div>
        </>
      ) : (
        <p className="text-fg-weak">문서를 선택하면 목표·시놉시스를 편집할 수 있어요.</p>
      )}
    </div>
  );
}
