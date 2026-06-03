---
name: tiptap-editor
description: "Tiptap(ProseMirror) 기반 리치 텍스트 에디터 코어, 문서 트리(바인더), 자동저장을 구현하는 스킬. 확장 세트 구성, ProseMirror JSON 저장, debounce 자동저장, 저장 상태 표시, 집중 글쓰기 UX를 다룬다. 에디터·Tiptap·ProseMirror·리치텍스트·바인더·문서트리·자동저장·집중모드·툴바 구현 작업 시 반드시 사용."
---

# Tiptap 에디터 코어 구현

스크리브너식 "문서 트리 + 리치 텍스트"의 심장부를 Tiptap(ProseMirror)으로 구현한다. 핵심은 **입문 작가가 학습 없이 바로 쓸 수 있는** 집필 경험이다.

## 확장 세트 — 최소주의
툴바가 복잡하면 진입장벽이 올라간다. **꼭 필요한 것만** 넣는다:
- StarterKit(문단/헤딩/볼드/이탤릭/리스트/인용/실행취소) 정도로 시작.
- 고급 기능(테이블, 이미지, 코드블록)은 입문 단계에서 제외하거나 기본값 뒤에 숨긴다.
- 커스텀 단축키·입력 규칙으로 "타자 흐름"을 유지(예: 마크다운식 `# ` → 헤딩).

## content 저장 — ProseMirror JSON
- `editor.getJSON()`으로 ProseMirror 문서를 JSON으로 저장한다(HTML 아님). 구조 보존·재편집·검색에 유리.
- 이 JSON 구조를 data-modeler의 `Document.content(Json)`과 합의한다. 양쪽이 같은 doc shape을 기대해야 한다.

## 자동저장 — 사용자가 의식하지 못하게
```
1. editor onUpdate → debounce(예: 800ms) → PUT /api/documents/[id]/content
2. 요청 body: { content: editor.getJSON(), wordCount }  ← API 기대 형식과 일치시킬 것
3. 저장 상태 표시: idle("저장됨") → saving("저장 중…") → saved("저장됨") / error("저장 실패, 재시도 중")
4. 실패 시: 로컬(localStorage/IndexedDB)에 임시 보관 + 재시도. 데이터 손실 방지가 최우선.
5. Snapshot은 자동저장과 분리 — 주기적(예: N분/문서 닫을 때) POST /api/documents/[id]/snapshots
```
요청 body shape은 nextjs-api의 `PUT content` 기대와 **반드시 일치**시킨다(경계면 버그 예방).

## 바인더(문서 트리) UI
- 폴더(FOLDER)/문서(DOC) 2종. 드래그로 재정렬·이동.
- 트리 이동: 낙관적 업데이트(즉시 UI 반영) 후 `PATCH /api/documents/[id]/move` 결과로 보정. 실패 시 롤백.
- 선택된 문서를 에디터에 로드. 빈 트리일 때 "첫 문서 만들기" 안내(빈 상태).

## 집중 글쓰기 UX
- 산만함 제거: 기본은 깔끔한 단일 컬럼. 단어 수는 은은하게 표시.
- 3단 패널(바인더/에디터/인스펙터) 중 인스펙터는 입문자에게 접어둔다.
- 타이핑 중 UI가 끼어들지 않게 한다(저장 표시는 미묘하게).

## 출력
- `components/editor/**`(에디터), `components/binder/**`(트리), 자동저장 훅, `_workspace/04_editor_notes.md`(확장 세트·키맵·content 스키마·자동저장 규칙 기록).

## 핵심 원칙
- **단순함이 경쟁력.** 기능을 더하기 전에 "입문 작가가 멈칫하는가?"를 묻는다.
- content 스키마/자동저장 body를 바꾸면 data-modeler·backend-engineer에 통지.
- 데이터 손실은 절대 안 된다 — 자동저장 실패 시 로컬 백업 필수.
