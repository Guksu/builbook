# 원티드 디자인 시스템 토큰 레퍼런스

> **출처 신뢰도 라벨:**
> - **[학습기반-확인]** = 공개 사실로 알려져 있으나 라이브 소스 미재검증. 사용 전 출처 URL 확인 권장.
> - **[추정]** = 공개 자료가 없어 합리적으로 추정한 값. 디자인 확정 전 반드시 검증.
>
> ⚠️ 이 문서 작성 시점에 네트워크 접근(WebSearch/WebFetch/curl)이 차단되어 라이브 재검증을 못 했다. 특히 컬러·타이포·스페이싱은 대부분 [추정]이다. **부록의 검증 체크리스트를 먼저 수행**해 실제 원티드 값으로 교체하라.

## 목차
1. 폰트 (wanted-sans)
2. 컬러 토큰
3. 타이포그래피 스케일
4. 스페이싱 / 라운드 / 섀도우
5. 공개 컴포넌트 라이브러리
6. 적용 가이드 (Next.js + Tailwind)
7. 부록: 검증 체크리스트

---

## 1. 폰트 (wanted-sans)

**[학습기반-확인]** Wanted Sans는 원티드랩이 공개한 오픈소스 한글/라틴 산세리프 폰트. SIL Open Font License(OFL) 1.1. Variable(가변 weight) + 정적 weight 제공.

- **GitHub:** `wanteddev/wanted-sans` (org 명이 `wantedlab/` 등 변형일 수 있으니 확인)
- **npm:** `wanted-sans` **[학습기반-확인]**
- **weight:** 100(Thin)~900(Black), Variable은 100~900 연속 **[학습기반-확인]**

### font-family + fallback 스택

```css
:root {
  --font-sans:
    "Wanted Sans Variable", "Wanted Sans",
    -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
    "Pretendard", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif;
}
body { font-family: var(--font-sans); }
```

출처: https://github.com/wanteddev/wanted-sans · https://www.npmjs.com/package/wanted-sans · https://www.jsdelivr.com/package/npm/wanted-sans

---

## 2. 컬러 토큰

> 원티드는 공개 컬러 토큰 명세를 배포하지 않음(인지 기준). 시그니처 블루만 신뢰도 상대적으로 높고, 나머지는 [추정].

```css
:root {
  /* Brand / Primary */
  --color-primary:        #3366FF; /* [추정] 시그니처 블루 — 실측 교체 필요 */
  --color-primary-hover:  #1F4FE0; /* [추정] */
  --color-primary-active: #1A43C2; /* [추정] */
  --color-primary-weak:   #EBF1FF; /* [추정] */

  /* Gray scale [추정] */
  --color-gray-50:  #F8F9FA;
  --color-gray-100: #F1F3F5;
  --color-gray-200: #E9ECEF;
  --color-gray-300: #DEE2E6;
  --color-gray-400: #CED4DA;
  --color-gray-500: #ADB5BD;
  --color-gray-600: #868E96;
  --color-gray-700: #495057;
  --color-gray-800: #343A40;
  --color-gray-900: #212529;

  /* Base */
  --color-bg:      #FFFFFF; /* [추정] */
  --color-fg:      #212529; /* [추정] */
  --color-fg-weak: #868E96; /* [추정] */
  --color-border:  #E9ECEF; /* [추정] */

  /* Semantic [추정] */
  --color-success: #16A34A;
  --color-warning: #F59E0B;
  --color-error:   #EF4444;
  --color-info:    #3366FF;
  --color-success-weak: #DCFCE7;
  --color-warning-weak: #FEF3C7;
  --color-error-weak:   #FEE2E2;
  --color-info-weak:    #EBF1FF;
}
```

**검증:** wanted.co.kr → DevTools로 CTA 버튼/링크 색 실측 → `--color-primary` 계열 교체.

---

## 3. 타이포그래피 스케일

> **[추정]** wanted-sans에 맞춘 8/4pt 기반 모던 스케일 제안.

| 역할 | size | line-height | weight |
|------|------|-------------|--------|
| display | 2.5rem | 1.2 | 700 |
| h1 | 2rem | 1.25 | 700 |
| h2 | 1.75rem | 1.3 | 700 |
| h3 | 1.5rem | 1.35 | 600 |
| h4 | 1.25rem | 1.4 | 600 |
| body-lg | 1.125rem | 1.6 | 400 |
| body | 1rem | 1.6 | 400 |
| body-sm | 0.875rem | 1.55 | 400 |
| caption | 0.8125rem | 1.5 | 400 |
| label | 0.75rem | 1.4 | 500 |

```css
:root {
  --font-size-display: 2.5rem; --font-size-h1: 2rem; --font-size-h2: 1.75rem;
  --font-size-h3: 1.5rem; --font-size-h4: 1.25rem; --font-size-body-lg: 1.125rem;
  --font-size-body: 1rem; --font-size-body-sm: 0.875rem;
  --font-size-caption: 0.8125rem; --font-size-label: 0.75rem;
  --line-height-tight: 1.2; --line-height-heading: 1.3;
  --line-height-normal: 1.5; --line-height-relaxed: 1.6;
  --font-weight-regular: 400; --font-weight-medium: 500;
  --font-weight-semibold: 600; --font-weight-bold: 700;
}
```

---

## 4. 스페이싱 / 라운드 / 섀도우

> **[추정]** 4px 베이스 스케일.

```css
:root {
  /* spacing */
  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem; --space-4: 1rem;
  --space-5: 1.25rem; --space-6: 1.5rem; --space-8: 2rem; --space-10: 2.5rem;
  --space-12: 3rem; --space-16: 4rem; --space-20: 5rem;
  /* radius */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
  --radius-xl: 16px; --radius-2xl: 24px; --radius-full: 9999px;
  /* shadow */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
  --shadow-xl: 0 16px 40px rgba(0,0,0,0.16);
}
```

---

## 5. 공개 컴포넌트 라이브러리

**결론: 원티드가 npm에 공개 배포한 범용 React 컴포넌트 라이브러리는 확인되지 않음.** 공개된 것은 폰트(wanted-sans) 중심. **→ wanted-sans + 위 토큰 기반 자체 컴포넌트 구현(Radix UI/shadcn 등과 토큰 조합) 권장.** 검증: `npmjs.com/search?q=wanted`.

---

## 6. 적용 가이드 (Next.js + Tailwind)

### 6-1. 폰트 — `next/font/local` (권장, self-host)

```bash
npm install wanted-sans
```

```ts
// app/fonts.ts
import localFont from "next/font/local";
export const wantedSans = localFont({
  src: [{ path: "../node_modules/wanted-sans/fonts/webfonts/variable/complete/WantedSansVariable.woff2", weight: "100 900", style: "normal" }],
  display: "swap",
  variable: "--font-sans",
  fallback: ["-apple-system","BlinkMacSystemFont","Apple SD Gothic Neo","Pretendard","Noto Sans KR","Malgun Gothic","system-ui","sans-serif"],
});
```
> 폰트 파일 경로는 설치된 패키지의 실제 dist 구조로 검증 후 수정.

```tsx
// app/layout.tsx
import { wantedSans } from "./fonts";
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko" className={wantedSans.variable}><body>{children}</body></html>;
}
```

### 6-2. Tailwind theme.extend 매핑 (요지)

CSS 변수를 SSOT로 두고 Tailwind가 참조:
```js
theme: { extend: {
  fontFamily: { sans: "var(--font-sans)" },
  colors: { primary: { DEFAULT: "var(--color-primary)", hover: "var(--color-primary-hover)", weak: "var(--color-primary-weak)" }, /* gray-50~900, semantic ... */ },
  borderRadius: { md: "var(--radius-md)", lg: "var(--radius-lg)" },
  boxShadow: { md: "var(--shadow-md)" },
}}
```
> Tailwind v4면 `tailwind.config` 대신 `globals.css`의 `@theme` 블록에 동일 변수를 선언.

---

## 7. 부록: 검증 체크리스트 (사용 전 필수)

1. `github.com/wanteddev/wanted-sans`(또는 `wantedlab/`) → org 명·dist 폴더·정확한 폰트 파일명 확인.
2. `npmjs.com/package/wanted-sans` → 최신 버전·exports 경로 확인 후 CDN/로컬 경로 교체.
3. **wanted.co.kr** DevTools로 시그니처 블루·그레이·보더 색 실측 → 2번 컬러 교체.
4. `npmjs.com/search?q=wanted` → 공개 컴포넌트 패키지 부재 재확인.
