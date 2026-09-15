// 컴파일 프리셋 — 순수 함수. 이름 중복은 뒤에 번호를 붙여 피하고, 저장은 useProject가 한다.
import type { CompilePreset } from "@entities/project";
import type { CompileOptions } from "./compile";

export const MAX_PRESETS = 12;

export function uniquePresetName(name: string, existing: readonly CompilePreset[]): string {
  const base = name.trim() || "프리셋";
  const taken = new Set(existing.map((p) => p.name));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}

export function addPreset(
  existing: readonly CompilePreset[],
  name: string,
  options: CompileOptions,
  id: string,
): CompilePreset[] {
  const next = [...existing, { id, name: uniquePresetName(name, existing), options: { ...options } }];
  return next.slice(-MAX_PRESETS); // 너무 쌓이면 오래된 것부터 버린다
}

export function removePreset(existing: readonly CompilePreset[], id: string): CompilePreset[] {
  return existing.filter((p) => p.id !== id);
}
