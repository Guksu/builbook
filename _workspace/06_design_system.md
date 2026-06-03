# 06 · 디자인 시스템 (원티드 토큰 + Tailwind)

> 담당: design-system-specialist · MVP-1 · 2026-06-03
> 방침: 원티드 **디자인 토큰(값)만** 차용. 컴포넌트 패키지(`@wanteddev/wds`) **미사용** — Tailwind로 직접 구현.
> SSOT: `app/globals.css`의 CSS 변수가 단일 진실 공급원. `tailwind.config.ts`는 그 변수를 가리키는 별칭일 뿐.

## 산출물

| 파일 | 역할 |
|------|------|
| `app/globals.css` | 폰트 로드 + CSS 변수(원시→시맨틱 2단계) + base 스타일 |
| `tailwind.config.ts` | theme.extend 가 `var(--...)` 를 가리킴 (값 중복 정의 없음) |
| `app/layout.tsx` | 루트 레이아웃(`lang="ko"`, globals.css import) |
| `components/ui/**` | 토큰 기반 기본 컴포넌트 |

## 폰트 [확인 — WDS 기본 폰트]
- **Pretendard**, 공개 CDN `@import`(globals.css 최상단). 인증/추가 npm 의존성 불필요.
- fallback: Apple SD Gothic Neo · Noto Sans KR · system-ui.
- 별도 `app/fonts.ts` 없음 — `font-sans`(= `var(--font-sans)`)가 body 기본값.

---

## 1. 토큰 사용 규칙 (전 UI 에이전트 필독)

- **hex/px 하드코딩 금지.** 모든 색·간격·폰트는 토큰 유틸리티로만.
- **시맨틱 별칭만 사용**, 원시 팔레트(`--blue-50`) 직접 참조 금지.
- 색 역할이 바뀌면 `globals.css` 시맨틱 변수만 고친다 → 전 컴포넌트 자동 반영.

## 2. 컬러 유틸리티 (Tailwind ↔ 토큰)

접두사 `bg-`/`text-`/`border-`/`ring-` 와 조합.

| 유틸 키 | 의미 | 값(라이트) |
|---------|------|-----------|
| `primary` | 시그니처 블루 | `#0066FF` [확인] |
| `primary-hover` / `primary-active` | 호버/액티브 | `#005EEB` / `#0054D1` [확인] |
| `primary-weak` | 연한 배경 | `#EAF2FE` [확인] |
| `primary-fg` | primary 위 텍스트 | `#FFFFFF` |
| `fg` / `fg-weak` / `fg-muted` | 본문/보조/비활성 | `#171717` / `#737373` / `#B0B0B0` |
| `bg` | 페이지 배경 | `#FFFFFF` |
| `surface` | 카드·패널 배경 | `#F7F7F7` [확인] |
| `border` / `border-strong` | 경계선 | `#DCDCDC` / `#C4C4C4` [확인] |
| `success` `warning` `error` (+ `-strong` `-weak`) | 상태색 | `#00BF40` `#FF9200` `#FF4242` [확인] |
| `ring` | 포커스 링 | `#0066FF` |

예) `className="bg-primary text-primary-fg hover:bg-primary-hover"`,
`className="border border-border bg-surface text-fg-weak"`.

## 3. 스페이싱 [확인 — 원티드 px 스케일] ⚠️ 중요

스페이싱 키 = **px 값 그대로**. 기본 Tailwind rem 스케일을 덮어씀.
→ `p-16` = **16px** (1rem 아님), `gap-8` = **8px**, `h-40` = **40px**.

사용 가능 키: `0.5 1 2 4 6 8 10 12 14 16 20 24 32 40 48 56 64 72 80` (= 그 px).
`p-` `px-` `py-` `m-` `gap-` `h-` `w-` `space-x-` 등에 적용.

## 4. radius / shadow [프로젝트 정의]
- radius: `rounded-sm`(4) `rounded-md`(8) `rounded-lg`(12) `rounded-xl`(16) `rounded-full`
- shadow: `shadow-sm` `shadow-md` `shadow-lg`

## 5. 타이포 [프로젝트 정의 — Pretendard 기반]
`text-display` `text-h1` `text-h2` `text-h3` `text-body-lg` `text-body` `text-body-sm` `text-caption`
→ size + line-height + weight 가 한 번에 적용됨. weight 덮어쓰려면 `font-medium` 등 추가.

---

## 6. 기본 컴포넌트 (`@/components/ui`)

배럴 import: `import { Button, Input, Card, Modal, useToast } from "@/components/ui";`

### Button
```tsx
<Button>저장</Button>                          // primary, md
<Button variant="secondary" size="sm">취소</Button>
<Button variant="ghost">더보기</Button>
<Button variant="danger" onClick={...}>삭제</Button>
<Button block disabled>전체너비/비활성</Button>
```
- `variant`: `primary`(기본) `secondary` `ghost` `danger`
- `size`: `sm`(h32) `md`(h40, 기본) `lg`(h48)
- `block`: 가로 100%. 기본 `type="button"`(폼 submit 시 `type="submit"` 명시).
- 포커스 링·disabled 처리 내장.

### Input / Textarea
```tsx
<Input placeholder="제목" value={v} onChange={...} />
<Input invalid aria-describedby="err" />          // 에러 상태
<Textarea rows={6} placeholder="시놉시스" />
```
- `invalid` prop → border/ring 을 error 토큰으로. `aria-invalid` 자동.
- 라벨은 호출부에서 `<label>` 로 연결(접근성).

### Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>작품 제목</CardTitle>
    <CardDescription>마지막 수정 2시간 전</CardDescription>
  </CardHeader>
  <CardContent>본문…</CardContent>
</Card>
<Card interactive onClick={...}>클릭 가능한 카드</Card>
```

### Modal / ConfirmModal (client)
```tsx
const [open, setOpen] = useState(false);
<Modal open={open} onClose={() => setOpen(false)} title="새 작품"
  footer={<><Button variant="ghost" onClick={()=>setOpen(false)}>취소</Button>
           <Button onClick={save}>만들기</Button></>}>
  <Input placeholder="작품 제목" />
</Modal>

<ConfirmModal open={o} onClose={...} onConfirm={remove}
  title="삭제할까요?" description="되돌릴 수 없습니다." danger confirmText="삭제" />
```
- ESC 닫기 · backdrop 클릭 닫기 · body 스크롤 잠금 · `role="dialog"` 내장.
- `createPortal` 사용 → client component.

### Toast (client)
앱(또는 인증 레이아웃)을 `<ToastProvider>` 로 감싼 뒤 훅 사용:
```tsx
// layout 또는 상위 client wrapper
<ToastProvider>{children}</ToastProvider>

// 사용처
const { toast } = useToast();
toast("자동 저장됨", "success");
toast("저장 실패 — 로컬 백업됨", "error");
```
- `variant`: `default` `success` `warning` `error`. 3초 후 자동 사라짐. `aria-live` 내장.
- **frontend-engineer 참고:** 자동저장 상태 알림에 `toast(...,"success"|"error")` 활용 가능.

---

## 7. 인계 메모
- `ToastProvider` 마운트 위치만 frontend 가 정하면 됨(루트 또는 `(app)` 레이아웃 권장).
- `cn()` 헬퍼(`@/components/ui`)로 조건부 className 결합 — 외부 의존성 없음.
- 토큰/컴포넌트 변경 시 design-system-specialist 가 frontend·editor 에 브로드캐스트.
- node_modules 미설치 상태라 정적 타입체크는 설치 후 수행 권장(파일 정합성은 수동 검토 완료).

## 8. 출처/검증 라벨
- 컬러·스페이싱 = 원티드 공개 소스 실값 **[확인]** (`wanteddev/montage-web · wds-theme/atomic`).
- 타이포·radius·shadow = **[프로젝트 정의]** (원티드 공개 토큰에 없음, Pretendard 기반).
- 다크 테마: MVP-1 라이트만. 추가 시 `:root` 시맨틱 변수에 `.dark` 오버라이드만 추가.
