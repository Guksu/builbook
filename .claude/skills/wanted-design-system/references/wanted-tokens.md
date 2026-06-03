# 원티드 디자인 토큰 레퍼런스 (Tailwind 매핑용)

> 출처: `github.com/wanteddev/montage-web` 의 `packages/wds-theme/src/theme/atomic` + `/spacing` (공개 저장소, 2026-06-03 추출). **컬러·스페이싱은 실제 원티드 토큰 값 [확인].** 타이포는 해당 토큰 디렉토리에 없어 Pretendard 기반으로 프로젝트가 정의 [프로젝트 정의].
>
> **방침:** WDS **컴포넌트 패키지(`@wanteddev/wds`)는 쓰지 않는다.** 원티드의 **디자인 토큰 값만** Tailwind 테마 + CSS 변수로 가져와 쓰고, 컴포넌트는 Tailwind로 직접 만든다. → GitHub Packages 인증 불필요(토큰은 공개 소스에서 추출, Pretendard는 공개 CDN).

## 목차
1. 폰트 (Pretendard)
2. 원시 컬러 팔레트 (atomic)
3. 시맨틱 컬러 별칭 (역할 매핑)
4. 스페이싱 / 라운드 / 섀도우
5. 타이포그래피 스케일
6. globals.css (CSS 변수)
7. tailwind.config (theme.extend 매핑)

---

## 1. 폰트 (Pretendard) [확인 — WDS 기본 폰트]

원티드 디자인 시스템 기본 폰트는 **Pretendard**. 공개 CDN(인증 불필요).

```css
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.css");
:root {
  --font-sans: "Pretendard", -apple-system, BlinkMacSystemFont,
    "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif;
}
```
> self-host를 원하면 `pretendard` npm 패키지 + `next/font/local`도 가능. 버전 고정 권장.

---

## 2. 원시 컬러 팔레트 (atomic) [확인]

원티드는 색조별 10단계(5/10~99, 숫자가 클수록 밝음) 팔레트를 쓴다.

```
blue   (primary 계열)
 10 #001536  20 #002966  30 #003E9C  40 #0054D1  45 #005EEB  50 #0066FF
 55 #1A75FF  60 #3385FF  65 #4F95FF  70 #69A5FF  80 #9EC5FF  90 #C9DEFE
 95 #EAF2FE  99 #F7FBFF

neutral (gray 계열)
 5 #0F0F0F  10 #171717  15 #1C1C1C  20 #2A2A2A  22 #303030  30 #474747
 40 #5C5C5C  50 #737373  60 #8A8A8A  70 #9B9B9B  80 #B0B0B0  90 #C4C4C4
 95 #DCDCDC  99 #F7F7F7

common   0 #000000   100 #FFFFFF

red    (error 계열)
 10 #3B0101  20 #730303  30 #B00C0C  40 #E52222  50 #FF4242  60 #FF6363
 70 #FF8C8C  80 #FFB5B5  90 #FED5D5  95 #FEECEC  99 #FFFAFA

green  (success 계열)
 10 #00240C  20 #004517  30 #006E25  40 #009632  50 #00BF40  60 #1ED45A
 70 #49E57D  80 #7DF5A5  90 #ACFCC7  95 #D9FFE6  99 #F2FFF6

orange (warning 계열)
 10 #361E00  20 #663A00  30 #9C5800  40 #D47800  50 #FF9200  60 #FFA938
 70 #FFC06E  80 #FFD49C  90 #FEE6C6  95 #FEF4E6  99 #FFFCF7
```
> 추가 색조(coolNeutral, cyan, lightBlue, lime, pink, purple, violet, redOrange)도 저장소에 있다. 필요 시 같은 경로(`atomic/{hue}.ts`)에서 추출.

---

## 3. 시맨틱 컬러 별칭 (역할 매핑) [프로젝트 정의 — 위 원시값 참조]

라이트 테마 기준 역할 매핑(원시 토큰 → 의미):

| 역할 | 값 | 근거 |
|------|-----|------|
| primary | blue.50 `#0066FF` | 시그니처 블루 |
| primary-hover | blue.45 `#005EEB` | 한 단계 진하게 |
| primary-active | blue.40 `#0054D1` | |
| primary-weak | blue.95 `#EAF2FE` | 연한 배경 |
| fg (본문) | neutral.10 `#171717` | |
| fg-weak (보조) | neutral.50 `#737373` | |
| bg | common.100 `#FFFFFF` | |
| surface | neutral.99 `#F7F7F7` | 카드/패널 |
| border | neutral.95 `#DCDCDC` | |
| success | green.50 `#00BF40` / green.40 `#009632`(강조) | |
| warning | orange.50 `#FF9200` / orange.40 `#D47800` | |
| error | red.50 `#FF4242` / red.40 `#E52222` | |

> 다크 테마는 neutral 방향을 반전(fg=neutral.99, bg=neutral.10 등). MVP-1은 라이트만으로 시작 가능.

---

## 4. 스페이싱 / 라운드 / 섀도우

### 스페이싱 [확인 — 원티드 실제 스케일, px]
`0, 0.5, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80` (px)

### 라운드 / 섀도우 [프로젝트 정의]
radius: sm 4 / md 8 / lg 12 / xl 16 / full 9999 (px)
shadow: sm `0 1px 2px rgba(0,0,0,.06)` / md `0 4px 12px rgba(0,0,0,.08)` / lg `0 8px 24px rgba(0,0,0,.12)`

---

## 5. 타이포그래피 스케일 [프로젝트 정의 — Pretendard 기반]
WDS 토큰 디렉토리에 폰트 스케일이 없어 프로젝트가 정의(8/4pt 기반):

| 역할 | size | line-height | weight |
|------|------|-------------|--------|
| display | 2.5rem | 1.2 | 700 |
| h1 | 2rem | 1.25 | 700 |
| h2 | 1.5rem | 1.3 | 700 |
| h3 | 1.25rem | 1.4 | 600 |
| body-lg | 1.125rem | 1.6 | 400 |
| body | 1rem | 1.6 | 400 |
| body-sm | 0.875rem | 1.55 | 400 |
| caption | 0.75rem | 1.4 | 500 |

---

## 6. globals.css (CSS 변수) — SSOT

```css
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.css");

:root {
  --font-sans: "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;

  /* 원시 — 원티드 실제 값 */
  --blue-40:#0054D1; --blue-45:#005EEB; --blue-50:#0066FF; --blue-95:#EAF2FE;
  --neutral-10:#171717; --neutral-50:#737373; --neutral-95:#DCDCDC; --neutral-99:#F7F7F7;
  --green-40:#009632; --green-50:#00BF40; --orange-40:#D47800; --orange-50:#FF9200;
  --red-40:#E52222; --red-50:#FF4242; --white:#FFFFFF; --black:#000000;

  /* 시맨틱 */
  --color-primary:var(--blue-50); --color-primary-hover:var(--blue-45); --color-primary-active:var(--blue-40);
  --color-primary-weak:var(--blue-95);
  --color-fg:var(--neutral-10); --color-fg-weak:var(--neutral-50);
  --color-bg:var(--white); --color-surface:var(--neutral-99); --color-border:var(--neutral-95);
  --color-success:var(--green-50); --color-warning:var(--orange-50); --color-error:var(--red-50);
}
body { font-family: var(--font-sans); color: var(--color-fg); background: var(--color-bg); }
```

---

## 7. tailwind.config (theme.extend) — CSS 변수를 가리킴

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    fontFamily: { sans: "var(--font-sans)" },
    colors: {
      primary: { DEFAULT: "var(--color-primary)", hover: "var(--color-primary-hover)", active: "var(--color-primary-active)", weak: "var(--color-primary-weak)" },
      fg: { DEFAULT: "var(--color-fg)", weak: "var(--color-fg-weak)" },
      bg: "var(--color-bg)", surface: "var(--color-surface)", border: "var(--color-border)",
      success: "var(--color-success)", warning: "var(--color-warning)", error: "var(--color-error)",
      // 필요 시 원시 팔레트도: blue: { 50: "var(--blue-50)", ... }
    },
    spacing: { 0.5:"0.5px",1:"1px",2:"2px",4:"4px",6:"6px",8:"8px",10:"10px",12:"12px",14:"14px",16:"16px",20:"20px",24:"24px",32:"32px",40:"40px",48:"48px",56:"56px",64:"64px",72:"72px",80:"80px" },
    borderRadius: { sm:"4px", md:"8px", lg:"12px", xl:"16px" },
    boxShadow: { sm:"0 1px 2px rgba(0,0,0,.06)", md:"0 4px 12px rgba(0,0,0,.08)", lg:"0 8px 24px rgba(0,0,0,.12)" },
  }},
  plugins: [],
};
```
> Tailwind v4면 `tailwind.config` 대신 `globals.css`의 `@theme` 블록에 `--color-*`, `--spacing-*` 규칙으로 동일 선언.

---

## 부록: 검증 메모
- 컬러·스페이싱 = 원티드 공개 소스 실값. 타이포·radius·shadow = 프로젝트 정의(원티드 공개 토큰에 없음).
- 추가 색조/다크 테마 매핑이 필요하면 `atomic/{hue}.ts` 및 `theme/semantic/`에서 추가 추출.
