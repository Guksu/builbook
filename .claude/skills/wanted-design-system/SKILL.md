---
name: wanted-design-system
description: "원티드 디자인 토큰(컬러·스페이싱·타이포)을 Tailwind에 매핑해 적용하는 스킬. Pretendard 폰트, CSS 변수 SSOT, tailwind.config theme.extend, 토큰 기반 자체 컴포넌트(버튼/인풋/카드/모달)를 Tailwind로 직접 구현, 디자인 일관성 검수를 다룬다. 원티드 디자인 시스템·디자인 토큰·테마·Tailwind 테마·UI 컴포넌트·Pretendard 폰트·디자인 일관성 검수 작업 시 반드시 사용. 단순 CSS 한 줄 수정에는 쓰지 않음."
---

# 원티드 디자인 토큰 + Tailwind 적용

원티드의 **디자인 토큰(값)** 을 Tailwind 테마로 가져와 쓰고, **컴포넌트는 Tailwind로 직접 만든다.** 원티드의 컴포넌트 패키지(`@wanteddev/wds`)는 **사용하지 않는다** — 토큰만 차용한다. 이 덕분에 GitHub Packages 인증이 필요 없다(토큰 값은 공개 소스에서 추출됨, Pretendard는 공개 CDN).

> 실제 토큰 값(원티드 공개 소스에서 추출한 컬러 팔레트·스페이싱) + Pretendard 로드 + globals.css/tailwind.config 코드는 `references/wanted-tokens.md` 참조.

## 워크플로우

### 1단계: 폰트 (Pretendard)
원티드 기본 폰트 Pretendard를 공개 CDN(`@import`) 또는 `pretendard` npm + `next/font/local`로 로드한다. fallback 스택에 한글 시스템 폰트(Apple SD Gothic Neo/Noto Sans KR)를 포함한다.

### 2단계: 토큰 → CSS 변수 (SSOT)
`references/wanted-tokens.md`의 `:root` 블록을 `app/globals.css`에 넣는다. 구조는 **원시 토큰(원티드 실제 hex) → 시맨틱 별칭(역할)** 2단계다. 컴포넌트는 시맨틱 별칭(`--color-primary` 등)을 쓰고, 원시값을 직접 참조하지 않는다 — 역할이 바뀌어도 별칭만 고치면 되기 때문이다.

### 3단계: Tailwind 매핑
`tailwind.config`의 `theme.extend`가 CSS 변수를 가리키게 한다(레퍼런스 7절). **CSS 변수가 원본, Tailwind는 별칭.** 두 곳에 값을 중복 정의하면 어긋나므로, Tailwind에는 `var(--...)`만 넣는다. Tailwind v4면 `@theme` 블록 사용.

### 4단계: 토큰 기반 컴포넌트 (Tailwind로 직접 구현)
Button(primary/secondary/ghost), Input, Textarea, Card, Modal, Dropdown, Toast 등을 Tailwind 유틸리티로 만든다. 색·간격·폰트는 반드시 토큰 유틸리티(`bg-primary`, `text-fg`, `p-16` 등)로만 표현한다. 진입장벽 낮은 제품이므로 친근하고 단순하게, 접근성 기본(대비·포커스 링·키보드)을 지킨다.

### 5단계: 일관성 검수
다른 에이전트 코드에서 토큰을 우회한 하드코딩을 Grep으로 적발한다: 인라인 hex(`#[0-9a-fA-F]{3,6}`), 임의 `\d+px`(스페이싱 토큰 우회), 직접 `font-family` 선언, `style={{...}}`의 색/간격. 토큰 유틸리티로 교체하거나 해당 에이전트에 수정 요청한다.

## 핵심 원칙
- **토큰만 차용, 컴포넌트는 자체 구현.** WDS 컴포넌트 패키지를 설치/사용하지 않는다.
- **CSS 변수가 단일 진실 공급원.** Tailwind는 그것을 가리키는 별칭. 컴포넌트는 시맨틱 별칭을 쓴다.
- **하드코딩 금지.** 모든 색·간격·폰트는 토큰을 거친다.
- 컬러·스페이싱은 원티드 실제 값[확인]. 타이포·radius·shadow는 프로젝트 정의(원티드 공개 토큰에 없음) — 레퍼런스에 라벨 표기됨.
