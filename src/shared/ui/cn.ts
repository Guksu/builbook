/**
 * 조건부 className 결합 헬퍼 (외부 의존성 없음).
 * falsy 값은 무시하고 공백으로 join 한다.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
