"use client";

import { COUNT_UNITS, isCountUnit } from "@shared/lib";
import { useCountUnit } from "../model/useCountUnit";

// 분량 단위 선택 — 인스펙터 정보 탭에 둔다. 바꾸면 헤더·목표·현황의 숫자가 즉시 따라온다.
export function CountUnitSelect({ id = "count-unit" }: { id?: string }) {
  const [unit, setUnit] = useCountUnit();
  return (
    <div className="flex items-center justify-between gap-8">
      <label htmlFor={id} className="text-fg-weak">
        분량 단위
      </label>
      <select
        id={id}
        aria-label="분량 단위"
        value={unit}
        onChange={(e) => {
          if (isCountUnit(e.target.value)) setUnit(e.target.value);
        }}
        className="h-32 rounded-md border border-border bg-bg px-8 text-body-sm text-fg"
      >
        {COUNT_UNITS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
    </div>
  );
}
