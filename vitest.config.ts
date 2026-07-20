import { defineConfig } from "vitest/config";
import path from "node:path";

// tsconfig paths와 1:1 일치하는 별칭 (경계면 규약: 별칭 불일치 = 테스트만 통과/실패하는 drift)
const r = (p: string) => path.resolve(__dirname, p);

export default defineConfig({
  resolve: {
    alias: {
      "@app": r("src/app"),
      "@views": r("src/views"),
      "@widgets": r("src/widgets"),
      "@features": r("src/features"),
      "@entities": r("src/entities"),
      "@shared": r("src/shared"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
