"use client";

import { useMemo } from "react";
import {
  collectDescendantDocs,
  sumDocCounts,
  type DocumentNode,
} from "@entities/document";
import { useCountUnit } from "@features/count-unit";
import { formatCount } from "@shared/lib";
import { ScriveningSection } from "./ScriveningSection";

export interface ScriveningsProps {
  /** 선택된 폴더(= 이어 볼 묶음) */
  folder: DocumentNode;
  /** 작품의 정상 문서 전체 — 여기서 폴더의 자손 본문만 골라 쓴다 */
  documents: DocumentNode[];
  projectId: string;
  /** 한 회차만 단일 에디터로 열기 */
  onOpenDocument: (id: string) => void;
}

/**
 * 스크리브닝(연속 보기) — 스크리브너의 Scrivenings.
 * 폴더를 고르면 그 아래 회차들이 한 장의 원고처럼 이어 보이고, 그 자리에서 고칠 수 있다.
 * 회차를 오가며 흐름을 확인하는 일이 웹소설에서는 잦은데, 매번 트리를 클릭해 돌아다니면
 * 문맥이 끊긴다 — "이어 읽기"가 곧 "이어 고치기"가 되도록 각 구획을 편집 가능하게 둔다.
 */
export function Scrivenings({
  folder,
  documents,
  projectId,
  onOpenDocument,
}: ScriveningsProps) {
  const [unit] = useCountUnit();
  const docs = useMemo(
    () => collectDescendantDocs(documents, folder.id),
    [documents, folder.id],
  );
  // 합계는 저장된 수치 기준 — 자동저장이 끝나면 목록 캐시가 갱신되며 따라 올라간다.
  const total = useMemo(() => sumDocCounts(docs, unit), [docs, unit]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[720px] flex-col px-24 py-16 max-sm:px-16">
      <header className="mb-16 border-b border-border pb-12">
        <h1 className="text-h3 text-fg">{folder.title}</h1>
        <p className="mt-4 text-caption text-fg-weak" aria-label="연속 보기 요약">
          {docs.length === 0
            ? "이어 볼 문서 없음"
            : `문서 ${docs.length}개 · ${formatCount(total, unit)}`}
        </p>
      </header>

      {docs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center text-fg-weak">
          <p className="text-body">이 폴더에는 아직 문서가 없어요.</p>
          <p className="text-body-sm">
            폴더를 고른 채 <b className="text-fg">새 문서</b>를 누르면 이 안에 만들어져요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {docs.map((doc, i) => (
            <div key={doc.id}>
              {/* 구획 사이 얇은 구분선 — 회차 경계만 알리고 시선은 붙잡지 않는다 */}
              {i > 0 && <div className="my-24 h-px bg-border" aria-hidden />}
              <ScriveningSection
                doc={doc}
                projectId={projectId}
                onOpen={onOpenDocument}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
