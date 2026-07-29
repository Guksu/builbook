import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFileName,
  backupStatus,
  buildBackup,
  countBackupData,
  describeSummary,
  dropOrphans,
  emptyBackupData,
  mergeById,
  parseBackup,
  planImport,
  serializeBackup,
  type BackupData,
} from "./backup";
import type { Project } from "@entities/project";
import type { DocumentNode } from "@entities/document";

const project = (id: string, updatedAt: string, title = id): Project => ({
  id,
  title,
  description: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt,
});

const doc = (id: string, projectId: string, updatedAt: string): DocumentNode => ({
  id,
  projectId,
  parentId: null,
  type: "DOC",
  title: id,
  order: 0,
  content: null,
  synopsis: null,
  wordCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt,
});

const dataWith = (partial: Partial<BackupData>): BackupData => ({
  ...emptyBackupData(),
  ...partial,
});

describe("buildBackup / serializeBackup", () => {
  it("형식·버전·개수를 담은 백업 파일을 만든다", () => {
    const data = dataWith({
      projects: [project("p1", "2026-07-01T00:00:00.000Z")],
      documents: [doc("d1", "p1", "2026-07-01T00:00:00.000Z")],
    });
    const file = buildBackup(data, {
      exportedAt: "2026-07-29T05:30:00.000Z",
      dbVersion: 3,
    });
    expect(file.format).toBe(BACKUP_FORMAT);
    expect(file.version).toBe(BACKUP_VERSION);
    expect(file.counts).toEqual({
      projects: 1,
      documents: 1,
      snapshots: 0,
      notes: 0,
      writingLogs: 0,
      events: 0,
      terms: 0,
    });
  });

  it("직렬화 → 파싱 왕복으로 내용이 보존된다", () => {
    const data = dataWith({
      projects: [project("p1", "2026-07-01T00:00:00.000Z", "회귀한 검사")],
      documents: [doc("d1", "p1", "2026-07-01T00:00:00.000Z")],
    });
    const text = serializeBackup(
      buildBackup(data, { exportedAt: "2026-07-29T05:30:00.000Z", dbVersion: 3 }),
    );
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.data.projects[0].title).toBe("회귀한 검사");
    expect(parsed.file.data.documents).toHaveLength(1);
  });

  it("파일명에 콜론·점이 들어가지 않는다", () => {
    const name = backupFileName("2026-07-29T05:30:00.000Z");
    expect(name).toBe("builbook-backup-2026-07-29-05-30-00");
    expect(name).not.toMatch(/[:.]/);
  });
});

describe("parseBackup", () => {
  it("JSON이 아니면 거부한다", () => {
    const r = parseBackup("not json");
    expect(r.ok).toBe(false);
  });

  it("다른 앱의 JSON은 거부한다", () => {
    const r = parseBackup(JSON.stringify({ format: "other-app", version: 1, data: {} }));
    expect(r).toMatchObject({ ok: false });
    if (r.ok) return;
    expect(r.error).toContain("builbook");
  });

  it("미래 버전 백업은 거부한다", () => {
    const r = parseBackup(
      JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION + 1, data: {} }),
    );
    expect(r).toMatchObject({ ok: false });
    if (r.ok) return;
    expect(r.error).toContain("업데이트");
  });

  it("id 없는 레코드가 섞이면 거부한다(손상 파일)", () => {
    const r = parseBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        data: { projects: [{ title: "id 없음" }] },
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("스토어가 빠진 부분 백업은 빈 배열로 채워 통과시킨다", () => {
    const r = parseBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        data: { projects: [{ id: "p1" }] },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.file.data.notes).toEqual([]);
    expect(r.file.data.snapshots).toEqual([]);
  });
});

describe("mergeById", () => {
  it("없던 id는 추가한다", () => {
    const { items, diff } = mergeById(
      [project("p1", "2026-07-01T00:00:00.000Z")],
      [project("p2", "2026-07-02T00:00:00.000Z")],
    );
    expect(items).toHaveLength(2);
    expect(diff).toEqual({ added: 1, updated: 0, kept: 0 });
  });

  it("백업이 더 최신이면 덮어쓴다", () => {
    const { items, diff } = mergeById(
      [project("p1", "2026-07-01T00:00:00.000Z", "옛 제목")],
      [project("p1", "2026-07-05T00:00:00.000Z", "새 제목")],
    );
    expect(items[0].title).toBe("새 제목");
    expect(diff.updated).toBe(1);
  });

  it("기존이 더 최신이면 백업을 버린다(오래된 백업이 원고를 덮지 않음)", () => {
    const { items, diff } = mergeById(
      [project("p1", "2026-07-10T00:00:00.000Z", "최신 원고")],
      [project("p1", "2026-07-01T00:00:00.000Z", "오래된 백업")],
    );
    expect(items[0].title).toBe("최신 원고");
    expect(diff).toEqual({ added: 0, updated: 0, kept: 1 });
  });

  it("같은 시각이면 기존을 남긴다(결정적 결과)", () => {
    const { items, diff } = mergeById(
      [project("p1", "2026-07-01T00:00:00.000Z", "기존")],
      [project("p1", "2026-07-01T00:00:00.000Z", "백업")],
    );
    expect(items[0].title).toBe("기존");
    expect(diff.kept).toBe(1);
  });
});

describe("dropOrphans", () => {
  it("작품 없는 문서·노트와 문서 없는 스냅샷을 떨어낸다", () => {
    const cleaned = dropOrphans(
      dataWith({
        projects: [project("p1", "2026-07-01T00:00:00.000Z")],
        documents: [doc("d1", "p1", "2026-07-01T00:00:00.000Z"), doc("d2", "없는작품", "2026-07-01T00:00:00.000Z")],
        snapshots: [
          { id: "s1", documentId: "d1", projectId: "p1", title: "t", content: null, wordCount: 0, note: null, createdAt: "2026-07-01T00:00:00.000Z" },
          { id: "s2", documentId: "d2", projectId: "p1", title: "t", content: null, wordCount: 0, note: null, createdAt: "2026-07-01T00:00:00.000Z" },
        ],
        notes: [
          { id: "n1", projectId: "p1", category: "CHARACTER", title: "주인공", role: null, body: "", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" },
          { id: "n2", projectId: "없는작품", category: "SETTING", title: "왕국", role: null, body: "", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" },
        ],
      }),
    );
    expect(cleaned.documents.map((d) => d.id)).toEqual(["d1"]);
    expect(cleaned.snapshots.map((s) => s.id)).toEqual(["s1"]);
    expect(cleaned.notes.map((n) => n.id)).toEqual(["n1"]);
  });

  it("작품 없는 집필 기록도 떨어낸다", () => {
    const cleaned = dropOrphans(
      dataWith({
        projects: [project("p1", "2026-07-01T00:00:00.000Z")],
        writingLogs: [
          { id: "p1:2026-07-01", projectId: "p1", date: "2026-07-01", net: 100, written: 100, updatedAt: "2026-07-01T00:00:00.000Z" },
          { id: "px:2026-07-01", projectId: "px", date: "2026-07-01", net: 100, written: 100, updatedAt: "2026-07-01T00:00:00.000Z" },
        ],
      }),
    );
    expect(cleaned.writingLogs.map((l) => l.id)).toEqual(["p1:2026-07-01"]);
  });
});

describe("planImport", () => {
  const existing = dataWith({
    projects: [project("p1", "2026-07-10T00:00:00.000Z", "기존 작품")],
    documents: [doc("d1", "p1", "2026-07-10T00:00:00.000Z")],
  });
  const incoming = dataWith({
    projects: [project("p2", "2026-07-05T00:00:00.000Z", "백업 작품")],
    documents: [doc("d2", "p2", "2026-07-05T00:00:00.000Z")],
  });

  it("merge는 기존을 유지하고 백업을 얹는다", () => {
    const plan = planImport(existing, incoming, "merge");
    expect(plan.data.projects.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
    expect(plan.data.documents).toHaveLength(2);
    expect(plan.summary.projects.added).toBe(1);
  });

  it("replace는 기존을 버리고 백업만 남긴다", () => {
    const plan = planImport(existing, incoming, "replace");
    expect(plan.data.projects.map((p) => p.id)).toEqual(["p2"]);
    expect(plan.data.documents.map((d) => d.id)).toEqual(["d2"]);
  });

  it("merge 결과에서도 고아는 남지 않는다", () => {
    const orphaned = dataWith({ documents: [doc("dx", "사라진작품", "2026-07-05T00:00:00.000Z")] });
    const plan = planImport(existing, orphaned, "merge");
    expect(plan.data.documents.map((d) => d.id)).toEqual(["d1"]);
  });

  it("빈 백업을 merge해도 기존 데이터는 그대로다", () => {
    const plan = planImport(existing, emptyBackupData(), "merge");
    expect(countBackupData(plan.data)).toMatchObject({ projects: 1, documents: 1 });
    expect(describeSummary(plan.summary)).toContain("없어요");
  });
});

describe("backupStatus", () => {
  const now = new Date("2026-07-29T00:00:00.000Z");

  it("작품이 없으면 아무 말도 하지 않는다", () => {
    expect(backupStatus(null, now, 0).level).toBe("empty");
  });

  it("백업 이력이 없으면 never", () => {
    expect(backupStatus(null, now, 2).level).toBe("never");
  });

  it("7일 이상 지나면 stale", () => {
    expect(backupStatus("2026-07-20T00:00:00.000Z", now, 1).level).toBe("stale");
    expect(backupStatus("2026-07-20T00:00:00.000Z", now, 1).days).toBe(9);
  });

  it("최근 백업이면 ok", () => {
    expect(backupStatus("2026-07-28T00:00:00.000Z", now, 1).level).toBe("ok");
  });

  it("손상된 시각 문자열은 백업 없음으로 본다", () => {
    expect(backupStatus("어제", now, 1).level).toBe("never");
  });
});
