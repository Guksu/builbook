import { describe, expect, it } from "vitest";
import {
  DEFAULT_EPISODE_GOAL,
  EPISODE_PRESETS,
  buildEpisodeStats,
  episodeStatus,
  episodeStatusLabel,
  summarizeEpisodes,
} from "./episodes";
import type { DocumentNode } from "@entities/document";

const text = (s: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: s }] }],
});

const node = (over: Partial<DocumentNode> & { id: string }): DocumentNode => ({
  projectId: "p1",
  parentId: null,
  type: "DOC",
  title: over.id,
  order: 0,
  content: null,
  synopsis: null,
  wordCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("episodeStatus", () => {
  it("목표의 90% 미만이면 짧음", () => {
    expect(episodeStatus(4000, 5500)).toBe("short");
  });
  it("90~120%는 적정", () => {
    expect(episodeStatus(5000, 5500)).toBe("ok");
    expect(episodeStatus(6500, 5500)).toBe("ok");
  });
  it("120% 초과면 긴 편", () => {
    expect(episodeStatus(7000, 5500)).toBe("long");
  });
  it("목표가 없으면 판정하지 않는다", () => {
    expect(episodeStatus(100, 0)).toBe("ok");
  });
});

describe("buildEpisodeStats", () => {
  it("바인더 순서대로 회차 번호를 매긴다(폴더 제외)", () => {
    const docs = [
      node({ id: "f1", type: "FOLDER", title: "1부", order: 0 }),
      node({ id: "d1", title: "1화", parentId: "f1", order: 0, content: text("가나다") }),
      node({ id: "d2", title: "2화", parentId: "f1", order: 1, content: text("라마바") }),
      node({ id: "d3", title: "3화", order: 1, content: text("사아자") }),
    ];
    const stats = buildEpisodeStats(docs, DEFAULT_EPISODE_GOAL);
    expect(stats.map((s) => s.title)).toEqual(["1화", "2화", "3화"]);
    expect(stats.map((s) => s.episodeNo)).toEqual([1, 2, 3]);
  });

  it("휴지통 문서는 세지 않는다", () => {
    const docs = [
      node({ id: "d1", title: "살아있는 화", content: text("가나다") }),
      node({
        id: "d2",
        title: "버린 화",
        order: 1,
        content: text("라마바"),
        trashedAt: "2026-07-01T00:00:00.000Z",
      }),
    ];
    expect(buildEpisodeStats(docs, 5500).map((s) => s.title)).toEqual(["살아있는 화"]);
  });

  it("공백을 포함해 분량을 센다(연재 플랫폼 기준)", () => {
    const docs = [node({ id: "d1", content: text("가 나 다") })];
    expect(buildEpisodeStats(docs, 5500)[0].chars).toBe(5);
  });

  it("빈 문서는 0자·짧음", () => {
    const stats = buildEpisodeStats([node({ id: "d1" })], 5500);
    expect(stats[0]).toMatchObject({ chars: 0, status: "short", percent: 0 });
  });
});

describe("summarizeEpisodes", () => {
  it("편수·총량·평균·상태별 개수를 낸다", () => {
    const stats = buildEpisodeStats(
      [
        node({ id: "d1", content: text("가".repeat(5000)) }),
        node({ id: "d2", order: 1, content: text("나".repeat(1000)) }),
        node({ id: "d3", order: 2, content: text("다".repeat(9000)) }),
      ],
      5500,
    );
    const summary = summarizeEpisodes(stats);
    expect(summary).toMatchObject({ count: 3, totalChars: 15000, averageChars: 5000 });
    expect(summary.short).toBe(1);
    expect(summary.ok).toBe(1);
    expect(summary.long).toBe(1);
  });

  it("회차가 없으면 평균 0", () => {
    expect(summarizeEpisodes([])).toMatchObject({ count: 0, averageChars: 0 });
  });
});

describe("episodeStatusLabel", () => {
  it("한국어 라벨을 돌려준다", () => {
    expect(episodeStatusLabel("short")).toBe("짧음");
    expect(episodeStatusLabel("ok")).toBe("적정");
    expect(episodeStatusLabel("long")).toBe("긴 편");
  });
});

describe("EPISODE_PRESETS", () => {
  it("모든 프리셋에 양수 목표·단위·근거가 있다", () => {
    for (const p of EPISODE_PRESETS) {
      expect(p.goal).toBeGreaterThan(0);
      expect(["chars", "charsNoSpace", "words"]).toContain(p.unit);
      expect(p.source.length).toBeGreaterThan(10);
    }
    expect(new Set(EPISODE_PRESETS.map((p) => p.id)).size).toBe(EPISODE_PRESETS.length);
  });

  it("단위를 바꾸면 표의 분량도 그 단위로 센다", () => {
    const doc = {
      id: "d",
      projectId: "p",
      parentId: null,
      type: "DOC" as const,
      title: "1화",
      order: 0,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "가 나 다" }] }] },
      synopsis: null,
      wordCount: 0,
      createdAt: "t",
      updatedAt: "t",
    };
    expect(buildEpisodeStats([doc], 10)[0].chars).toBe(5);
    expect(buildEpisodeStats([doc], 10, "charsNoSpace")[0].chars).toBe(3);
    expect(buildEpisodeStats([doc], 10, "words")[0].chars).toBe(3);
  });
});
