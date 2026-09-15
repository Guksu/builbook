import { test, expect, type Page } from "@playwright/test";

// 작품 1개 생성하고 작업실 URL로 이동 (document.spec.ts와 동일 헬퍼)
async function createProjectAndOpen(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("검색·휴지통 테스트");
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

test("문서 삭제 → 휴지통에 나타남 → 복원 → 바인더 복귀", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "복원될 문서");
  await expect(page.getByRole("heading", { name: "복원될 문서" })).toBeVisible();

  // 소프트 삭제(휴지통 이동) — 우클릭 메뉴
  await page
    .getByRole("treeitem", { name: "복원될 문서" })
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "삭제" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click();
  // 바인더에서 사라진다
  await expect(page.locator("nav").getByText("복원될 문서")).toHaveCount(0);

  // 휴지통을 열면 삭제된 문서가 보인다
  await page.getByRole("button", { name: "휴지통", exact: true }).click();
  const trashList = page.getByRole("list", { name: "휴지통 목록" });
  await expect(trashList.getByText("복원될 문서")).toBeVisible();

  // 복원 → 휴지통에서 사라지고 바인더로 복귀
  await trashList.getByRole("button", { name: "복원" }).click();
  await expect(page.getByText("휴지통이 비어 있어요")).toBeVisible();
  await expect(page.locator("nav").getByText("복원될 문서")).toBeVisible();
});

test("검색으로 문서를 찾아 선택한다 (제목·본문)", async ({ page }) => {
  await createProjectAndOpen(page);

  // 문서 두 개: 하나는 본문에 검색어 포함
  await createDoc(page, "프롤로그");
  const editor = page.locator(".prose-editor");
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type("칼과 방패가 부딪치는 소리.");
  await page.waitForTimeout(1500); // 자동저장 flush

  await createDoc(page, "에필로그");

  // 검색 패널 열기 → 본문 단어로 검색
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.getByLabel("문서 검색").fill("방패");

  const results = page.getByRole("list", { name: "검색 결과" });
  await expect(results.getByText("프롤로그")).toBeVisible();
  await expect(results.getByText("에필로그")).toHaveCount(0);

  // 결과 클릭 → 해당 문서가 에디터에 열린다(검색 패널은 닫힘)
  await results.getByRole("button").first().click();
  await expect(page.getByRole("heading", { name: "프롤로그" })).toBeVisible();
});

test("작품 전체를 파일로 내보낸다 (다운로드 트리거)", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화");
  const editor = page.locator(".prose-editor");
  await editor.click();
  await page.keyboard.type("본문 내용입니다.");
  await page.waitForTimeout(1500);

  // 내보내기 모달 → 작품 전체 TXT 다운로드
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "내보내기" });
  await expect(dialog).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  // '작품 전체' 섹션의 TXT 버튼(두 번째 TXT)
  await dialog
    .locator("section", { hasText: "작품 전체" })
    .getByRole("button", { name: "TXT" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.txt$/);
});
