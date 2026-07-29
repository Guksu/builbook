import { describe, expect, it } from "vitest";
import {
  applyDelta,
  averagePerActiveDay,
  bestDay,
  buildSeries,
  computeStreak,
  dateKey,
  estimateDaysToGoal,
  logId,
  longestStreak,
  shiftDateKey,
  totalWritten,
  writtenOn,
} from "./stats";
import type { WritingLog } from "../model/types";

const log = (date: string, written: number, net = written): WritingLog => ({
  id: logId("p1", date),
  projectId: "p1",
  date,
  net,
  written,
  updatedAt: `${date}T12:00:00.000Z`,
});

describe("dateKey / shiftDateKey", () => {
  it("로컬 시간 기준 YYYY-MM-DD를 만든다", () => {
    expect(dateKey(new Date(2026, 6, 29, 1, 30))).toBe("2026-07-29");
  });

  it("월·연 경계를 넘어간다", () => {
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("applyDelta", () => {
  it("기록이 없으면 새로 만든다", () => {
    const next = applyDelta(undefined, {
      projectId: "p1",
      date: "2026-07-29",
      delta: 120,
      now: "2026-07-29T10:00:00.000Z",
    });
    expect(next).toMatchObject({ id: "p1:2026-07-29", net: 120, written: 120 });
  });

  it("같은 날 저장은 누적된다", () => {
    const first = applyDelta(undefined, {
      projectId: "p1",
      date: "2026-07-29",
      delta: 100,
      now: "t1",
    });
    const second = applyDelta(first, {
      projectId: "p1",
      date: "2026-07-29",
      delta: 50,
      now: "t2",
    });
    expect(second.written).toBe(150);
  });

  it("지운 만큼은 net만 깎고 written은 유지한다", () => {
    const first = applyDelta(undefined, {
      projectId: "p1",
      date: "2026-07-29",
      delta: 200,
      now: "t1",
    });
    const after = applyDelta(first, {
      projectId: "p1",
      date: "2026-07-29",
      delta: -80,
      now: "t2",
    });
    expect(after.net).toBe(120);
    expect(after.written).toBe(200);
  });

  it("NaN 델타는 0으로 방어한다", () => {
    const next = applyDelta(undefined, {
      projectId: "p1",
      date: "2026-07-29",
      delta: Number.NaN,
      now: "t",
    });
    expect(next.written).toBe(0);
  });
});

describe("computeStreak", () => {
  const today = "2026-07-29";

  it("오늘부터 이어진 날을 센다", () => {
    const logs = [log("2026-07-29", 300), log("2026-07-28", 500), log("2026-07-27", 200)];
    expect(computeStreak(logs, today)).toBe(3);
  });

  it("오늘 아직 안 썼어도 어제까지의 연속을 유지한다", () => {
    const logs = [log("2026-07-28", 500), log("2026-07-27", 200)];
    expect(computeStreak(logs, today)).toBe(2);
  });

  it("이틀 이상 비면 0이다", () => {
    const logs = [log("2026-07-26", 500)];
    expect(computeStreak(logs, today)).toBe(0);
  });

  it("written이 0인 날은 쓴 날로 치지 않는다", () => {
    const logs = [log("2026-07-29", 0, -50), log("2026-07-28", 400)];
    expect(computeStreak(logs, today)).toBe(1);
  });

  it("기록이 없으면 0", () => {
    expect(computeStreak([], today)).toBe(0);
  });
});

describe("longestStreak", () => {
  it("가장 길게 이어진 구간을 찾는다", () => {
    const logs = [
      log("2026-07-01", 100),
      log("2026-07-02", 100),
      log("2026-07-05", 100),
      log("2026-07-06", 100),
      log("2026-07-07", 100),
    ];
    expect(longestStreak(logs)).toBe(3);
  });

  it("기록이 없으면 0", () => {
    expect(longestStreak([])).toBe(0);
  });
});

describe("buildSeries", () => {
  it("요청한 일수만큼, 빈 날은 0으로 채운다", () => {
    const series = buildSeries([log("2026-07-29", 300)], "2026-07-29", 3);
    expect(series).toEqual([
      { date: "2026-07-27", written: 0 },
      { date: "2026-07-28", written: 0 },
      { date: "2026-07-29", written: 300 },
    ]);
  });
});

describe("요약 통계", () => {
  const logs = [log("2026-07-27", 400), log("2026-07-28", 0), log("2026-07-29", 200)];

  it("총량·오늘·평균·최고의 날", () => {
    expect(totalWritten(logs)).toBe(600);
    expect(writtenOn(logs, "2026-07-29")).toBe(200);
    // 안 쓴 날(0)은 평균의 분모에서 빠진다
    expect(averagePerActiveDay(logs)).toBe(300);
    expect(bestDay(logs)).toEqual({ date: "2026-07-27", written: 400 });
  });

  it("기록이 없으면 평균 0, 최고의 날 없음", () => {
    expect(averagePerActiveDay([])).toBe(0);
    expect(bestDay([])).toBeNull();
  });
});

describe("estimateDaysToGoal", () => {
  it("남은 분량 ÷ 하루 속도(올림)", () => {
    expect(estimateDaysToGoal(1000, 300)).toBe(4);
  });

  it("이미 달성했으면 0", () => {
    expect(estimateDaysToGoal(0, 300)).toBe(0);
  });

  it("속도가 0이면 예측하지 않는다", () => {
    expect(estimateDaysToGoal(1000, 0)).toBeNull();
  });
});
