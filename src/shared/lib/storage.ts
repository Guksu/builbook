// localStorage에 JSON을 안전하게 읽고 쓰는 순수 헬퍼 — 값 검증은 호출부가 guard로 한다.
// 프라이빗 모드·용량 초과·손상된 값 어느 경우에도 예외를 밖으로 내지 않는다(화면 편의 설정이라 잃어도 된다).

export function readJson<T>(key: string, guard: (v: unknown) => v is T, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 불가 — 이번 세션만 반영 */
  }
}

/** 문자열 열거값 guard 생성기: isOneOf(["a","b"]) */
export function isOneOf<const T extends readonly string[]>(values: T) {
  return (v: unknown): v is T[number] => typeof v === "string" && (values as readonly string[]).includes(v);
}
