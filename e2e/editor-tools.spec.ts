import { test, expect, type Page } from "@playwright/test";

// 새 작품을 만들면 "1화" 문서가 자동 생성되어 작업실에서 곧바로 열린다(DashboardPage).
// 바인더 UI에 의존하지 않는 진입 경로라, 트리 쪽이 바뀌어도 이 스펙은 흔들리지 않는다.
async function openFirstEpisode(page: Page, title = "에디터 도구 테스트") {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.getByRole("heading", { name: "1화" })).toBeVisible();
  const editor = page.locator(".prose-editor");
  await expect(editor).toBeVisible();
  return editor;
}

test("빈 문서에 첫 문장 안내(placeholder)가 뜨고, 쓰기 시작하면 사라진다", async ({ page }) => {
  const editor = await openFirstEpisode(page);

  // Placeholder 확장은 빈 노드에 data-placeholder를 붙인다(실제 문구는 ::before로 그려진다).
  const firstParagraph = editor.locator("p").first();
  await expect(firstParagraph).toHaveAttribute(
    "data-placeholder",
    "여기에 첫 문장을 쓰세요. 저장은 자동이에요.",
  );
  await expect(firstParagraph).toHaveClass(/is-editor-empty/);

  await editor.click();
  await page.keyboard.type("첫 문장.");
  await expect(editor.locator("p").first()).not.toHaveClass(/is-editor-empty/);
});

test("툴바 굵게를 누르면 선택한 본문이 굵어진다", async ({ page }) => {
  const editor = await openFirstEpisode(page);

  await editor.click();
  await page.keyboard.type("굵어질 문장");
  await page.keyboard.press("Control+a");

  const bold = page.getByRole("button", { name: "굵게", exact: true });
  await expect(bold).toHaveAttribute("aria-pressed", "false");
  await bold.click();

  await expect(editor.locator("strong")).toHaveText("굵어질 문장");
  await expect(bold).toHaveAttribute("aria-pressed", "true");
});

test("단축키 안내 모달이 열린다", async ({ page }) => {
  await openFirstEpisode(page);

  await page.getByRole("button", { name: "단축키 안내" }).click();
  const dialog = page.getByRole("dialog", { name: "단축키" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("굵게", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "닫기" }).click();
  await expect(dialog).toHaveCount(0);
});

test("찾기·바꾸기 — 일치 수를 세고 모두 바꾸면 본문에 반영된다", async ({ page }) => {
  const editor = await openFirstEpisode(page);

  await editor.click();
  await page.keyboard.type("테아르가 걸었다. 테아르는 멈췄다.");

  // 본문에 커서가 있을 때만 브라우저 기본 찾기를 가로챈다.
  await page.keyboard.press("Control+f");
  const bar = page.getByRole("search", { name: "찾기 및 바꾸기" });
  await expect(bar).toBeVisible();

  await bar.getByLabel("찾을 말").fill("테아르");
  await expect(bar.getByText("1/2")).toBeVisible();

  // 다음 일치로 이동 → 2/2
  await bar.getByRole("button", { name: "다음 일치" }).click();
  await expect(bar.getByText("2/2")).toBeVisible();

  await bar.getByLabel("바꿀 말").fill("카엘");
  await bar.getByRole("button", { name: "모두 바꾸기" }).click();

  await expect(editor).toContainText("카엘가 걸었다. 카엘는 멈췄다.");
  await expect(editor).not.toContainText("테아르");

  // Esc로 닫으면 찾기 바가 사라진다.
  await bar.getByLabel("찾을 말").press("Escape");
  await expect(bar).toHaveCount(0);
});

test("찾기 — 한 건만 바꾸기", async ({ page }) => {
  const editor = await openFirstEpisode(page);

  await editor.click();
  await page.keyboard.type("밤과 밤");

  await page.getByRole("button", { name: "찾기", exact: true }).click();
  const bar = page.getByRole("search", { name: "찾기 및 바꾸기" });
  await bar.getByLabel("찾을 말").fill("밤");
  await expect(bar.getByText("1/2")).toBeVisible();

  await bar.getByLabel("바꿀 말").fill("낮");
  await bar.getByRole("button", { name: "바꾸기", exact: true }).click();

  await expect(editor).toContainText("낮과 밤");
});

test("제목을 눌러 바로 고치면 바인더에도 반영된다", async ({ page }) => {
  await openFirstEpisode(page);

  // 제목(h1) 안의 버튼을 눌러 인라인 입력으로 전환.
  await page.getByRole("heading", { name: "1화" }).getByRole("button").click();
  const titleInput = page.getByLabel("문서 제목");
  await expect(titleInput).toBeVisible();

  // Esc는 취소 — 제목이 그대로다.
  await titleInput.fill("버려질 제목");
  await titleInput.press("Escape");
  await expect(page.getByRole("heading", { name: "1화" })).toBeVisible();

  // 다시 열어 F2 경로로 편집 후 Enter 저장.
  await page.keyboard.press("F2");
  await page.getByLabel("문서 제목").fill("1화 - 각성");
  await page.getByLabel("문서 제목").press("Enter");

  await expect(page.getByRole("heading", { name: "1화 - 각성" })).toBeVisible();
  // 왼쪽 패널(바인더)에도 새 제목이 보인다.
  await expect(page.locator("aside").first().getByText("1화 - 각성")).toBeVisible();

  // 새로고침해도 유지된다(IndexedDB 반영).
  await page.reload();
  await expect(page.getByRole("heading", { name: "1화 - 각성" })).toBeVisible();
});
