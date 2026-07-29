import { describe, expect, it } from "vitest";
import { buildTimelineRows, isValidEventTitle, moveEvent, sortEvents } from "./timeline";
import type { StoryEvent } from "../model/types";

const ev = (over: Partial<StoryEvent> & { id: string }): StoryEvent => ({
  projectId: "p1",
  title: over.id,
  when: "",
  body: "",
  documentId: null,
  order: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("sortEvents", () => {
  it("order 오름차순", () => {
    const sorted = sortEvents([ev({ id: "b", order: 2 }), ev({ id: "a", order: 1 })]);
    expect(sorted.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("order가 같으면 생성 순", () => {
    const sorted = sortEvents([
      ev({ id: "late", order: 0, createdAt: "2026-02-01T00:00:00.000Z" }),
      ev({ id: "early", order: 0, createdAt: "2026-01-01T00:00:00.000Z" }),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["early", "late"]);
  });

  it("원본 배열을 건드리지 않는다", () => {
    const input = [ev({ id: "b", order: 2 }), ev({ id: "a", order: 1 })];
    sortEvents(input);
    expect(input.map((e) => e.id)).toEqual(["b", "a"]);
  });
});

describe("moveEvent", () => {
  const events = [
    ev({ id: "e1", order: 0 }),
    ev({ id: "e2", order: 1 }),
    ev({ id: "e3", order: 2 }),
  ];

  it("위로 한 칸", () => {
    expect(moveEvent(events, "e2", "up")).toEqual(["e2", "e1", "e3"]);
  });

  it("아래로 한 칸", () => {
    expect(moveEvent(events, "e2", "down")).toEqual(["e1", "e3", "e2"]);
  });

  it("맨 위에서 위로는 그대로", () => {
    expect(moveEvent(events, "e1", "up")).toEqual(["e1", "e2", "e3"]);
  });

  it("맨 아래에서 아래로는 그대로", () => {
    expect(moveEvent(events, "e3", "down")).toEqual(["e1", "e2", "e3"]);
  });

  it("없는 id는 순서를 바꾸지 않는다", () => {
    expect(moveEvent(events, "없음", "up")).toEqual(["e1", "e2", "e3"]);
  });
});

describe("buildTimelineRows", () => {
  const docs = [{ id: "d1", title: "1화 회귀" }];

  it("연결된 회차 제목을 붙인다", () => {
    const rows = buildTimelineRows([ev({ id: "e1", documentId: "d1" })], docs);
    expect(rows[0]).toMatchObject({ documentTitle: "1화 회귀", brokenLink: false });
  });

  it("연결이 없으면 제목도 없다", () => {
    const rows = buildTimelineRows([ev({ id: "e1" })], docs);
    expect(rows[0]).toMatchObject({ documentTitle: null, brokenLink: false });
  });

  it("삭제된 회차를 가리키면 끊어진 연결로 표시한다", () => {
    const rows = buildTimelineRows([ev({ id: "e1", documentId: "사라짐" })], docs);
    expect(rows[0].brokenLink).toBe(true);
  });

  it("정렬 순서를 유지한다", () => {
    const rows = buildTimelineRows(
      [ev({ id: "e2", order: 1 }), ev({ id: "e1", order: 0 })],
      docs,
    );
    expect(rows.map((r) => r.event.id)).toEqual(["e1", "e2"]);
  });
});

describe("isValidEventTitle", () => {
  it("공백뿐인 제목은 거부", () => {
    expect(isValidEventTitle("   ")).toBe(false);
    expect(isValidEventTitle("회귀")).toBe(true);
  });
});
