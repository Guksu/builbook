import { test, expect, type Page } from "@playwright/test";

// 스크리브너 참고 개선 — 빠른 열기 / 목표 바·마감일 / 문서 템플릿.

async function createProjectAndOpen(page: Page, title = "스크리브너 테스트") {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

const nameInput = (page: Page) => page.getByRole("textbox", { name: "이름" });

test("Ctrl+P 빠른 열기로 문서를 찾아 연다", async ({ page }) => {
  await createProjectAndOpen(page);
  // 문서 하나 더 만들고 이름을 '각성'으로
  await page.getByRole("button", { name: "새 문서" }).click();
  await nameInput(page).fill("각성");
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);

  await page.keyboard.press("Control+p");
  const dialog = page.getByRole("dialog", { name: "빠른 열기" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("문서 이름 검색").fill("1화");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator("main").getByRole("heading", { name: "1화", level: 1 })).toBeVisible();

  // Esc로 닫힌다
  await page.keyboard.press("Control+p");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("작품 목표와 마감일을 넣으면 헤더에 목표 바와 하루 분량이 나온다", async ({ page }) => {
  await createProjectAndOpen(page);
  await expect(page.getByRole("button", { name: /^목표 진행/ })).toHaveCount(0);

  await page.getByRole("button", { name: "인스펙터" }).click();
  const goal = page.getByLabel("작품 목표 분량");
  await goal.fill("1000");
  await goal.blur();
  await expect(page.getByRole("button", { name: /^목표 진행: 작품 0%/ })).toBeVisible();

  // 마감일: 오늘 + 9일 → 10일 남음, 하루 100자
  const d = new Date();
  d.setDate(d.getDate() + 9);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  await page.getByLabel("마감일").fill(key);
  await expect(page.getByLabel("마감 페이스")).toHaveText("10일 남음 · 하루 100자씩");
  await expect(page.getByRole("button", { name: /마감까지 10일 · 하루 100자/ })).toBeVisible();
});

test("인물 카드 템플릿으로 문서를 만들면 틀이 채워지고 회차 분량표에는 안 잡힌다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "카드 템플릿" }).click();
  await page.getByRole("menuitem", { name: "새 인물 카드" }).click();
  await expect(nameInput(page)).toHaveValue("새 인물");
  await nameInput(page).fill("주인공 카드");
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);

  // 본문에 템플릿 제목들이 들어 있다
  const editor = page.locator("main .prose-editor");
  await expect(editor).toContainText("나이·외모");
  await expect(editor).toContainText("원하는 것");
  // 바인더에 '인물 카드' 종류 표시
  await expect(page.getByRole("treeitem", { name: "주인공 카드" })).toContainText("인물 카드");

  // 회차 분량표에는 회차(1화)만
  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "현황" }).click();
  await expect(page.getByRole("list", { name: "회차 분량 목록" }).getByRole("button")).toHaveCount(1);
});
