"use client";

import { useState } from "react";
import { Modal, cn } from "@shared/ui";
import { readerStats, toParagraphs } from "../lib/readerText";

export interface ReaderPreviewProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** ProseMirror JSON(현재 편집 중인 문서의 content). */
  content: unknown;
}

type FontSize = "sm" | "md" | "lg";

const BODY_SIZE: Record<FontSize, string> = {
  sm: "text-body-sm leading-[1.9]",
  md: "text-body leading-[1.9]",
  lg: "text-body-lg leading-[2]",
};

const SIZE_LABEL: Record<FontSize, string> = { sm: "작게", md: "보통", lg: "크게" };

/**
 * 독자 뷰 — 연재본처럼 좁은 단, 넓은 행간, 큰 글자로 현재 회차를 보여준다.
 * 편집 UI를 전부 걷어내는 게 목적이라 툴바·커서·바인더가 없다.
 */
export function ReaderPreview({ open, onClose, title, content }: ReaderPreviewProps) {
  const [size, setSize] = useState<FontSize>("md");
  const paragraphs = toParagraphs(content);
  const stats = readerStats(content);

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-[720px]"
      title={title}
      description={
        stats.paragraphs
          ? `${stats.charsWithSpaces.toLocaleString("ko-KR")}자 · 읽는 데 약 ${stats.minutes}분 · 대사 비율 ${stats.dialogueRatio}%`
          : "아직 내용이 없어요."
      }
      footer={
        <div className="flex w-full items-center justify-between">
          <div role="group" aria-label="글자 크기" className="flex gap-4">
            {(["sm", "md", "lg"] as FontSize[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                onClick={() => setSize(s)}
                className={cn(
                  "rounded-md px-8 py-4 text-caption",
                  size === s ? "bg-surface text-fg" : "text-fg-weak hover:text-fg",
                )}
              >
                {SIZE_LABEL[s]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-12 py-6 text-body-sm text-fg-weak hover:text-fg"
          >
            닫기
          </button>
        </div>
      }
    >
      <article
        aria-label="독자 뷰 본문"
        className={cn(
          "mx-auto max-h-[60vh] w-full max-w-[560px] overflow-y-auto",
          BODY_SIZE[size],
        )}
      >
        {paragraphs.length === 0 ? (
          <p className="text-fg-weak">본문을 쓰면 독자가 보게 될 모습으로 보여드려요.</p>
        ) : (
          paragraphs.map((p, i) => (
            <p key={i} className="mb-16 text-fg">
              {p}
            </p>
          ))
        )}
      </article>
    </Modal>
  );
}
