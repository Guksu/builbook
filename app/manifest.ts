import type { MetadataRoute } from "next";

// PWA 매니페스트 — 홈 화면 설치·독립 창 실행. 아이콘은 scripts/make-icons.mjs가 만든다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "builbook — 웹소설 집필 에디터",
    short_name: "builbook",
    description: "문서 트리로 구조를 잡고, 쓰는 즉시 자동 저장되는 웹소설 집필 도구. 로그인 없이, 내 브라우저에만 저장.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    lang: "ko",
    background_color: "#ffffff",
    theme_color: "#0066ff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
