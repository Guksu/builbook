"use client";

import { useCallback, useEffect, useState } from "react";
import { readJson, writeJson } from "@shared/lib";

/**
 * localStorage에 남는 화면 설정(정렬·필터·카드 크기 같은 것).
 * 첫 렌더는 initial(서버와 같은 값)로 시작하고 마운트 뒤 저장값을 읽는다 — hydration 불일치 방지.
 * key가 바뀌면(작품 전환) 그 키의 값을 다시 읽는다.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  guard: (v: unknown) => v is T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    setValue(readJson(key, guard, initial));
    // initial·guard는 호출부에서 고정 — key만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeJson(key, next);
    },
    [key],
  );
  return [value, set];
}
