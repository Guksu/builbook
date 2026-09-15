// 접힌 폴더 집합의 저장 형식(localStorage) — 직렬화/파싱을 한 곳에 모아 둔다.
// 저장된 값이 깨져 있어도(수동 편집, 옛 형식) 바인더가 죽지 않고 "다 펼침"으로 돌아가야 한다.

/** 작품별 키 — 다른 작품의 접힘 상태가 섞이지 않도록 projectId를 붙인다. */
export function collapsedStorageKey(projectId: string): string {
  return `builbook:binder-collapsed:${projectId}`;
}

export function serializeCollapsed(ids: ReadonlySet<string>): string {
  return JSON.stringify([...ids]);
}

export function parseCollapsed(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}
