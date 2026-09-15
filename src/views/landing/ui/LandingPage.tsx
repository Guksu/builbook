import Link from "next/link";
import { Button } from "@shared/ui";

// 랜딩 — 진입장벽 낮춤 메시지 + 단일 행동 유도("시작하기"는 한 번만 쓴다: e2e가 그 글자를 누른다).
// 서버 컴포넌트(정적) — 검색 노출·첫 로드 속도를 위해 클라이언트 훅을 쓰지 않는다.

const FEATURES: { title: string; body: string }[] = [
  {
    title: "문서 트리로 구조를 잡아요",
    body: "부·장·회차를 폴더와 문서로. 옵시디언처럼 바로 만들고, 끌어서 순서를 바꿔요.",
  },
  {
    title: "쓰면 저장돼요",
    body: "저장 버튼이 없어요. 입력이 멎으면 자동으로 저장되고, 버전(스냅샷)도 남길 수 있어요.",
  },
  {
    title: "연재에 맞춘 도구",
    body: "회차 분량표(글자 수), 오늘 쓴 분량과 연속 집필일, 독자 뷰 미리보기, 고유명사 표기 검사.",
  },
  {
    title: "구조 설계",
    body: "코르크보드에 시놉시스 카드를 늘어놓고 초고·퇴고·완료를 표시해요. 연표로 사건 순서를 잡아요.",
  },
  {
    title: "내보내기",
    body: "TXT·마크다운·DOCX로 회차별 또는 작품 전체를 내려받아 플랫폼에 올려요.",
  },
  {
    title: "내 글은 내 브라우저에만",
    body: "로그인도 서버도 없어요. 원고는 이 브라우저 안에만 저장되고, 백업 파일로 언제든 옮길 수 있어요.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "정말 로그인이 없나요?",
    a: "네. 계정을 만들지 않아요. 대신 원고가 이 브라우저에만 있으니, 다른 기기로 옮기려면 대시보드의 '백업'으로 파일을 내려받아 복원하세요.",
  },
  {
    q: "브라우저 데이터를 지우면 어떻게 되나요?",
    a: "원고도 함께 사라져요. 그래서 앱이 저장 공간 보호를 요청하고, 백업을 안 한 지 오래되면 알려 드려요.",
  },
  {
    q: "글자 수는 어떤 기준인가요?",
    a: "기본은 공백 포함 글자 수예요. 공백 제외·단어 수로 바꿀 수 있고, 회차 분량표에는 플랫폼 기준 프리셋이 있어요.",
  },
  {
    q: "휴대폰에서도 되나요?",
    a: "화면이 좁으면 바인더가 접히고 본문만 보여요. 홈 화면에 추가하면 앱처럼 열려요.",
  },
];

export function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[960px] flex-col gap-64 px-24 py-48">
      {/* 히어로 */}
      <section className="flex flex-col items-center gap-24 pt-48 text-center">
        <div className="flex flex-col gap-12">
          <h1 className="text-display text-fg">
            쓰기 시작하는 데
            <br />
            <span className="text-primary">5분이면</span> 충분해요
          </h1>
          <p className="text-body-lg text-fg-weak">
            스크리브너의 강력함은 그대로, 복잡함은 덜어낸 웹소설 집필 도구.
            <br />
            문서 트리로 구조를 잡고, 쓰는 즉시 자동 저장됩니다.
          </p>
        </div>
        <Link href="/dashboard">
          <Button size="lg">시작하기</Button>
        </Link>
        <p className="text-caption text-fg-weak">가입 없음 · 무료 · 원고는 내 브라우저에만 저장</p>
      </section>

      {/* 기능 */}
      <section aria-labelledby="features" className="flex flex-col gap-24">
        <h2 id="features" className="text-h2 text-fg">
          연재 작가에게 필요한 것만
        </h2>
        <ul className="grid grid-cols-1 gap-16 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-xl border border-border bg-surface p-20">
              <h3 className="mb-8 text-body-lg font-medium text-fg">{f.title}</h3>
              <p className="text-body-sm leading-relaxed text-fg-weak">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 흐름 */}
      <section aria-labelledby="flow" className="flex flex-col gap-16">
        <h2 id="flow" className="text-h2 text-fg">
          이렇게 시작해요
        </h2>
        <ol className="grid grid-cols-1 gap-12 sm:grid-cols-3">
          {[
            ["작품 만들기", "제목만 적으면 '1화' 문서가 준비돼요."],
            ["바로 쓰기", "본문에 첫 문장을 적으면 저장이 시작돼요."],
            ["회차 늘리기", "새 문서를 누르면 다음 회차 번호가 자동으로 붙어요."],
          ].map(([t, b], i) => (
            <li key={t} className="flex gap-12 rounded-xl border border-border p-16">
              <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-primary-weak text-body-sm font-medium text-primary">
                {i + 1}
              </span>
              <div>
                <p className="text-body font-medium text-fg">{t}</p>
                <p className="text-body-sm text-fg-weak">{b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="flex flex-col gap-16">
        <h2 id="faq" className="text-h2 text-fg">
          자주 묻는 질문
        </h2>
        <dl className="flex flex-col gap-12">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-border p-16">
              <dt className="mb-6 text-body font-medium text-fg">{item.q}</dt>
              <dd className="text-body-sm leading-relaxed text-fg-weak">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 마무리 CTA — "시작하기"와 다른 문구(랜딩 e2e가 '시작하기'를 하나만 찾는다) */}
      <section className="flex flex-col items-center gap-12 rounded-xl bg-surface px-24 py-40 text-center">
        <p className="text-h3 text-fg">오늘 첫 문장을 써 보세요</p>
        <Link href="/dashboard">
          <Button size="lg" variant="secondary">
            첫 작품 만들러 가기
          </Button>
        </Link>
      </section>

      <footer className="pb-24 text-center text-caption text-fg-muted">
        builbook · 로그인 없는 로컬 우선 웹소설 에디터
      </footer>
    </main>
  );
}
