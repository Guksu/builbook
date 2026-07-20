# 검색 · 내보내기 · 휴지통(소프트 삭제/복원)

| 항목 | 내용 |
|------|------|
| 날짜 | 2026-07-20 |
| 작성 | frontend-engineer |
| 관련 경로 | `src/entities/document`, `src/features/{search-document,export-document,trash-document}`, `src/views/workspace`, `src/widgets/binder`, `e2e` |

## 1. 개요

웹소설 에디터 builbook에 3개 기능을 추가했다: (1) 작품 내 문서 검색(제목+본문), (2) 문서/작품 단위 내보내기(txt·마크다운, 브라우저 다운로드), (3) 휴지통(소프트 삭제 + 복원 + 영구 삭제). 가장 파급이 큰 변경은 문서 삭제의 의미를 **하드 삭제 → 소프트 삭제(휴지통)**로 바꾼 것이다. 이 때문에 "문서를 소비하는 모든 곳"이 휴지통 문서를 제외하도록 경계면을 일관되게 정리했다. 백엔드가 없으므로 모두 로컬(IndexedDB) + 순수 함수 기반이며, 스토어 추가·마이그레이션 없이 `documents` 레코드에 `trashedAt?` 선택 필드만 추가했다(기존 레코드는 필드 부재 = 정상 문서).

## 2. 작업내용

### 엔티티(document)
- `src/entities/document/model/types.ts` — `DocumentNode`에 `trashedAt?: string`(ISO) 추가. 미설정=정상.
- `src/entities/document/lib/tree.ts`(신규, 순수) — 트리 연산 단일 출처: `collectSubtreeIds`(자손 수집, cascade 공용), `selectActiveDocuments`(휴지통 제외), `selectTrashedDocuments`, `selectTrashRoots`(휴지통 목록에 표시할 루트만 — 폴더 서브트리째 삭제 시 폴더만 노출), `flattenTree`(내보내기 순서/깊이). 훅에 인라인돼 있던 `collectSubtree`를 여기로 승격해 재사용.
- `src/entities/document/api/useDocuments.ts` — SWR은 이제 **휴지통 포함 전체(raw)**를 읽고, `documents = selectActive(raw)`(소비처 노출용), `trashedDocuments = selectTrashed(raw)`를 반환. 삭제 의미 변경:
  - `deleteDocument` → **소프트 삭제**: 서브트리 전체에 `trashedAt` 설정(`dbBulkPut`). 스냅샷은 건드리지 않음(복원 대비 보존).
  - `restoreDocument`(신규) → 서브트리 전체 `trashedAt` 제거.
  - `permanentlyDeleteDocument`(신규) → 하드 삭제(`dbBulkDelete`) + `deleteSnapshotsForDocuments`. **기존 하드삭제+스냅샷 정리 로직이 여기로 이동**.

### 검색(features/search-document)
- `lib/searchDocuments.ts`(순수) + 테스트 — 쿼리·문서목록→매치. 빈/공백 쿼리=[], 대소문자 무시, DOC만 대상(결과는 열 수 있어야 함), 휴지통 방어적 제외. 본문 평문은 `snapshotText.extractPlainText` 재사용, 스니펫 생성.
- `ui/SearchPanel.tsx` — 입력창 + 결과 목록(제목/본문 스니펫), 결과 클릭 시 `onSelect`.

### 내보내기(features/export-document)
- `lib/exportDocuments.ts`(순수) + 테스트 — `documentToPlainText/Markdown`, `projectToPlainText/Markdown`(트리 순서, 폴더=헤딩 계층 h2~h6, 휴지통 제외), `safeFileName`. 평문 변환은 `extractPlainText` 재사용.
- `lib/download.ts` — Blob + `a[download]` 브라우저 다운로드(부수효과 분리).
- `ui/ExportMenu.tsx` — 모달: 현재 문서/작품 전체 × txt/마크다운.

### 휴지통(features/trash-document)
- `ui/TrashPanel.tsx` — `selectTrashRoots`로 루트만 표시, **복원** + **영구 삭제**(ConfirmModal 확인).

### 화면 연결
- `src/views/workspace/ui/WorkspacePage.tsx` — 헤더에 검색·내보내기·휴지통 토글 추가, 우측 패널(SearchPanel/TrashPanel) + ExportMenu 모달 연결. 복원 시 DOC이면 자동 선택.
- `src/widgets/binder/ui/Binder.tsx` — 삭제 확인 문구를 "되돌릴 수 없습니다"→"휴지통으로 보냅니다. 되살릴 수 있어요"로 수정(소프트 삭제 반영).

### 테스트
- 단위(vitest): `tree.test.ts`, `searchDocuments.test.ts`, `exportDocuments.test.ts` — 경계(빈 쿼리·매치 없음·중첩 폴더·휴지통 제외·빈 본문) 포함.
- e2e 신규: `e2e/trash-search-export.spec.ts` — 삭제→휴지통→복원→복귀 / 검색→선택 / 작품 전체 다운로드(`waitForEvent('download')`).
- e2e 회귀 수정: `e2e/snapshot.spec.ts`의 cascade 테스트 — 소프트 삭제 후엔 문서·스냅샷이 **보존**되고, 휴지통 **영구 삭제** 시점에 함께 정리됨을 검증하도록 갱신(스냅샷 정리 로직 이동 반영).

## 3. 주의사항

- **소프트 삭제로 바뀐 소비처(경계면)**: 문서를 읽는 모든 곳은 `useDocuments().documents`(= active만) 하나를 거치므로, 바인더·집중모드·목표합계(`sumWordCounts(documents)`)·검색이 자동으로 휴지통을 제외한다. 별도 소비처는 `WorkspacePage` 한 곳뿐임을 grep로 확인(대시보드는 문서 단어수를 읽지 않음).
- **작품 삭제 cascade는 그대로**: `useProjects.deleteProject`는 `dbGetAllByProject(documents)`로 휴지통 포함 전체를 지우므로 소프트 삭제된 문서도 함께 정리됨(edge-cases·notes cascade 테스트 통과로 확인).
- **하드 삭제/스냅샷 정리 위치**: `deleteDocument`(소프트)가 아니라 `permanentlyDeleteDocument`로 이동. 스냅샷은 소프트 삭제 시 보존되고 영구 삭제 시에만 cascade.
- **복원 시 부모 처리**: `selectTrashRoots`가 서브트리 루트만 노출하고 복원/영구삭제가 서브트리째 처리하므로, 자식만 복원돼 부모(휴지통 폴더) 아래에 고아로 남는 상황을 구조적으로 차단.
- 검색은 DOC 노드만 대상(폴더 제목은 검색 결과에서 제외 — 결과가 항상 에디터에서 열려야 하므로). 필요 시 확장 여지.
- 검증: `npm run lint`(0), `npm test`(79 passed), `npm run build`(성공), `npx playwright test`(19 passed) 모두 통과.
