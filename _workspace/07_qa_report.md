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

## 다음 (Phase 4 검증 항목 예고)
- frontend 훅이 컬렉션을 `.items` unwrap 하는지.
- href/router.push 경로 ↔ 실제 page 경로 매칭(route group 접두사).
- 에디터 자동저장 body(`{ content, wordCount }`) ↔ `PUT content` 기대 일치.
