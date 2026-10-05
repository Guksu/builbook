import { test, expect, type Page } from "@playwright/test";

// 패널 단축키(Ctrl/⌘+Shift+1~8)와 열린 패널 상태 기억.

async function createProjectAndOpen(page: Page, title = "패널 테스트") {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
}

test("Ctrl+Shift+2로 현황 패널을 열고 닫으며, 열린 상태는 새로고침 후에도 유지된다", async ({ page }) => {
  await createProjectAndOpen(page);
  const heading = page.getByRole("heading", { name: "집필 현황" });
  await expect(heading).toHaveCount(0);

  await page.keyboard.press("Control+Shift+Digit2");
  await expect(heading).toBeVisible();
  await expect(page.getByRole("button", { name: "패널", exact: true })).toContainText("1");

  await page.reload();
  await expect(page.getByRole("heading", { name: "집필 현황" })).toBeVisible();

  await page.keyboard.press("Control+Shift+Digit2");
  await expect(page.getByRole("heading", { name: "집필 현황" })).toHaveCount(0);
});

test("Ctrl+Shift+6은 인스펙터, 메뉴에는 단축키가 표기된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.keyboard.press("Control+Shift+Digit6");
  await expect(page.getByRole("region", { name: "작품 목표" })).toBeVisible();
  await page.getByRole("button", { name: "패널", exact: true }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "연표" })).toContainText("Shift+1");
});

test("패널 메뉴의 이름이 잘리지 않고, 단축키 표기는 이름 오른쪽에 있다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "패널", exact: true }).click();
  const items = page.getByRole("menuitemcheckbox");
  const n = await items.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const truncated = await items.nth(i).evaluate((el) => {
      const label = el.querySelector<HTMLElement>("span.truncate")!;
      return label.scrollWidth > label.clientWidth;
    });
    expect(truncated).toBe(false);
  }
  await expect(page.getByRole("menuitemcheckbox", { name: "영감" })).toHaveText(/^영감Ctrl\+Shift\+5$/);
  // 휴지통은 패널이 아니라 바인더 맨 아래에 있다
  await expect(page.getByRole("menuitemcheckbox", { name: "휴지통" })).toHaveCount(0);
});

test("본문에 커서가 있어도 Ctrl+Shift+7·8은 문단을 목록으로 바꾸지 않는다('- ' 입력은 그대로)", async ({ page }) => {
  await createProjectAndOpen(page);
  const editor = page.locator("main .prose-editor");
  await editor.click();
  await page.keyboard.type("가 나 다");

  await page.keyboard.press("Control+Shift+Digit6"); // 인스펙터는 열린다
  await expect(page.getByRole("region", { name: "작품 목표" })).toBeVisible();
  await editor.click();
  await page.keyboard.press("Control+Shift+Digit7");
  await page.keyboard.press("Control+Shift+Digit8");
  await expect(editor.locator("ul, ol")).toHaveCount(0);
  await expect(editor.locator("p").first()).toHaveText("가 나 다");

  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- 항목");
  await expect(editor.locator("ul li")).toHaveText("항목");
});
