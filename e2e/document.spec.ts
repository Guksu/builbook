import { test, expect } from "@playwright/test";

// 작품 1개 생성하고 작업실 URL로 이동하는 헬퍼.
async function createProjectAndOpen(page: import("@playwright/test").Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("집필 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

test("문서 생성 → 집필 → 자동저장 → 새로고침 후 내용 유지", async ({ page }) => {
  await createProjectAndOpen(page);

  // '+ 문서'는 window.prompt로 제목을 받는다 → dialog 핸들러로 응답
  page.once("dialog", (d) => d.accept("1화 - 프롤로그"));
  await page.getByRole("button", { name: "+ 문서" }).click();

  // 새 문서가 자동 선택되어 에디터 등장
  const editor = page.locator(".prose-editor");
  await expect(editor).toBeVisible();
  await expect(page.getByRole("heading", { name: "1화 - 프롤로그" })).toBeVisible();

  // 본문 입력
  await editor.click();
  await page.keyboard.type("어두운 밤, 이야기는 시작되었다.");

  // 자동저장(debounce 800ms) flush 대기 후 새로고침
  await page.waitForTimeout(1500);
  await page.reload();

  // 새로고침 후 첫 DOC 자동 선택 → 내용 유지 확인 (IndexedDB 영속)
  await expect(page.locator(".prose-editor")).toContainText(
    "어두운 밤, 이야기는 시작되었다.",
  );
});

test("문서 삭제 시 바인더에서 사라진다", async ({ page }) => {
  await createProjectAndOpen(page);

  page.once("dialog", (d) => d.accept("삭제될 문서"));
  await page.getByRole("button", { name: "+ 문서" }).click();
  await expect(page.getByRole("heading", { name: "삭제될 문서" })).toBeVisible();

  // 바인더(nav) 행의 삭제(✕, aria-label 정확히 "삭제") 클릭 → 확인 모달
  await page.locator("nav").getByRole("button", { name: "삭제", exact: true }).click();
  // ConfirmModal(dialog) 의 확인 버튼
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click();

  await expect(page.getByText("삭제될 문서")).toHaveCount(0);
});
