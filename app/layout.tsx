import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@app/providers";

export const metadata: Metadata = {
  title: "builbook — 웹소설 집필 에디터",
  description:
    "스크리브너의 본질을 입문 작가도 5분 안에 쓸 수 있게 단순화한 웹소설 집필 에디터.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
