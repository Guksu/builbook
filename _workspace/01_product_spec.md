# 제품 스펙: builbook (웹소설 집필 에디터) — MVP-1

> 작성: team-lead 대행(product-architect 무응답으로 재할당). product-spec 스킬 기준.

## 1. 비전 & 진입장벽 전략
스크리브너의 본질(**문서 트리 + 집중 글쓰기**)만 가져오고, 입문 작가가 **가입 후 5분 안에 첫 문장**을 쓰게 한다. 모든 결정의 기준은 "이 기능이 입문 작가를 멈칫하게 하는가?" — 멈칫하게 하면 기본값 뒤로 숨기거나 백로그로 보낸다.

진입장벽을 낮추는 4가지 장치:
1. **빈 상태가 곧 행동 유도** — 작품 0개 화면은 "첫 작품 만들기" 버튼 하나로 시작.
2. **자동저장** — 저장 버튼 개념 자체를 없앤다. 사용자는 저장을 의식하지 않는다.
3. **트리 단순화** — 폴더/문서 2종뿐. 스크리브너의 코르크보드·컴파일·라벨은 MVP에서 제거.
4. **집중 모드 기본** — 작업실은 단일 컬럼 글쓰기가 중심, 부가 패널(인스펙터)은 접힌 상태로 시작.

## 2. MVP-1 범위
**포함:** 인증 / 작품(Project) CRUD / 문서 트리(바인더, Document) / Tiptap 에디터 / 자동저장.
**제외(백로그):** 인물 카드(Character), 서버 버전 기록(Snapshot), 코르크보드, 컴파일/내보내기, 협업, 라벨/상태 분류, 검색.
**단, 데이터 손실 방지용 클라이언트 로컬 백업은 MVP 포함**(자동저장 실패 시).

## 3. 정보구조 & 화면 목록
| # | 화면 | 경로 | 인증 |
|---|------|------|------|
| S1 | 랜딩 | `/` | 공개 |
| S2 | 로그인/가입 | `/login` | 공개 |
| S3 | 대시보드(작품 목록) | `/dashboard` | 필요 |
| S4 | 작품 작업실(3단 패널) | `/projects/[id]` | 필요(소유자) |

작업실 3단 패널: **① 바인더(문서 트리)** · **② 에디터(Tiptap)** · **③ 인스펙터(시놉시스/메모, 기본 접힘)**.

## 4. 화면 흐름 (빈 상태 우선)
```
S1 랜딩 ─(시작하기)→ S2 로그인 ─(성공)→ S3 대시보드
S3 (작품 0개) → 빈 상태: "아직 작품이 없어요" + [첫 작품 만들기] 버튼
   → 작품 생성 모달(제목 입력) → 생성 → S4로 이동
S3 (작품 N개) → 작품 카드 그리드 → 카드 클릭 → S4
S4 (문서 0개) → 바인더 빈 상태: [첫 문서 만들기] → 문서 생성 → 에디터 포커스
S4 (문서 선택) → 에디터에 content 로드 → 타이핑 → 자동저장
```
**빈 상태 3종**(반드시 구현): 작품 없음 / 문서 없음 / (로딩·에러).

## 5. 기능별 스펙

### F1. 인증 (Auth.js)
- 이메일 기반 + (선택) OAuth. 미인증이 S3/S4 접근 시 `/login`으로 redirect.
- 세션은 소유권 검사의 기준(`Project.ownerId === session.user.id`).

### F2. 작품(Project) CRUD
- 생성: 제목 입력(필수) → 생성 후 작업실로 이동.
- 목록: 본인 소유만, `updatedAt` 내림차순.
- 수정/삭제: 제목·설명 수정, 삭제 시 하위 문서 cascade(확인 모달).

### F3. 문서 트리(바인더, Document)
- 노드 2종: `FOLDER`(자식 포함) / `DOC`(본문 보유).
- 동작: 생성, 이름변경, 삭제(하위 cascade), **드래그 이동·재정렬**(낙관적 업데이트 → 서버 `move` 보정).
- 순환 참조(자기 자손을 부모로) 금지.

### F4. 에디터(Tiptap) + 자동저장
- 최소 확장 세트(문단/헤딩/볼드/이탤릭/리스트/인용/undo).
- content = ProseMirror JSON 저장. 단어 수 카운트.

#### 저장 상태표 (핵심 — 후속 경계면 버그 방지)
| 상태 | 트리거 | UI 표시 | 다음 전이 |
|------|--------|---------|-----------|
| `idle` | 초기/저장 완료 후 무변경 | "저장됨" (은은히) | 입력 시 → saving(debounce) |
| `saving` | 입력 후 debounce(≈800ms) 경과 → PUT | "저장 중…" | 성공 → saved / 실패 → error |
| `saved` | PUT 200 | "저장됨" | 무변경 지속 → idle |
| `error` | PUT 실패 | "저장 실패, 재시도 중" | 로컬 백업 + 재시도 → 성공 시 saved |

- **데이터 손실 방지:** `error` 시 content를 localStorage/IndexedDB에 임시 보관, 복구 시 병합.

## 6. 도메인 모델 (MVP-1 = User·Project·Document)
- **User** — Auth.js 계정. id, email, name?, image?.
- **Project** — 작품. id, title, description?, ownerId(→User), createdAt, updatedAt.
- **Document** — 바인더 노드. id, projectId(→Project), parentId?(→Document 자기참조), type(`FOLDER`|`DOC`), title, order(Int), content(Json?, Tiptap), synopsis(String?), wordCount(Int), createdAt, updatedAt.
- **[백로그] Character** — projectId, name, description?, fields(Json?).
- **[백로그] Snapshot** — documentId, content(Json), createdAt.

### 필드명 규약
전 구간 **camelCase** 통일(DB→API→프론트). 컬렉션 API 응답은 `{ items: T[] }`로 래핑.
