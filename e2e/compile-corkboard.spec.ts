import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// 컴파일 옵션(회차 범위·구분·제목) + 코르크보드 폴더 범위·라벨 필터.

async function createProjectAndOpen(page: Page, title = "컴파일 테스트") {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}
const nameInput = (page: Page) => page.getByRole("textbox", { name: "이름" });
async function newDoc(page: Page, title: string) {
  await page.getByRole("button", { name: "새 문서" }).click();
  await nameInput(page).fill(title);
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);
}
async function typeBody(page: Page, text: string) {
  const editor = page.locator("main .prose-editor");
  await editor.click();
  await page.keyboard.type(text);
  await page.waitForTimeout(1200); // 자동저장 debounce
}

test("컴파일 옵션: 회차 범위와 구분선, 제목 제외가 TXT에 반영된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await typeBody(page, "첫째 본문");
  await newDoc(page, "2화");
  await typeBody(page, "둘째 본문");
  await newDoc(page, "3화");
  await typeBody(page, "셋째 본문");

  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "내보내기" });
  await expect(dialog.getByText("전체 3회차")).toBeVisible();
  await dialog.getByLabel("시작 회차").fill("2");
  await dialog.getByLabel("끝 회차").fill("3");
  await dialog.getByLabel("회차 구분").selectOption("stars");
  await dialog.getByLabel("작품 제목 포함").uncheck();

  const downloadPromise = page.waitForEvent("download");
  await dialog.locator("section", { hasText: "작품 전체" }).getByRole("button", { name: "TXT" }).click();
  const download = await downloadPromise;
  const text = readFileSync(await download.path(), "utf8");
  expect(text).toBe("2화\n\n둘째 본문\n\n* * *\n\n3화\n\n셋째 본문\n");
});

test("코르크보드: 폴더를 고르면 그 폴더 카드만, 전체 보기로 돌아온다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "새 폴더" }).click();
  await nameInput(page).fill("2부");
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);
  const tree = page.getByRole("tree", { name: "문서 트리" });
  await tree.getByRole("treeitem", { name: "2부" }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "새 문서" }).click();
  await nameInput(page).fill("속회차");
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);

  // 폴더 선택 → 카드 보기 → 범위가 폴더
  await tree.getByRole("treeitem", { name: "2부" }).click();
  await page.getByRole("button", { name: "카드", exact: true }).click();
  await expect(page.getByLabel("코르크보드 범위")).toHaveText("2부");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: "전체 보기" }).click();
  await expect(page.getByLabel("코르크보드 범위")).toHaveText("작품 전체");
  await expect(page.getByRole("article")).toHaveCount(3); // 1화 · 2부 · 속회차

  // 라벨 필터: 라벨 없음 → 문서 카드 2개(폴더 제외)
  await page.getByLabel("카드 라벨 필터").selectOption("none");
  await expect(page.getByRole("article")).toHaveCount(2);
});
