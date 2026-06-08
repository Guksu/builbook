# 통합 정합성 검증 리포트

> 검증: team-lead(qa-inspector 대행). integration-qa 스킬. Phase 3(백엔드) 시점 — 프론트 미구현이라 backend↔contract↔schema 교차 검증 중심. Phase 4 후 backend↔frontend 경계면 재검증 예정.

## ✅ 통과 (Phase 3 백엔드)
- **응답 shape ↔ 계약 일치**: 컬렉션(`/api/projects`, `.../documents`)은 `{ items }` 래핑, 단일 리소스는 객체 그대로, DELETE는 204. `03_api_contract.md`와 라우트 코드 일치.
- **필드명 camelCase 일관**: schema.prisma ↔ 라우트 응답 ↔ 계약 타입 모두 camelCase(Project/Document). (Auth.js Account 모델의 snake_case 필드는 어댑터 내부용·API 미노출 → 허용.)
- **소유권 검사**: 모든 보호 라우트가 세션 확인 → 소유권(`ownerId === user.id`) 확인. 누락 없음.
- **순환 참조 차단**: `move`에서 `isDescendantOrSelf`로 자기/자손을 부모 지정 시 409. ✓
- **자동저장 경량화**: `PUT content`는 content/wordCount만 갱신, 응답은 `{ ok, updatedAt }`. ✓
- **경로 정합**: 라우트 파일 경로(`app/api/...`)가 계약 경로와 1:1.

## 🔧 발견 → 수정 완료
- **[경계면] Auth.js 세션 `user.id` 타입 누락** — `lib/api.ts`·`lib/auth.ts`가 `session.user.id`를 쓰는데 기본 타입에 id 없음 → TS 오류 위험. `types/next-auth.d.ts` 모듈 증강 추가로 해결.

## ⚠️ 미검증 / 사용자·후속 액션 필요
- **타입체크·빌드**: `node_modules` 미설치로 `tsc`/`next build` 미실행. `npm install` 후 `npm run build`로 최종 확인 필요.
- **DB 연결**: `.env`의 `DATABASE_URL` 설정 + `npx prisma migrate dev --name init` 필요(현재 마이그레이션 미생성).
- **인증 프로바이더**: GitHub OAuth(`AUTH_GITHUB_ID/SECRET`) 또는 대체 로그인 설정 필요. 미설정 시 로그인 동작 불가.
- **Prisma Json 타입**: `content`(z.any → Prisma Json) 런타임은 정상, install 후 타입 경고 여부 확인.

## ✅ 통과 (Phase 4 프론트 + 에디터)
- **훅 ↔ API shape**: `useProjects`/`useDocuments`가 컬렉션을 `data?.items ?? []`로 unwrap → 배열 보장(`.filter is not a function` 차단). ✓
- **라우팅 정합**: `href`/`router.push`(`/dashboard`, `/projects/[id]`, `/login`)가 실제 page 파일과 매칭. route group 미사용으로 접두사 이슈 없음. middleware matcher와 일치. ✓
- **자동저장 경계면**: 에디터 `schedule(getJSON(), wordCount)` → `useAutosave` payload `{ content, wordCount }` → `PUT content` 기대와 일치. ✓
- **DELETE 204 처리**: fetcher가 204에서 `res.json()` 호출 안 함(null 반환). ✓

## 🔧 발견 → 수정 완료 (Phase 4)
- **[런타임 경계면] 미들웨어 Edge에서 Prisma 사용 불가** — `middleware`가 `lib/auth`(PrismaAdapter) import 시 Edge 런타임 크래시. → NextAuth v5 표준 분리(`auth.config.ts` edge-safe + JWT 세션 전략)로 수정. 미들웨어는 authConfig만 사용.
- **[타입] 세션/JWT `id` 누락** — `types/next-auth.d.ts`에 Session·JWT 증강 추가.
- **[타입] `isDescendantOrSelf`의 `where:{id:cursor}` cursor가 string|null** → 루프 내 string narrowing으로 수정(TS7022 해결).

## ✅ 빌드 검증 (실측)
- `npm install`(466 pkg) → `prisma generate` → `npx tsc --noEmit` **타입 오류 0** → `npm run build` **성공**.
- 결과: 7 페이지(`/`, `/login`, `/dashboard`, `/projects/[id]` + API 7개) 컴파일·린트·타입체크 통과, 정적 생성 7/7, 미들웨어 87.5kB edge 번들.

## ⚠️ 잔여 (사용자 액션)
- 실행: `.env`에 실제 `DATABASE_URL`·`AUTH_SECRET`·(GitHub OAuth) 설정 → `npx prisma migrate dev --name init` → `npm run db:seed` → `npm run dev`.
- 현재 `.env`는 빌드용 placeholder(gitignore로 미커밋). 실제 값으로 교체 필요.
- 미구현(백로그/refinement): 루트 영역/빈 폴더 드롭, Character/Snapshot.

## ✅ 추가 구현 (FSD 리팩터링 후)
- **FSD 구조 전환**: 프론트를 `src/`(views·widgets·features·entities·shared)로 재배치. Next `app/`은 라우팅 전용. `next build` 성공(동일 산출물)·tsc 0.
- **바인더 드래그 재정렬**: `features/reorder-document`(순수 `planReorder`) + 네이티브 HTML5 DnD. 폴더 위 드롭=안으로(into), 문서 위 드롭=앞에(before, 형제 그룹 0..n 정수 재인덱싱). 순환(자기/자손) 이동은 client(planReorder) + server(move API 409) 이중 차단. `next build` 성공·tsc 0.
- **시놉시스 편집**: `widgets/inspector` + entity `updateSynopsis`(PATCH documents). 인스펙터 Textarea, 문서 전환 시 리셋(key), blur 시 변경분만 저장. `next build` 성공·tsc 0.
- **다크 테마**: `next-themes`(attribute=class, system) + `globals.css`의 `.dark` 시맨틱 변수 오버라이드(원티드 neutral 다크 스케일) → 토큰 유틸 전체 자동 반영. `features/toggle-theme` 토글(대시보드·작업실 헤더), `<html suppressHydrationWarning>`로 FOUC 방지. `next build` 성공·tsc 0.

## 🔄 로컬 우선(local-first) 전환 — 위 백엔드/인증 검증은 SUPERSEDED
사용자 결정으로 **로그인·백엔드·Postgres/Prisma 전부 제거**, 데이터는 IndexedDB(`idb`)로 저장. 따라서 위 "Phase 3 백엔드"·인증 관련 통과/수정 항목은 더 이상 적용되지 않는다(코드 삭제됨).
- **제거**: `app/api/**`, `lib/{prisma,auth,api,documents}`, `auth.config.ts`, `middleware.ts`, `types/next-auth.d.ts`, `prisma/`, `src/shared/api`, login 화면.
- **신설/변경**: `src/shared/db`(idb 래퍼), `entities/*/api` 훅을 IndexedDB 기반으로 재작성, `useAutosave(documentId, projectId)`.
- **경계면 검증(신규)**: 훅↔저장소 — useProjects/useDocuments가 idb store와 일치, 삭제 시 하위 cascade 수동 구현, reorderSiblings가 parentId+order 통일. 라우팅 — /login·/api 제거 후 깨진 링크 없음(landing→/dashboard, 보호 미들웨어 제거). 
- **빌드/런타임 검증**: tsc 0, `next build` 성공(4 라우트). dev 서버: / 200, /dashboard 200(리다이렉트 없음), /projects/[id] 200, /login 404, /api/projects 404.
- **한계**: 데이터가 단일 브라우저 IndexedDB에만 — 기기 간 동기화·백업 없음(향후 서버 도입 시 백엔드 하네스 재가동).

## ✅ E2E 테스트 (Playwright, 실제 브라우저)
`e2e/`에 Chromium 기반 E2E 5개 — 로컬 우선 앱이라 실제 브라우저로 IndexedDB·자동저장·영속성까지 검증. `npm run test:e2e`. 각 테스트는 깨끗한 컨텍스트(빈 IndexedDB)에서 독립 실행.
| 스펙 | 검증 |
|------|------|
| landing | 히어로 렌더 + "시작하기"→/dashboard |
| project | 빈 상태→작품 생성→작업실 이동→**새로고침 후 유지(IndexedDB)** |
| document(집필) | +문서(prompt)→에디터 입력→debounce 자동저장→**새로고침 후 내용 유지** |
| document(삭제) | ✕→확인 모달→바인더에서 제거 |
| theme | 토글이 html 테마 클래스 전환 |

결과: **5 passed**. (drag 재정렬은 네이티브 DnD라 E2E 신뢰도 낮아 제외 — planReorder 순수 로직으로 대체 검증 권장.)

## ✅ 엣지케이스 보강 (여러 각도 점검)
- **작품 중복 생성(IME)**: handleCreate 동기 ref 가드 + Enter isComposing 가드. 회귀 `create-guard`(Enter 2회·더블클릭).
- **공백 제목 방어**: createProject/createDocument/renameDocument trim, 빈 값 no-op. Binder prompt도 trim. 회귀 `edge-cases`.
- **작품 삭제 cascade**: deleteProject가 해당 작품 문서까지 함께 삭제(고아 방지). 대시보드 카드 ✕+ConfirmModal. 회귀 `edge-cases`.
- **order 충돌**: createDocument의 order를 SWR 스냅샷이 아닌 IndexedDB 최신 형제 max+1로 계산(빠른 연속 생성 시 충돌 방지).
- **dev/build .next 충돌(운영 교훈)**: dev 서버 구동 중 `npm run build` 금지 — `.next` 손상으로 전 라우트 500. build 전 dev 정지.
- 전체 E2E **9 passed**, tsc 0, next build 성공.

---

## AI 문답 도메인 — 모델 교체·파라미터 변경 검증 (2026-06-09)

> 검증: qa-inspector. integration-qa 스킬. 변경: MODEL_ID=onnx-community/Qwen2.5-0.5B-Instruct, MODEL_DTYPE="q4" 단일 상수, GEN에 repetitionPenalty 1.15 + temperature 0.6. **경계면 교차 비교만 수행(기능 재구현 없음).** 실제 브라우저 추론 품질(코히런스/한국어)은 정적 검증 범위 밖 — 런타임 확인 필요.

### ✅ 통과
1. **GEN 계약 ↔ worker generate 1:1 매핑** — `models.ts:33-39` GEN(maxNewTokens/doSample/temperature/topP/repetitionPenalty) → `worker.ts:127-131`에서 max_new_tokens/do_sample/temperature/top_p/repetition_penalty로 정확히 매핑. 누락·오타·미사용 키 없음. (GEN의 5개 키 전부 소비, transformers.js snake_case 파라미터명 정확.)
2. **dtype SSOT** — `MODEL_DTYPE="q4"` 단일 상수(`models.ts:23`)만 존재. `modelDtype` 함수 잔재 0건(grep). worker는 `MODEL_DTYPE`만 import(`worker.ts:13`)해 `dtype:`에 사용(`worker.ts:65`). 코드상 `q4f16` 참조 0건 — 남은 `q4f16` 히트(`models.ts:8,20,22`)는 전부 주석(이력·금지 경고)이라 동작 무관.
3. **메시지 계약 SSOT** — worker↔메인 타입이 `messages.ts` 한 곳에서만 정의. worker.ts(`:14`)·engine.ts(`:4`)·useAiChat(via `@shared/ai`)이 동일 타입 import, 리터럴 중복 정의 없음. worker가 실제 post하는 메시지(ready/progress/token/done/error/aborted)가 FromWorker 유니온과 전부 일치, engine.ts switch가 6종 모두 처리(`:25-44`). ToWorker(load/generate/abort)도 worker onmessage switch(`:150-160`)와 일치.
4. **UI 소비 일치** — `AiAssistant.tsx`는 `UseAiChat` 공개 API(status/percent/messages/streaming/error/enable/send/stop/retry)만 소비(`:14`), 엔진 내부 비접근. `MODEL_LABEL`·`MODEL_APPROX_MB`는 `@shared/ai` 배럴(`:5`)에서 정상 import. 표시 경로(`:48-52`): 790 < 1000 → "약 790MB" 분기 정확. (≥1000일 때만 GB 변환.)
5. **별칭/import** — tsconfig paths에 `@shared/* @features/* @widgets/*` 모두 등록. 모든 AI import 경로 해석됨.
6. **타입체크** — `npx tsc --noEmit` → EXIT=0, 오류 0건.

### 결론
**경계면 통과.** GEN↔worker, dtype SSOT, messages 계약, UI↔훅 공개 API, 별칭, 타입체크 모두 정합. 불일치 0건. 추론 품질은 런타임 검증 영역.

---

## AI 문답 도메인 — Qwen3-0.6B 교체 검증 (2026-06-09)

> 검증: qa-inspector. integration-qa 스킬. 변경: MODEL_ID=onnx-community/Qwen3-0.6B-ONNX, MODEL_LABEL="Qwen3 0.6B", MODEL_APPROX_MB=919, ENABLE_THINKING=false 신규, GEN에 topK 20 신규(temperature 0.7/topP 0.8/repetitionPenalty 1.1). **경계면 교차 비교만(기능 재구현 없음).** 실제 추론 품질·thinking 비활성 실동작(빈 <think> 삽입)은 런타임 확인 영역.

### ✅ 통과
1. **GEN 계약 ↔ worker generate 1:1 매핑** — `models.ts:43-50` GEN 6개 키 → `worker.ts:127-132` 정확 매핑: maxNewTokens→max_new_tokens, doSample→do_sample, temperature, topP→top_p, **topK→top_k(신규)**, repetitionPenalty→repetition_penalty. 누락·오타·미사용 키 없음. 신규 topK→top_k(`worker.ts:131`) 확인.
2. **ENABLE_THINKING 연결 무결** — `models.ts:38` export → `worker.ts:13` import → `worker.ts:137` tokenizer_encode_kwargs.enable_thinking 전달. import 누락/오타 없음, 경로 끊김 없음.
3. **dtype SSOT** — MODEL_DTYPE="q4" 단일 상수 유지(`models.ts:25`). q4f16 코드 참조 0건(주석 3건은 이력·금지 경고). worker는 MODEL_DTYPE만 import.
4. **메시지 계약 SSOT 불변** — messages.ts ToWorker/FromWorker 미변경. generate payload `{ id, messages: ChatTurn[] }` 그대로(`messages.ts:13`). 이번 변경이 메시지 타입 미접촉 — engine.ts/useAiChat 경계 영향 없음.
5. **UI 소비** — AiAssistant.tsx 미변경. MODEL_LABEL/MODEL_APPROX_MB(919) `@shared/ai` 배럴 import 유지. 919<1000 → "약 919MB" 분기 정확. useAiChat 공개 API만 소비.
6. **타입체크** — `npx tsc --noEmit` → EXIT=0, 오류 0건. (참고: generate 옵션 객체는 `as Record<string, unknown>` 캐스팅 — 추가 kwarg를 타입 우회로 전달. 정합성은 통과하나 transformers.js 런타임이 top_k/tokenizer_encode_kwargs를 실제 수용하는지는 정적 검증 밖.)

### 결론
**경계면 통과.** GEN↔worker(topK→top_k 포함), ENABLE_THINKING 경로, dtype SSOT, messages 계약 불변, UI 표기(919MB), 타입체크 모두 정합. 불일치 0건. thinking 비활성 실동작·추론 품질은 런타임 검증 영역.
