// 회차 제목 규칙 — 새 문서 기본 이름을 "N화"로 이어 붙인다(옵시디언의 "Untitled" 대신
// 웹소설에 맞는 기본값). 형제 문서 제목 앞의 숫자만 보고 다음 번호를 고른다.

/** "12화", "12화 - 제목", "제12화"에서 12를 뽑는다. */
const EPISODE_RE = /^(?:제\s*)?(\d+)\s*화/;

export function parseEpisodeNo(title: string): number | null {
  const m = EPISODE_RE.exec(title.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** 형제 문서 제목들 중 가장 큰 회차 번호 + 1. 회차가 하나도 없으면 1화. */
export function nextEpisodeTitle(siblings: readonly { title: string; type?: string }[]): string {
  let max = 0;
  for (const s of siblings) {
    if (s.type === "FOLDER") continue;
    const n = parseEpisodeNo(s.title);
    if (n !== null && n > max) max = n;
  }
  return `${max + 1}화`;
}

/** 새 폴더 기본 이름 — "새 폴더", 겹치면 "새 폴더 2", "새 폴더 3"… */
export function nextFolderTitle(siblings: readonly { title: string; type?: string }[]): string {
  const taken = new Set(siblings.filter((s) => s.type === "FOLDER").map((s) => s.title.trim()));
  if (!taken.has("새 폴더")) return "새 폴더";
  let i = 2;
  while (taken.has(`새 폴더 ${i}`)) i += 1;
  return `새 폴더 ${i}`;
}
