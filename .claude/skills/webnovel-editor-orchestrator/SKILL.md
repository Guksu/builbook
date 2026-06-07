---
name: webnovel-editor-orchestrator
description: "웹소설 집필 에디터 사이트(스크리브너 레퍼런스, 진입장벽 낮춤, Next.js App Router + local-first IndexedDB + Tiptap + 원티드 디자인 시스템, 백엔드 없음)를 빌드하는 에이전트 팀을 조율하는 오케스트레이터. 제품 기획·로컬 데이터 모델·에디터·프론트·디자인 적용·브라우저 온디바이스 AI 문답(Transformers.js/Web Worker)·QA를 단계적으로 진행. 에디터 사이트 만들기·기능 추가·화면 구현·AI 문답/Transformers.js/모델 다운로드/토큰 스트리밍 기능 추가 시 사용. 후속 작업: 결과 수정, 부분 재실행, 업데이트, 보완, 다시 실행, 이전 결과 개선, 'OO 기능만 다시', '에디터/대시보드/AI 패널만 수정' 요청 시에도 반드시 이 스킬을 사용."
---

# 웹소설 에디터 빌드 오케스트레이터

스크리브너를 레퍼런스로 하되 **진입장벽이 낮은** 웹소설 집필 에디터를 빌드하는 에이전트 팀을 조율한다.

**스택(local-first):** Next.js(App Router) · **IndexedDB(idb)** 클라이언트 저장 · Tiptap(ProseMirror) · Tailwind+원티드 토큰 · **백엔드·DB·로그인 없음**. AI 문답은 **Transformers.js를 Web Worker에서 구동하는 브라우저 온디바이스 추론**(서버/SSE 없음, postMessage 스트리밍).

> 휴면: `backend-engineer`·`data-modeler`(+`nextjs-api`·`prisma-data-model`)는 local-first 전환으로 기본 미사용. 데이터 계층은 `src/shared/db`(idb) + entities 훅(SWR). 서버 도입(예: 클라우드 LLM SSE) 시에만 재가동.

## 실행 모드: 에이전트 팀 + Phase별 팀 재구성

빌드가 자연스럽게 단계로 나뉘고(기반 설계 → 백엔드 → 프론트/에디터 → 통합 QA) 단계마다 다른 전문가 조합이 필요하다. 세션당 한 팀만 활성이므로, 각 Phase 종료 시 `TeamDelete` 후 다음 Phase 팀을 `TeamCreate`한다. 이전 산출물은 `_workspace/`에 보존되어 새 팀이 Read로 접근한다. QA는 가이드 원칙대로 **각 모듈 완성 직후 점진 실행**한다.

## 에이전트 구성

| 팀원 | 타입 | 역할 | 스킬 | 출력 |
|------|------|------|------|------|
| product-architect | 커스텀 | 제품 스펙·IA·진입장벽 UX | product-spec | `_workspace/01_product_spec.md` |
| editor-engineer | 커스텀 | Tiptap 코어·바인더·자동저장 | tiptap-editor | `src/widgets/editor/**`, `src/features/autosave-document/**` |
| frontend-engineer | 커스텀 | 화면·라우팅·연결 훅·entities(idb 훅) | nextjs-frontend, wanted-design-system | `app/**`, `src/views/**`, `src/entities/**` |
| design-system-specialist | 커스텀 | 원티드 토큰·기본 컴포넌트·검수 | wanted-design-system | `app/globals.css`, `src/shared/ui/**` |
| **ai-inference-engineer** | 커스텀 | 브라우저 온디바이스 AI 추론(Transformers.js·Web Worker·스트리밍) | **client-ai-inference** | `src/shared/ai/**`, `src/features/ai-chat/**`, `_workspace/08_ai_inference_notes.md` |
| qa-inspector | general-purpose | 경계면 통합 정합성 검증 | integration-qa | `_workspace/07_qa_report.md` |
| ~~data-modeler~~ / ~~backend-engineer~~ | 커스텀 | (휴면) Prisma·API — local-first에서 미사용, 서버 도입 시 재가동 | prisma-data-model / nextjs-api | — |

> 모든 Agent/TeamCreate 호출에 `model: "opus"`를 명시한다. local-first 빌드에서 데이터 모델은 별도 백엔드 Phase 없이 frontend-engineer가 `src/shared/db`(idb) + entities 훅으로 처리한다.

## 워크플로우

### Phase 0: 컨텍스트 확인 (후속 작업 지원)
1. `_workspace/` 존재 여부 확인.
2. 실행 모드 결정:
   - **미존재** → 초기 빌드. Phase 1로.
   - **존재 + 부분 수정 요청**(예: "에디터 자동저장만 고쳐") → 부분 재실행. 해당 에이전트만 단독(서브 에이전트 또는 1인 팀) 호출하고, 프롬프트에 이전 산출물 경로를 포함해 기존 결과를 읽고 수정하게 한다. 변경이 경계면에 닿으면 qa-inspector를 이어서 호출.
   - **존재 + 새 제품 입력** → 새 빌드. 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동 후 Phase 1.

### Phase 1: 준비
1. 사용자 입력 분석 — 제품 컨셉, 이번 작업 범위(전체 빌드 / 특정 기능).
2. `_workspace/` 생성(초기) 또는 보관 이동 후 재생성(새 빌드).
3. 스택 결정 사항을 `_workspace/00_input/decisions.md`에 기록(Next.js 풀스택, Postgres+Prisma, Auth.js, Tiptap, 원티드 DS `@wanteddev/wds`).
4. **MVP-1 범위 명시**: 문서 트리 + 에디터 + 자동저장(User·Project·Document만). Character·Snapshot은 백로그 — 각 에이전트 프롬프트에 이 범위를 전달해 과잉 구현을 막는다.

### Phase 2: 기반 설계 (팀)
**실행 모드:** 에이전트 팀

1. `TeamCreate(team_name: "foundation", members: [product-architect, data-modeler, design-system-specialist], model: "opus")`.
2. `TaskCreate`:
   - 제품 스펙 작성 (product-architect)
   - Prisma 스키마 설계 (data-modeler, depends_on: 제품 스펙 — 단 도메인 모델 공유로 조기 착수 가능)
   - 원티드 토큰·기본 컴포넌트 구축 (design-system-specialist, 독립 — 조기 착수)
3. 팀원 자체 조율: product-architect가 도메인 모델을 data-modeler에 SendMessage → data-modeler가 확정 스키마를 backend가 쓸 수 있게 `02_data_model.md`에 기록. design-system-specialist는 `wanted-tokens.md` 검증부터.
4. 완료 후 `TeamDelete`.

### Phase 3: 백엔드 + 점진 QA (팀)
**실행 모드:** 에이전트 팀

1. `TeamCreate(team_name: "backend", members: [backend-engineer, qa-inspector], model: "opus")`.
2. backend-engineer가 `02_data_model.md`·`01_product_spec.md`를 Read → API 구현 + `03_api_contract.md` 작성.
3. **점진 QA**: 각 엔드포인트 그룹(projects → documents → characters) 완성 직후 qa-inspector가 즉시 해당 API의 응답 shape을 검증하고(아직 프론트 없으면 contract 문서 기준), 불일치를 backend-engineer에 SendMessage.
4. 완료 후 `TeamDelete`.

### Phase 4: 프론트 + 에디터 + 검수 (팀)
**실행 모드:** 에이전트 팀

1. `TeamCreate(team_name: "frontend", members: [editor-engineer, frontend-engineer, design-system-specialist, qa-inspector], model: "opus")`.
2. 팀원 자체 조율:
   - editor-engineer: Tiptap 에디터·바인더·자동저장 구현. 자동저장 body를 `03_api_contract.md`의 `PUT content`와 일치.
   - frontend-engineer: 화면·라우팅·훅 구현. 훅 타입을 `03_api_contract.md`와 1:1 일치, 컬렉션은 `.items` unwrap.
   - design-system-specialist: 토큰/컴포넌트 적용 검수, 하드코딩 적발.
   - qa-inspector: 각 화면·훅 완성 직후 경계면 교차 검증(훅↔API shape, 링크↔라우트, 자동저장 body). 발견 즉시 양쪽에 통지.
3. 레이아웃 경계(3단 패널)는 editor-engineer ↔ frontend-engineer가 SendMessage로 합의.
4. 완료 후 `TeamDelete`.

### Phase 5: 최종 통합 QA & 정리
**실행 모드:** 서브 에이전트(qa-inspector 1인)

1. qa-inspector가 전체 코드를 가로질러 최종 통합 정합성 검증 → `07_qa_report.md` 완성(통과/실패/미검증).
2. 실패 항목이 있으면 해당 에이전트를 부분 재호출(Phase 0 부분 재실행 경로)하여 수정 → 재검증(최대 2회 루프).
3. `_workspace/` 보존. 사용자에게 결과 요약(완성 범위·실행 방법·미해결/추정 항목, 특히 디자인 토큰의 `[추정]` 값 검증 필요 여부) 보고.

## AI 문답 기능 빌드 (Transformers.js 온디바이스)

전체 사이트 빌드와 독립적으로 실행될 수 있는 add-on 도메인. "AI 문답·Transformers.js·모델 다운로드·스트리밍 사이드바" 요청 시 이 흐름을 쓴다.

**실행 모드:** 에이전트 팀 (`ai-build`). 기존 `_workspace/01_product_spec.md`가 있으면 Read해 제품 톤을 맞춘다.

1. **스펙(product-architect)** — AI 문답의 진입장벽 낮춤 UX 정의: "기능 사용" 게이팅 카피, 다운로드 진행 표현, 사이드바 배치, 빈/로딩/에러/생성 상태, 모델 선택지 트레이드오프(한국어 품질 vs 다운로드 크기). → `_workspace/01_product_spec.md` 보강.
2. **엔진(ai-inference-engineer)** — `client-ai-inference` 스킬로 `src/shared/ai/{worker,engine,messages,models}.ts` + `src/features/ai-chat`(상태 훅) 구현. 메시지 계약(SSOT)·게이팅·진행률·스트리밍·취소·엣지케이스. `@huggingface/transformers` 설치. → `_workspace/08_ai_inference_notes.md`.
3. **UI(frontend-engineer + design-system-specialist)** — `src/widgets/ai-assistant` 사이드바 패널을 `useAiChat`만 소비해 구성. 워크스페이스 레이아웃(`src/views/workspace`)에 패널 토글로 결합. 진행 바·버튼·말풍선은 `src/shared/ui` 토큰 컴포넌트로.
4. **점진 QA(qa-inspector)** — worker↔메인 메시지 타입 일치(`messages.ts` SSOT 양쪽 import), 상태 누락(멈춘 UI) 여부, 게이팅 우회(자동 다운로드) 여부, 별칭 경로(`@shared/ai`·`@features/ai-chat`·`@widgets/ai-assistant`) tsconfig 등록 여부를 교차 검증. → `07_qa_report.md` 보강.

**경계면 핵심:** Worker↔메인 메시지 타입은 `src/shared/ai/messages.ts` 한 곳에서만 정의하고 양쪽이 import한다(리터럴 중복 금지). UI는 엔진 내부가 아니라 `useAiChat`의 공개 API만 소비한다.

## Phase 종료 시 커밋 & 푸시 (기본 — 사용자가 직접 커밋하면 생략)

> **사용자가 "커밋은 내가 한다"고 지시하면, 오케스트레이터는 커밋·푸시를 하지 않고 변경된 파일만 남긴 채 작업 요약을 보고한다.** 아래 정책은 사용자가 커밋을 위임한 경우에만 적용한다.


각 Phase가 **완전히 끝날 때마다**(팀원 전원 완료 + TeamDelete 후) 그 Phase 산출물을 커밋하고 push한다. 단계별로 히스토리를 남겨 추적·롤백을 쉽게 하기 위함이다.

- **타이밍:** Phase 중간(팀원이 파일을 쓰는 중)에는 커밋하지 않는다 — 반쯤 쓰인 파일을 캡처할 위험. 반드시 해당 Phase의 모든 쓰기가 끝난 뒤 커밋한다.
- **브랜치:** 이 프로젝트는 사용자 요청에 따라 `main`에 직접 커밋·푸시한다.
- **절차:** `git add -A` → `git commit` → `git push origin main`. 커밋 실패(충돌 등) 시 사용자에게 보고하고 임의로 force push 하지 않는다.
- **커밋 메시지:** `feat: Phase N — {요약}` 또는 `chore:` 형식. 본문 마지막에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **메시지 예시:** `feat: Phase 2 기반 설계 (제품 스펙·Prisma 스키마·원티드 토큰/Tailwind)`

## 데이터 흐름
```
01_product_spec ─┬─→ 02_data_model ─→ prisma/schema ─→ 03_api_contract ─┬─→ hooks (frontend)
                 │                                                       └─→ editor 자동저장 body
                 ├─→ editor UX 요구 → editor-engineer
                 └─→ 화면 흐름 → frontend / design-system
06_design_system (토큰) ─→ frontend + editor UI
모든 코드 ─→ qa-inspector 교차검증 ─→ 07_qa_report
```

## 에러 핸들링
| 상황 | 전략 |
|------|------|
| 팀원 1명 실패 | 리더가 유휴 알림 감지 → SendMessage로 상태 확인 → 재시작 또는 작업 재할당 |
| 팀원 과반 실패 | 사용자에게 알리고 진행 여부 확인 |
| 스키마/contract 불일치 | 출처(파일:라인) 병기, 임의 삭제 금지. 양쪽 에이전트에 통지 후 합의 |
| QA 무한 루프 | 수정-재검증 최대 2회, 이후 미해결 항목을 리포트에 명시하고 진행 |
| 디자인 토큰 검증 불가(네트워크 차단) | 추정값 사용 + "검증 필요" 명시, 사용자에게 보고 |
| 타임아웃 | 현재까지 산출물로 진행, 미완료 부분 리포트에 명시 |

## 테스트 시나리오

### 정상 흐름
1. 사용자: "웹소설 에디터 사이트 만들어줘" (초기 빌드).
2. Phase 1: `_workspace/` 생성, 스택 결정 기록.
3. Phase 2: foundation 팀 → 스펙·스키마·토큰 생성.
4. Phase 3: backend 팀 → API + contract, 점진 QA 통과.
5. Phase 4: frontend 팀 → 화면·에디터·디자인 적용, 경계면 검증.
6. Phase 5: 최종 QA 리포트 → 결과 요약 보고.
7. 예상: 빌드 가능한 Next.js 프로젝트 골격 + `_workspace/01~07` 산출물.

### 에러 흐름
1. Phase 4에서 frontend-engineer의 훅이 컬렉션을 `.items` unwrap 안 함.
2. qa-inspector가 화면 완성 직후 교차 검증으로 적발 → frontend-engineer + backend-engineer에 `파일:라인 + 수정 방법` 통지.
3. frontend-engineer가 unwrap 추가 → qa-inspector 재검증 통과.
4. 만약 2회 수정 후에도 미해결이면 `07_qa_report.md`에 "미해결: 해당 훅 shape 불일치" 명시하고 진행.
