// 조합기 재료 — 바인더의 인물·설정 카드 문서 제목만 꺼낸다(휴지통 제외는 호출부가 보장).
import type { DocumentNode } from "@entities/document";

export function characterDocs(documents: readonly DocumentNode[]): DocumentNode[] {
  return documents.filter((d) => d.type === "DOC" && d.kind === "character");
}

export function settingDocs(documents: readonly DocumentNode[]): DocumentNode[] {
  return documents.filter((d) => d.type === "DOC" && d.kind === "setting");
}
