import type { Config } from "tailwindcss";

/*
  Tailwind 테마 = CSS 변수(globals.css)를 가리키는 별칭.
  값을 여기에 직접 박지 않는다 — var(--...) 만 둔다 (SSOT 어긋남 방지).
  컴포넌트는 시맨틱 유틸(bg-primary, text-fg, border-border 등)을 쓴다.
*/
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: "var(--font-sans)",
      },
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          active: "var(--color-primary-active)",
          weak: "var(--color-primary-weak)",
          fg: "var(--color-primary-fg)",
        },
        fg: {
          DEFAULT: "var(--color-fg)",
          weak: "var(--color-fg-weak)",
          muted: "var(--color-fg-muted)",
        },
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          strong: "var(--color-success-strong)",
          weak: "var(--color-success-weak)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          strong: "var(--color-warning-strong)",
          weak: "var(--color-warning-weak)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          strong: "var(--color-error-strong)",
          weak: "var(--color-error-weak)",
        },
        ring: "var(--color-ring)",
      },
      // 원티드 실제 스페이싱 스케일 (px) [확인]
      spacing: {
        "0.5": "0.5px",
        "1": "1px",
        "2": "2px",
        "4": "4px",
        "6": "6px",
        "8": "8px",
        "10": "10px",
        "12": "12px",
        "14": "14px",
        "16": "16px",
        "20": "20px",
        "24": "24px",
        "32": "32px",
        "40": "40px",
        "48": "48px",
        "56": "56px",
        "64": "64px",
        "72": "72px",
        "80": "80px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,.06)",
        md: "0 4px 12px rgba(0,0,0,.08)",
        lg: "0 8px 24px rgba(0,0,0,.12)",
      },
      // 타이포 스케일 [프로젝트 정의 — Pretendard 기반]
      fontSize: {
        display: ["2.5rem", { lineHeight: "1.2", fontWeight: "700" }],
        h1: ["2rem", { lineHeight: "1.25", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "1.3", fontWeight: "700" }],
        h3: ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }],
        body: ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};

export default config;
