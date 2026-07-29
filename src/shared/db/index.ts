import { openDB, type IDBPDatabase } from "idb";

// 로컬 우선(local-first) 저장소. 브라우저 IndexedDB 한 곳에 모든 데이터 보관.
// 도메인 타입에 비종속 — entities 레이어가 자기 타입으로 사용한다.
const DB_NAME = "builbook";
// v2: snapshots 스토어 추가(문서 버전 히스토리).
// v3: notes 스토어 추가(캐릭터·설정 리서치 노트). 업그레이드 콜백은 기존 스토어를 건드리지 않는다.
// v4: writingLogs 스토어 추가(일별 집필량·연속 집필일).
// v5: events 스토어 추가(타임라인 사건).
// v6: terms 스토어 추가(고유명사 사전).
// 백업 파일에 기록해 진단에 쓴다(복원 로직은 버전이 아니라 레코드 형태만 본다).
export const DB_VERSION = 6;

export const STORES = {
  projects: "projects",
  documents: "documents",
  snapshots: "snapshots",
  notes: "notes",
  writingLogs: "writingLogs",
  events: "events",
  terms: "terms",
} as const;
export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") {
    // SSR 등 브라우저 밖에서 호출되면 명확히 실패 (SWR는 클라이언트에서만 호출).
    return Promise.reject(new Error("IndexedDB는 브라우저에서만 사용할 수 있습니다."));
  }
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    // 기존 사용자 보존: contains 확인 후 없을 때만 생성. 어떤 버전에서 올라오든 안전.
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.projects)) {
        db.createObjectStore(STORES.projects, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.documents)) {
        const docs = db.createObjectStore(STORES.documents, { keyPath: "id" });
        docs.createIndex("by-project", "projectId");
      }
      if (!db.objectStoreNames.contains(STORES.snapshots)) {
        const snaps = db.createObjectStore(STORES.snapshots, { keyPath: "id" });
        snaps.createIndex("by-document", "documentId");
      }
      if (!db.objectStoreNames.contains(STORES.notes)) {
        const notes = db.createObjectStore(STORES.notes, { keyPath: "id" });
        notes.createIndex("by-project", "projectId");
      }
      if (!db.objectStoreNames.contains(STORES.writingLogs)) {
        const logs = db.createObjectStore(STORES.writingLogs, { keyPath: "id" });
        logs.createIndex("by-project", "projectId");
      }
      if (!db.objectStoreNames.contains(STORES.events)) {
        const events = db.createObjectStore(STORES.events, { keyPath: "id" });
        events.createIndex("by-project", "projectId");
      }
      if (!db.objectStoreNames.contains(STORES.terms)) {
        const terms = db.createObjectStore(STORES.terms, { keyPath: "id" });
        terms.createIndex("by-project", "projectId");
      }
    },
  });
  return dbPromise;
}

export async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  return (await getDB()).getAll(store) as Promise<T[]>;
}

export async function dbGetAllByProject<T>(
  store: StoreName,
  projectId: string,
): Promise<T[]> {
  return (await getDB()).getAllFromIndex(store, "by-project", projectId) as Promise<T[]>;
}

// 임의 인덱스로 조회(예: snapshots의 by-document).
export async function dbGetAllByIndex<T>(
  store: StoreName,
  indexName: string,
  key: string,
): Promise<T[]> {
  return (await getDB()).getAllFromIndex(store, indexName, key) as Promise<T[]>;
}

export async function dbGet<T>(store: StoreName, id: string): Promise<T | undefined> {
  return (await getDB()).get(store, id) as Promise<T | undefined>;
}

export async function dbPut<T>(store: StoreName, value: T): Promise<void> {
  await (await getDB()).put(store, value);
}

export async function dbDelete(store: StoreName, id: string): Promise<void> {
  await (await getDB()).delete(store, id);
}

// 여러 레코드를 한 트랜잭션으로 저장(재정렬 등).
export async function dbBulkPut<T>(store: StoreName, values: T[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, "readwrite");
  await Promise.all([...values.map((v) => tx.store.put(v)), tx.done]);
}

// 여러 키를 한 트랜잭션으로 삭제(하위 cascade).
export async function dbBulkDelete(store: StoreName, ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, "readwrite");
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
}

// 스토어 하나를 통째로 비우고 주어진 레코드로 교체한다(백업 '전체 교체' 복원 전용).
// 비우기와 채우기를 한 트랜잭션에 묶는다 — 중간에 실패해도 빈 스토어가 남지 않는다.
export async function dbReplaceAll<T>(store: StoreName, values: T[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, "readwrite");
  await tx.store.clear();
  await Promise.all([...values.map((v) => tx.store.put(v)), tx.done]);
}
