"use client";

import { cn } from "@shared/ui";
import { changeAt, relationTypeColor, type Relation } from "@entities/relation";
import { DOT_BG_CLASS } from "../lib/colors";

export interface RelationTableProps {
  relations: readonly Relation[];
  nameOf: (id: string) => string;
  episodeTitleOf: (id: string) => string | null;
  orderOf: ReadonlyMap<string, number>;
  typeColors?: Readonly<Record<string, string>> | null;
  onEdit: (relation: Relation) => void;
}

/** 관계 목록(표) — 다이어그램이 복잡할 때 한눈에 훑는 용도. 줄을 누르면 고친다. */
export function RelationTable({ relations, nameOf, episodeTitleOf, orderOf, typeColors, onEdit }: RelationTableProps) {
  const rows = [...relations].sort((a, b) => nameOf(a.fromId).localeCompare(nameOf(b.fromId), "ko"));
  if (rows.length === 0) {
    return <p className="p-24 text-body-sm text-fg-weak">아직 관계가 없어요. 도표에서 인물을 이어 보세요.</p>;
  }
  return (
    <div className="overflow-x-auto p-16">
      <table className="w-full border-collapse text-body-sm" aria-label="관계 목록">
        <thead>
          <tr className="border-b border-border text-left text-caption text-fg-weak">
            <th className="py-6 pr-12 font-medium">인물</th>
            <th className="py-6 pr-12 font-medium">종류</th>
            <th className="py-6 pr-12 font-medium">상대</th>
            <th className="py-6 pr-12 font-medium">→ 상대에게</th>
            <th className="py-6 pr-12 font-medium">← 상대는</th>
            <th className="py-6 pr-12 font-medium">최근 변화</th>
            <th className="py-6 font-medium">메모</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const latest = changeAt(r, orderOf, null);
            const count = r.changes?.length ?? 0;
            return (
              <tr
                key={r.id}
                className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface"
                onClick={() => onEdit(r)}
              >
                <td className="py-8 pr-12 font-medium text-fg">{nameOf(r.fromId)}</td>
                <td className="py-8 pr-12 text-fg">
                  <span
                    aria-hidden
                    className={cn("mr-6 inline-block h-8 w-8 rounded-full align-middle", DOT_BG_CLASS[relationTypeColor(r.type, typeColors)])}
                  />
                  {r.type}
                </td>
                <td className="py-8 pr-12 font-medium text-fg">{nameOf(r.toId)}</td>
                <td className="py-8 pr-12 text-fg-weak">{r.fromLabel || "—"}</td>
                <td className="py-8 pr-12 text-fg-weak">{r.toLabel || "—"}</td>
                <td className="py-8 pr-12 text-fg-weak">
                  {latest ? (
                    <>
                      {latest.note}
                      <span className="ml-4 text-caption">({episodeTitleOf(latest.documentId) ?? "?"}{count > 1 ? ` 외 ${count - 1}` : ""})</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="max-w-[240px] truncate py-8 text-fg-weak">{r.note || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
