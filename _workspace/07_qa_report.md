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
