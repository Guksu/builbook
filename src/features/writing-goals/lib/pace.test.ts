import { describe, expect, it } from "vitest";
import { daysBetween, paceToDeadline } from "./pace";

describe("daysBetween", () => {
  it("날짜 차이를 일로", () => {
    expect(daysBetween("2026-09-15", "2026-09-15")).toBe(0);
    expect(daysBetween("2026-09-15", "2026-09-20")).toBe(5);
    expect(daysBetween("2026-09-20", "2026-09-15")).toBe(-5);
    expect(daysBetween("2026-02-27", "2026-03-02")).toBe(3);
  });
  it("형식이 틀리면 null", () => {
    expect(daysBetween("2026/09/15", "2026-09-20")).toBeNull();
    expect(daysBetween("", "2026-09-20")).toBeNull();
  });
});

describe("paceToDeadline", () => {
  it("오늘을 포함해 나눈다(올림)", () => {
    expect(paceToDeadline(1000, "2026-09-19", "2026-09-15")).toEqual({
      daysLeft: 5,
      perDay: 200,
      overdue: false,
    });
    expect(paceToDeadline(1001, "2026-09-19", "2026-09-15")?.perDay).toBe(201);
  });
  it("마감 당일은 하루가 남은 것", () => {
    expect(paceToDeadline(300, "2026-09-15", "2026-09-15")).toEqual({
      daysLeft: 1,
      perDay: 300,
      overdue: false,
    });
  });
  it("마감이 지나면 overdue, 남은 분량 전부가 오늘 몫", () => {
    expect(paceToDeadline(300, "2026-09-10", "2026-09-15")).toEqual({
      daysLeft: 0,
      perDay: 300,
      overdue: true,
    });
  });
  it("남은 분량이 0이면 하루 0", () => {
    expect(paceToDeadline(0, "2026-09-19", "2026-09-15")?.perDay).toBe(0);
    expect(paceToDeadline(-5, "2026-09-19", "2026-09-15")?.perDay).toBe(0);
  });
  it("잘못된 날짜는 null", () => {
    expect(paceToDeadline(100, "언젠가", "2026-09-15")).toBeNull();
  });
});
