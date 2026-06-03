---
name: nextjs-frontend
description: "Next.js App Router 화면·레이아웃·라우팅과 API 연결 훅을 구현하는 스킬. page.tsx/layout.tsx, 데이터 페칭 훅(응답 shape과 1:1 일치), 빈 상태·온보딩 화면, route group·동적 세그먼트·인증 가드를 다룬다. 화면·페이지·레이아웃·라우팅·훅·대시보드·UI 화면 구현 작업 시 반드시 사용."
---

# Next.js 화면·API 연결 구현

화면을 구성하고 백엔드 API와 **정확히** 연결한다. 가장 흔한 런타임 크래시는 훅의 기대 shape과 API 실제 응답이 어긋날 때 발생한다 — 이를 원천 차단하는 것이 이 스킬의 핵심이다.

## FSD 구조 (필수 컨벤션)
프론트는 **Feature-Sliced Design**을 따른다. Next의 `app/`은 **라우팅 전용 얇은 래퍼**(`export { XPage as default } from "@views/x"`)로 두고, 화면 로직은 `src/` 레이어에 둔다. 서버 인프라(`lib/`, `app/api`, `middleware`)는 FSD 대상이 아니므로 루트에 그대로 둔다.

```
src/  app/(providers) · views/(페이지조합) · widgets/(binder·editor) ·
      features/(autosave·reorder 등) · entities/(project·document: model+api) · shared/(ui·api)
```
- **import 규칙(하위만 참조):** views→widgets→features→entities→shared. 같은 레이어 간 교차 import 지양.
- **별칭:** `@app/* @views/* @widgets/* @features/* @entities/* @shared/*` (tsconfig paths). 서버 코드는 `@/lib/*` 유지.
- **슬라이스 내부 segment:** `ui/`(컴포넌트) · `model/`(상태·타입·훅) · `api/`(데이터 페칭). 각 슬라이스는 `index.ts` 배럴로 공개 API만 노출.
- 새 기능은 "어느 레이어/슬라이스인가"부터 정한다 — 도메인 데이터=entities, 사용자 시나리오=features, 조합 UI=widgets, 페이지=views.

## 경계면 정합성 (절대 준수)
- 훅의 fetch 타입은 `_workspace/03_api_contract.md`의 응답 shape과 **1:1 일치**. 추측 금지.
- **컬렉션 응답은 `{ items: T[] }`** 이므로 훅에서 반드시 `.items`를 unwrap한 뒤 반환한다. 제네릭으로 배열을 캐스팅하면 컴파일은 통과하지만 런타임에 `.filter is not a function`이 난다.
- 필드명은 API의 camelCase를 그대로 사용. 임의 변환 금지.
- 모든 `href`·`router.push()`·`redirect()`는 실제 존재하는 `app/` page 경로와 매칭. route group `(group)`은 URL에서 제거됨을 고려.

```ts
// hooks/useProjects.ts — 올바른 unwrap
export function useProjects() {
  return useSWR<Project[]>("/api/projects", async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("불러오기 실패");
    const data = await res.json();   // { items: Project[] }
    return data.items;               // ← unwrap. 이걸 빼면 배열이 아님
  });
}
```

## 화면 구성
- **빈 상태부터 구현.** 작품 0개 / 문서 빈 화면에서 무엇을 보여줄지가 진입장벽을 결정한다. "첫 작품 만들기" 같은 명확한 단일 행동 유도.
- 모든 데이터 화면에 로딩·에러·빈 상태 3가지를 처리.
- 화면 목록(스펙 기준): 랜딩, 인증, 대시보드(작품 목록), 작품 작업실(3단 패널: 바인더/에디터/인스펙터), 인물 카드.
- 작업실은 입문자에게 인스펙터를 접어 단순하게 시작.

## 라우팅
- route group으로 인증 영역 분리(예: `(auth)`, `(workspace)`). group은 URL에 안 나타남.
- 동적 세그먼트: `app/projects/[id]/page.tsx`. 잘못된 id는 `notFound()`.
- 인증 가드: 미인증 시 로그인으로 redirect. 보호 레이아웃에서 세션 확인.

## 디자인 적용
- `wanted-design-system` 스킬이 구축한 **원티드 토큰 + Tailwind**와 토큰 기반 기본 컴포넌트(`components/ui/**`)를 사용한다.
- 스타일링은 **Tailwind 유틸리티**로 하고, 색·간격·폰트는 토큰 유틸(`bg-primary`, `text-fg`, `p-16` 등)로만 표현한다. hex/px 하드코딩 금지.

## 출력
- `app/**/page.tsx`, `app/**/layout.tsx`, `hooks/use*.ts`, `_workspace/05_frontend_notes.md`(라우트 맵 + 훅↔API 매핑표).

## 핵심 원칙
- API shape이 불명확하면 backend-engineer에 확인(추측 금지).
- 라우트 맵을 문서화해 깨진 링크(404)를 사전 방지.
- "타입 통과"가 아니라 "런타임에 이 shape이 실제로 오는가"로 생각한다.
