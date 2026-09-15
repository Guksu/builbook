import { test, expect, type Page } from "@playwright/test";

// 코르크보드에서 카드를 폴더 밖으로 꺼내기 + Alt+S 상태 순환.

async function createProjectAndOpen(page: Page, title = "카드 이동 테스트") {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}
const nameInput = (page: Page) => page.getByRole("textbox", { name: "이름" });

test("Alt+S로 현재 문서 상태가 초고→퇴고→완료로 돈다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.locator("main .prose-editor").click();
  await page.keyboard.press("Alt+s");
  await expect(page.getByRole("treeitem", { name: "1화" }).getByRole("img", { name: "상태: 퇴고" })).toBeVisible();
  await page.keyboard.press("Alt+s");
  await expect(page.getByRole("treeitem", { name: "1화" }).getByRole("img", { name: "상태: 완료" })).toBeVisible();
});

test("코르크보드 아래 영역에 카드를 놓으면 폴더 밖으로 나온다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "새 폴더" }).click();
  await nameInput(page).fill("1부");
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);
  const tree = page.getByRole("tree", { name: "문서 트리" });
  await tree.getByRole("treeitem", { name: "1부" }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "새 문서" }).click();
  await nameInput(page).fill("속회차");
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);
  await expect(tree.getByRole("treeitem", { name: "속회차" })).toHaveAttribute("aria-level", "2");

  await tree.getByRole("treeitem", { name: "1부" }).click();
  await page.getByRole("button", { name: "카드", exact: true }).click();
  const card = page.getByRole("article").filter({ hasText: "속회차" });
  const zone = page.getByLabel("폴더 밖으로 옮기기");
  // HTML5 DnD: dispatchEvent로 dragstart/dragover/drop을 직접 흘린다(Playwright dragTo는 dataTransfer가 비어 불안정).
  await card.dispatchEvent("dragstart", { dataTransfer: await page.evaluateHandle(() => new DataTransfer()) });
  await zone.dispatchEvent("dragover", { dataTransfer: await page.evaluateHandle(() => new DataTransfer()) });
  await zone.dispatchEvent("drop", { dataTransfer: await page.evaluateHandle(() => new DataTransfer()) });
  await expect(tree.getByRole("treeitem", { name: "속회차" })).toHaveAttribute("aria-level", "1");
});
