// 사이트 공개 정보 단일 출처 — 메타데이터·robots·sitemap이 함께 쓴다.
// 실제 도메인은 배포 환경변수 NEXT_PUBLIC_SITE_URL로 넣는다(없으면 로컬 주소).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
export const SITE_NAME = "builbook";
export const SITE_TITLE = "builbook — 웹소설 집필 에디터";
export const SITE_DESCRIPTION =
  "스크리브너의 본질(문서 트리 + 집중 글쓰기)만 남기고 단순하게. 로그인 없이, 내 브라우저에만 저장되는 웹소설 집필 에디터.";
