import { test, expect, type Page } from "@playwright/test";

// 줄바꿈 규칙(2026-10) — 연재처(노벨피아·문피아·네이버 시리즈) 입력창 기준.
// Enter 한 번 = 다음 줄, Enter 두 번(빈 문단) = 빈 줄 하나. 복사·붙여넣기·화면 모양이 모두 이 규칙을 따른다.

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

async function createProjectAndOpen(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("줄바꿈 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
}

const editor = (page: Page) => page.locator("main .prose-editor");

async function typeLines(page: Page) {
  await editor(page).click();
  await page.keyboard.type("첫 줄.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("둘째 줄.");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter"); // 빈 줄(장면 전환)
  await page.keyboard.type("넷째 줄.");
}

test("복사하면 Enter 한 번은 줄바꿈 하나, 빈 줄은 빈 줄 하나로 클립보드에 들어간다", async ({ page }) => {
  await createProjectAndOpen(page);
  await typeLines(page);
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+c");
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toBe("첫 줄.\n둘째 줄.\n\n넷째 줄.");
});

test("밖에서 복사한 글을 붙이면 줄 하나가 문단 하나가 되고 빈 줄도 남는다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.evaluate(() => navigator.clipboard.writeText("가\n나\n\n다"));
  await editor(page).click();
  await page.keyboard.press("Control+v");
  const paragraphs = editor(page).locator("p");
  await expect(paragraphs).toHaveCount(4);
  await expect(paragraphs.nth(0)).toHaveText("가");
  await expect(paragraphs.nth(1)).toHaveText("나");
  await expect(paragraphs.nth(2)).toHaveText("");
  await expect(paragraphs.nth(3)).toHaveText("다");
});

test("우리 에디터끼리 복사하면 굵게 같은 서식이 남는다", async ({ page }) => {
  await createProjectAndOpen(page);
  await editor(page).click();
  await page.keyboard.type("굵은 글");
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+b");
  await expect(editor(page).locator("strong")).toHaveText("굵은 글");
  await page.keyboard.press("Control+c");

  // 다른 회차에 붙여넣는다(회차 사이 복사)
  await page.getByRole("button", { name: "새 문서" }).click();
  await page.getByRole("textbox", { name: "이름" }).press("Enter");
  await expect(page.getByRole("heading", { name: "2화" })).toBeVisible();
  await editor(page).click();
  await page.keyboard.press("Control+v");
  await expect(editor(page).locator("strong")).toHaveText("굵은 글");
});

test("에디터 화면에서 문단과 문단 사이에 간격이 없다(Enter 한 번 = 바로 다음 줄)", async ({ page }) => {
  await createProjectAndOpen(page);
  await typeLines(page);
  const marginTop = await editor(page).locator("p").nth(1).evaluate((el) => getComputedStyle(el).marginTop);
  expect(marginTop).toBe("0px");
});
