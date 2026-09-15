import { test, expect, type Page } from "@playwright/test";

// 작품 1개 생성하고 작업실 URL로 이동하는 헬퍼.
async function createProjectAndOpen(page: import("@playwright/test").Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("집필 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

// 새 문서: "새 문서" 아이콘 → 기본 이름("N화")으로 즉시 생성 → 인라인 입력에 제목 입력 → Enter.
async function createDoc(page: Page, title: string) {
  await page.getByRole("button", { name: "새 문서" }).click();
  const name = page.getByRole("textbox", { name: "이름" });
  await name.fill(title);
  await name.press("Enter");
  await expect(name).toHaveCount(0);
}

test("문서 생성 → 집필 → 자동저장 → 새로고침 후 내용 유지", async ({ page }) => {
  await createProjectAndOpen(page);

  await createDoc(page, "1화 - 프롤로그");

  // 새 문서가 자동 선택되어 에디터 등장
  const editor = page.locator(".prose-editor");
  await expect(editor).toBeVisible();
  await expect(page.getByRole("heading", { name: "1화 - 프롤로그" })).toBeVisible();

  // 본문 입력
  await editor.click();
  await page.keyboard.type("어두운 밤, 이야기는 시작되었다.");

  // 분량이 실시간 반영된다 (기본 단위 = 공백 포함 글자 수: 18자)
  // 상단 바에도 작품 합계 "N자"가 있으므로 에디터(main) 안의 것만 본다.
  await expect(page.locator("main").getByText(/\d자$/)).toContainText("18자");

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

  await createDoc(page, "삭제될 문서");
  await expect(page.getByRole("heading", { name: "삭제될 문서" })).toBeVisible();

  // 바인더 항목 우클릭 → 메뉴에서 삭제 → 확인 모달
  await page
    .getByRole("treeitem", { name: "삭제될 문서" })
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "삭제" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click();

  await expect(page.getByText("삭제될 문서")).toHaveCount(0);
});
