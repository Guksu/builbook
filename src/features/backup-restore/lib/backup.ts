// 전체 백업 변환·검증 — 순수 함수(브라우저/DB 비종속이라 단위 테스트가 쉽다).
// local-first라 원고가 이 브라우저의 IndexedDB에만 있다. 캐시 삭제·시크릿 모드 종료·
// 브라우저 교체 한 번이면 통째로 사라지므로, "파일 한 개로 전부 내보내고 되돌리기"가
// 이 기능의 유일한 목적이다. 형식은 사람이 열어봐도 이해되는 평범한 JSON으로 둔다.

import type { Project } from "@entities/project";
import type { DocumentNode } from "@entities/document";
import type { Snapshot } from "@entities/snapshot";
import type { Note } from "@entities/note";
import type { WritingLog } from "@entities/writing-log";
import type { StoryEvent } from "@entities/story-event";
import type { Term } from "@entities/term";
import type { Idea } from "@entities/idea";
import type { Relation } from "@entities/relation";

export const BACKUP_FORMAT = "builbook-backup";
/** 백업 파일 스키마 버전. 구조가 바뀌면 올린다(읽기 호환은 아래 parseBackup이 판정). */
export const BACKUP_VERSION = 1;

export interface BackupData {
  projects: Project[];
  documents: DocumentNode[];
  snapshots: Snapshot[];
  notes: Note[];
  writingLogs: WritingLog[];
  events: StoryEvent[];
  terms: Term[];
  /** v1 파일에는 없을 수 있다 — parseBackup이 빈 배열로 채운다. */
  ideas: Idea[];
  relations: Relation[];
}

export type BackupStore = keyof BackupData;

export const BACKUP_STORES: readonly BackupStore[] = [
  "projects",
  "documents",
  "snapshots",
  "notes",
  "writingLogs",
  "events",
  "terms",
  "ideas",
  "relations",
];

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** 내보낸 시각(ISO). 파일명·복원 확인 화면에 쓴다. */
  exportedAt: string;
  /** 내보낼 당시의 IndexedDB 스키마 버전(진단용). */
  dbVersion: number;
  counts: Record<BackupStore, number>;
  data: BackupData;
}

export const emptyBackupData = (): BackupData => ({
  projects: [],
  documents: [],
  snapshots: [],
  notes: [],
  writingLogs: [],
  events: [],
  terms: [],
  ideas: [],
  relations: [],
});

export function countBackupData(data: BackupData): Record<BackupStore, number> {
  return {
    projects: data.projects.length,
    documents: data.documents.length,
    snapshots: data.snapshots.length,
    notes: data.notes.length,
    writingLogs: data.writingLogs.length,
    events: data.events.length,
    terms: data.terms.length,
    ideas: data.ideas.length,
    relations: data.relations.length,
  };
}

export function buildBackup(
  data: BackupData,
  meta: { exportedAt: string; dbVersion: number },
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: meta.exportedAt,
    dbVersion: meta.dbVersion,
    counts: countBackupData(data),
    data,
  };
}

// JSON 문자열로 직렬화. 사람이 열어볼 수 있게 들여쓰기를 둔다(원고 안전이 용량보다 중요).
export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2);
}

// 백업 파일명: builbook-backup-2026-07-29-1530.json (콜론은 파일명에 못 쓴다).
export function backupFileName(exportedAt: string): string {
  const safe = exportedAt.replace(/[:.]/g, "-").replace(/T/, "-").slice(0, 19);
  return `builbook-backup-${safe}`;
}

export type ParseResult =
  | { ok: true; file: BackupFile }
  | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// 배열이면서 모든 원소가 문자열 id를 가진 객체인지 — 복원이 스토어에 넣을 수 있는 최소 조건
// (IndexedDB keyPath가 "id"라 id가 없으면 put 자체가 실패한다).
function readRecords(value: unknown, label: string): { ok: true; items: Record<string, unknown>[] } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, items: [] }; // 구버전/부분 백업 허용
  if (!Array.isArray(value)) return { ok: false, error: `${label} 항목이 배열이 아니에요.` };
  const items: Record<string, unknown>[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id) {
      return { ok: false, error: `${label} 항목에 id가 없어요. 손상된 백업 파일일 수 있어요.` };
    }
    items.push(item);
  }
  return { ok: true, items };
}

/**
 * 백업 파일 텍스트 → 검증된 BackupFile.
 * 남의 파일·손상 파일·미래 버전을 조용히 통과시키지 않는다 — 잘못 복원하면 원고가 날아간다.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON 형식이 아니에요. 백업 파일이 맞는지 확인해 주세요." };
  }
  if (!isRecord(raw)) return { ok: false, error: "백업 파일 구조가 아니에요." };
  if (raw.format !== BACKUP_FORMAT) {
    return { ok: false, error: "builbook 백업 파일이 아니에요." };
  }
  const version = typeof raw.version === "number" ? raw.version : NaN;
  if (!Number.isFinite(version)) return { ok: false, error: "백업 버전 정보가 없어요." };
  if (version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `더 새로운 버전(v${version})의 백업이에요. 앱을 업데이트한 뒤 복원해 주세요.`,
    };
  }
  const rawData = isRecord(raw.data) ? raw.data : null;
  if (!rawData) return { ok: false, error: "백업 내용(data)이 없어요." };

  const data = emptyBackupData();
  for (const store of BACKUP_STORES) {
    const result = readRecords(rawData[store], store);
    if (!result.ok) return { ok: false, error: result.error };
    // 검증을 통과한 레코드만 도메인 타입으로 취급한다(필드 단위 검사는 하지 않는다 —
    // 선택 필드가 늘어나는 스키마라 과도한 검사는 오히려 정상 백업을 막는다).
    (data[store] as unknown[]) = result.items;
  }

  return {
    ok: true,
    file: {
      format: BACKUP_FORMAT,
      version,
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
      dbVersion: typeof raw.dbVersion === "number" ? raw.dbVersion : 0,
      counts: countBackupData(data),
      data,
    },
  };
}

export type ImportMode = "merge" | "replace";

export interface StoreDiff {
  added: number;
  updated: number;
  /** 기존 것이 더 최신이라 백업 쪽을 버린 수(merge 모드에서만 발생). */
  kept: number;
}

export type ImportSummary = Record<BackupStore, StoreDiff>;

interface Stamped {
  id: string;
  updatedAt?: string;
  createdAt?: string;
}

const stampOf = (r: Stamped): string => r.updatedAt ?? r.createdAt ?? "";

/**
 * id 기준 병합. 같은 id면 updatedAt(없으면 createdAt)이 더 최신인 쪽을 남긴다.
 * 두 기기/두 브라우저에서 쓰다 합칠 때 오래된 백업이 최신 원고를 덮어쓰지 않게 하는 규칙.
 */
export function mergeById<T extends Stamped>(
  existing: readonly T[],
  incoming: readonly T[],
): { items: T[]; diff: StoreDiff } {
  const byId = new Map<string, T>(existing.map((r) => [r.id, r]));
  const diff: StoreDiff = { added: 0, updated: 0, kept: 0 };
  for (const item of incoming) {
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, item);
      diff.added++;
      continue;
    }
    // 동률(같은 시각)이면 기존을 남긴다 — 쓰기를 줄이고 결과가 결정적이다.
    if (stampOf(item) > stampOf(current)) {
      byId.set(item.id, item);
      diff.updated++;
    } else {
      diff.kept++;
    }
  }
  return { items: [...byId.values()], diff };
}

/**
 * 부모가 사라진 레코드를 떨어낸다 — 작품 없는 문서/노트, 문서 없는 스냅샷.
 * 부분 백업이나 오래된 파일을 병합할 때 화면에 뜨지 않는 고아 데이터가 쌓이는 걸 막는다.
 */
export function dropOrphans(data: BackupData): BackupData {
  const projectIds = new Set(data.projects.map((p) => p.id));
  const documents = data.documents.filter((d) => projectIds.has(d.projectId));
  const documentIds = new Set(documents.map((d) => d.id));
  return {
    projects: data.projects,
    documents,
    snapshots: data.snapshots.filter((s) => documentIds.has(s.documentId)),
    notes: data.notes.filter((n) => projectIds.has(n.projectId)),
    writingLogs: data.writingLogs.filter((l) => projectIds.has(l.projectId)),
    events: data.events.filter((e) => projectIds.has(e.projectId)),
    terms: data.terms.filter((t) => projectIds.has(t.projectId)),
    ideas: data.ideas.filter((i) => projectIds.has(i.projectId)),
    relations: data.relations.filter((r) => projectIds.has(r.projectId)),
  };
}

export interface ImportPlan {
  /** 복원 후 각 스토어에 남아야 할 최종 레코드 전체. */
  data: BackupData;
  summary: ImportSummary;
}

/**
 * 복원 계획 — 기존 데이터와 백업을 mode에 따라 합친 최종 상태를 계산한다(쓰기는 하지 않음).
 * - merge: 기존을 유지하며 백업을 얹는다(기본). 안전하다.
 * - replace: 기존을 전부 버리고 백업 그대로 만든다. 되돌릴 수 없어 확인을 받는다.
 */
export function planImport(
  existing: BackupData,
  incoming: BackupData,
  mode: ImportMode,
): ImportPlan {
  if (mode === "replace") {
    const data = dropOrphans(incoming);
    return {
      data,
      summary: {
        projects: { added: data.projects.length, updated: 0, kept: 0 },
        documents: { added: data.documents.length, updated: 0, kept: 0 },
        snapshots: { added: data.snapshots.length, updated: 0, kept: 0 },
        notes: { added: data.notes.length, updated: 0, kept: 0 },
        writingLogs: { added: data.writingLogs.length, updated: 0, kept: 0 },
        events: { added: data.events.length, updated: 0, kept: 0 },
        terms: { added: data.terms.length, updated: 0, kept: 0 },
        ideas: { added: data.ideas.length, updated: 0, kept: 0 },
        relations: { added: data.relations.length, updated: 0, kept: 0 },
      },
    };
  }
  const projects = mergeById(existing.projects, incoming.projects);
  const documents = mergeById(existing.documents, incoming.documents);
  const snapshots = mergeById(existing.snapshots, incoming.snapshots);
  const notes = mergeById(existing.notes, incoming.notes);
  const writingLogs = mergeById(existing.writingLogs, incoming.writingLogs);
  const events = mergeById(existing.events, incoming.events);
  const terms = mergeById(existing.terms, incoming.terms);
  const ideas = mergeById(existing.ideas, incoming.ideas);
  const relations = mergeById(existing.relations, incoming.relations);
  const merged = dropOrphans({
    projects: projects.items,
    documents: documents.items,
    snapshots: snapshots.items,
    notes: notes.items,
    writingLogs: writingLogs.items,
    events: events.items,
    terms: terms.items,
    ideas: ideas.items,
    relations: relations.items,
  });
  return {
    data: merged,
    summary: {
      projects: projects.diff,
      documents: documents.diff,
      snapshots: snapshots.diff,
      notes: notes.diff,
      writingLogs: writingLogs.diff,
      events: events.diff,
      terms: terms.diff,
      ideas: ideas.diff,
      relations: relations.diff,
    },
  };
}

const STORE_LABEL: Record<BackupStore, string> = {
  projects: "작품",
  documents: "문서",
  snapshots: "스냅샷",
  notes: "노트",
  writingLogs: "집필 기록",
  events: "사건",
  terms: "용어",
  ideas: "아이디어",
  relations: "관계",
};

// "작품 2개 추가 · 문서 5개 갱신" 같은 사람이 읽는 한 줄. 변화 없는 스토어는 생략한다.
export function describeSummary(summary: ImportSummary): string {
  const parts: string[] = [];
  for (const store of BACKUP_STORES) {
    const { added, updated } = summary[store];
    if (added) parts.push(`${STORE_LABEL[store]} ${added}개 추가`);
    if (updated) parts.push(`${STORE_LABEL[store]} ${updated}개 갱신`);
  }
  return parts.length ? parts.join(" · ") : "새로 반영된 내용이 없어요.";
}

export type BackupLevel = "empty" | "never" | "stale" | "ok";

export interface BackupStatus {
  level: BackupLevel;
  /** 마지막 백업 이후 지난 일수. 백업 이력이 없으면 null. */
  days: number | null;
  message: string;
}

/** 백업을 권할 기준(일). 이보다 오래됐으면 대시보드에 배너를 띄운다. */
export const STALE_BACKUP_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 백업 상태 판정 — 배너 노출 여부의 단일 출처.
 * 작품이 하나도 없으면(empty) 아무 말도 하지 않는다: 잃을 게 없는 사용자를 겁주지 않는다.
 */
export function backupStatus(
  lastBackupAt: string | null,
  now: Date,
  projectCount: number,
): BackupStatus {
  if (projectCount <= 0) {
    return { level: "empty", days: null, message: "" };
  }
  const last = lastBackupAt ? new Date(lastBackupAt) : null;
  if (!last || Number.isNaN(last.getTime())) {
    return {
      level: "never",
      days: null,
      message: "아직 백업한 적이 없어요. 원고는 이 브라우저에만 있어요.",
    };
  }
  const days = Math.floor((now.getTime() - last.getTime()) / DAY_MS);
  if (days >= STALE_BACKUP_DAYS) {
    return {
      level: "stale",
      days,
      message: `마지막 백업이 ${days}일 전이에요. 지금 백업해 두세요.`,
    };
  }
  return {
    level: "ok",
    days: Math.max(0, days),
    message: days <= 0 ? "오늘 백업했어요." : `${days}일 전에 백업했어요.`,
  };
}
