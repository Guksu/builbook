import { test, expect, type Page } from "@playwright/test";

// 작품 1개 생성하고 작업실 URL로 이동 (document.spec.ts와 동일 헬퍼)
async function createProjectAndOpen(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("집중·목표 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

// '+ 문서'는 PromptModal로 제목을 받는다
async function createDoc(page: Page, title: string) {
  await page.getByRole("button", { name: "+ 문서" }).click();
  const dialog = page.getByRole("dialog", { name: "새 문서" });
  await dialog.getByLabel("문서 제목").fill(title);
  await dialog.getByRole("button", { name: "만들기", exact: true }).click();
}

test("집중 모드: 토글 시 바인더가 숨겨졌다 ESC로 다시 나타난다", async ({
  page,
}) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화 - 집중");

  const editor = page.locator(".prose-editor");
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type("몰입해서 쓰는 첫 문장.");

  // 바인더(nav)가 처음엔 보인다
  const binder = page.locator("nav");
  await expect(binder).toBeVisible();

  // 집중 모드 진입 → 바인더 숨김, 에디터는 그대로(입력 내용 유지)
  await page.getByRole("button", { name: "집중", exact: true }).click();
  await expect(binder).toBeHidden();
  await expect(page.getByRole("button", { name: /나가기/ })).toBeVisible();
  await expect(editor).toContainText("몰입해서 쓰는 첫 문장.");

  // ESC로 해제 → 바인더 복귀, 에디터 인스턴스 유지(내용 그대로)
  await page.keyboard.press("Escape");
  await expect(binder).toBeVisible();
  await expect(editor).toContainText("몰입해서 쓰는 첫 문장.");
});

test("문서 목표 설정 시 진행률 바가 표시된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화 - 목표");

  const editor = page.locator(".prose-editor");
  await editor.click();
  await page.keyboard.type("첫 문장 하나 둘 셋"); // 공백 기준 5단어

  // 인스펙터 열기(정보 탭이 기본)
  await page.getByRole("button", { name: "인스펙터", exact: true }).click();

  // 목표 미설정 상태에서는 진행률 바가 없다(작품·문서 모두)
  await expect(page.getByRole("progressbar")).toHaveCount(0);

  // 문서 목표를 10으로 설정 → 진행률 바 등장 + 현재/목표 표기
  const goalInput = page.getByLabel("문서 목표 단어 수");
  await goalInput.fill("10");
  await goalInput.blur();

  await expect(page.getByRole("progressbar")).toHaveCount(1);
  await expect(page.getByText("/ 10단어")).toBeVisible();
});
