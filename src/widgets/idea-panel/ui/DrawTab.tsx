"use client";

import { useMemo, useState } from "react";
import { Button, cn } from "@shared/ui";
import type { DocumentNode } from "@entities/document";
import {
  DRAW_COUNT,
  EVENT_TYPES,
  GENRES,
  QUESTION_CARDS,
  buildCombo,
  canCombine,
  deckFor,
  drawCards,
  genreLabel,
  isGenre,
  type Combo,
  type Genre,
  type IdeaCard,
} from "@features/idea-cards";
import type { IdeaKind } from "@entities/idea";
import { characterDocs, settingDocs } from "../lib/sources";

interface DrawTabProps {
  genre: string | undefined;
  onSaveGenre: (genre: Genre) => void | Promise<void>;
  documents: readonly DocumentNode[];
  onSave: (kind: IdeaKind, text: string, source: string) => void;
}

const rng = () => Math.random();

/** 뽑기 탭 — 상황 카드 3장 · 질문 카드 · 조합기. 전부 오프라인, 설정 없이 바로. */
export function DrawTab({ genre, onSaveGenre, documents, onSave }: DrawTabProps) {
  const g: Genre | null = isGenre(genre) ? genre : null;
  const [cards, setCards] = useState<IdeaCard[]>([]);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState<string>(() => QUESTION_CARDS[0]);
  const [combo, setCombo] = useState<Combo | null>(null);

  const source = useMemo(
    () => ({
      characters: characterDocs(documents).map((d) => d.title),
      settings: settingDocs(documents).map((d) => d.title),
      events: EVENT_TYPES,
    }),
    [documents],
  );

  // 장르가 정해졌는데 아직 뽑은 적이 없으면 첫 3장을 바로 보여 준다(빈 화면 금지).
  // 첫 뽑기는 덱이 바뀔 때만 다시 계산한다 — 렌더마다 카드가 바뀌면 안 된다.
  const deck = g ? deckFor(g) : null;
  const initial = useMemo(() => (deck ? drawCards(deck, [], new Set(), rng) : []), [deck]);
  const shown = cards.length ? cards : initial;

  function redraw() {
    if (!deck) return;
    setCards(drawCards(deck, shown, locked, rng, DRAW_COUNT));
  }
  function toggleLock(id: string) {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function nextQuestion() {
    const others = QUESTION_CARDS.filter((q) => q !== question);
    setQuestion(others[Math.floor(Math.random() * others.length)] ?? question);
  }

  return (
    <div className="flex flex-col gap-16">
      {/* 장르 */}
      <section className="flex flex-col gap-8">
        <div className="flex items-baseline justify-between">
          <h3 className="text-body-sm font-medium text-fg">상황 카드</h3>
          {g && (
            <span className="text-caption text-fg-weak">{genreLabel(g)} 덱 · 60장</span>
          )}
        </div>
        {!g && (
          <p className="text-caption text-fg-weak">이 작품의 장르를 고르면 카드 3장이 바로 나와요.</p>
        )}
        <div role="group" aria-label="장르" className="flex flex-wrap gap-4">
          {GENRES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={g === item.value}
              onClick={() => {
                setCards([]);
                setLocked(new Set());
                void onSaveGenre(item.value);
              }}
              className={cn(
                "rounded-full border px-10 py-4 text-caption",
                g === item.value
                  ? "border-primary bg-primary-weak text-primary"
                  : "border-border text-fg-weak hover:border-border-strong hover:text-fg",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {g && (
          <>
            <ul aria-label="뽑은 카드" className="flex flex-col gap-8">
              {shown.map((card) => {
                const isLocked = locked.has(card.id);
                return (
                  <li
                    key={card.id}
                    className={cn(
                      "rounded-lg border bg-bg p-12",
                      isLocked ? "border-primary" : "border-border",
                    )}
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <span className="rounded-sm bg-surface px-6 py-2 text-caption text-fg-weak">
                        {card.tag}
                      </span>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          aria-pressed={isLocked}
                          onClick={() => toggleLock(card.id)}
                          className={cn(
                            "rounded-md px-6 py-2 text-caption",
                            isLocked ? "text-primary" : "text-fg-weak hover:text-fg",
                          )}
                        >
                          {isLocked ? "고정됨" : "고정"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSave("card", card.text, `${genreLabel(g)} · ${card.tag}`)}
                          className="rounded-md px-6 py-2 text-caption text-fg-weak hover:text-fg"
                        >
                          메모로 저장
                        </button>
                      </div>
                    </div>
                    <p className="text-body-sm text-fg">{card.text}</p>
                  </li>
                );
              })}
            </ul>
            <Button variant="secondary" size="sm" className="w-full" onClick={redraw}>
              다시 뽑기{locked.size ? ` (${locked.size}장 고정)` : ""}
            </Button>
          </>
        )}
      </section>

      {/* 질문 카드 */}
      <section className="flex flex-col gap-8">
        <h3 className="text-body-sm font-medium text-fg">질문 카드</h3>
        <blockquote className="rounded-lg border border-border bg-bg p-12 text-body-sm text-fg">
          {question}
        </blockquote>
        <div className="flex gap-4">
          <Button variant="secondary" size="sm" className="flex-1" onClick={nextQuestion}>
            다른 질문
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSave("note", question, "질문 카드")}
          >
            메모로 저장
          </Button>
        </div>
      </section>

      {/* 조합기 */}
      <section className="flex flex-col gap-8">
        <h3 className="text-body-sm font-medium text-fg">조합기</h3>
        {canCombine(source) ? (
          <>
            <p className="rounded-lg border border-border bg-bg p-12 text-body-sm text-fg">
              {combo?.text ?? "인물 × 설정 × 사건을 무작위로 섞어요."}
            </p>
            <div className="flex gap-4">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setCombo(buildCombo(source, rng))}
              >
                {combo ? "다시 섞기" : "섞기"}
              </Button>
              {combo && (
                <Button variant="ghost" size="sm" onClick={() => onSave("combo", combo.text, "조합기")}>
                  메모로 저장
                </Button>
              )}
            </div>
            <p className="text-caption text-fg-weak">
              인물 {source.characters.length}명 · 설정 {source.settings.length}개 · 사건 유형{" "}
              {source.events.length}개
            </p>
          </>
        ) : (
          <p className="text-caption text-fg-weak">
            바인더의 <b className="text-fg">카드 템플릿</b>으로 인물 카드를 만들면 조합기가 켜져요.
          </p>
        )}
      </section>
    </div>
  );
}
