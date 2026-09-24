import { test, expect, type Page } from "@playwright/test";

// 작품 제목 바꾸기 — 작품 목록 카드(연필 → 작은 창)와 작업실 상단 바(제목 클릭 → 입력칸).

async function createProjectAndOpen(page: Page, title: string) {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
}

test("작품 목록에서 연필 버튼으로 제목을 바꾸면 작업실로 넘어가지 않고, 새로고침해도 유지된다", async ({ page }) => {
  await createProjectAndOpen(page, "처음 제목");
  await page.goto("/dashboard");

  await page.getByRole("heading", { name: "처음 제목" }).hover();
  await page.getByRole("button", { name: "작품 제목 바꾸기" }).click();
  const dialog = page.getByRole("dialog", { name: "작품 제목 바꾸기" });
  const input = dialog.getByLabel("작품 제목");
  await expect(input).toHaveValue("처음 제목");

  // 빈 제목은 저장할 수 없다
  await input.fill("   ");
  await expect(dialog.getByRole("button", { name: "저장" })).toBeDisabled();

  // 취소하면 그대로
  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "처음 제목" })).toBeVisible();

  await page.getByRole("heading", { name: "처음 제목" }).hover();
  await page.getByRole("button", { name: "작품 제목 바꾸기" }).click();
  await dialog.getByLabel("작품 제목").fill("  바뀐 제목  ");
  await dialog.getByLabel("작품 제목").press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "바뀐 제목", exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "바뀐 제목", exact: true })).toBeVisible();
  await expect(page.getByText("처음 제목")).toHaveCount(0);
});

test("작업실 상단 바에서 제목을 눌러 바꾸면 작품 목록에도 반영되고, Esc·빈 제목은 저장하지 않는다", async ({ page }) => {
  await createProjectAndOpen(page, "헤더 제목");
  const header = page.locator("header").first();
  const titleButton = (name: string) => header.getByRole("button", { name, exact: true });
  const titleInput = header.getByRole("textbox", { name: "작품 제목" });

  // Esc = 취소
  await titleButton("헤더 제목").click();
  await expect(titleInput).toHaveValue("헤더 제목");
  await titleInput.fill("취소될 제목");
  await titleInput.press("Escape");
  await expect(titleButton("헤더 제목")).toBeVisible();

  // 빈 제목 = 저장 안 함
  await titleButton("헤더 제목").click();
  await titleInput.fill("");
  await titleInput.press("Enter");
  await expect(titleButton("헤더 제목")).toBeVisible();

  // Enter = 저장
  await titleButton("헤더 제목").click();
  await titleInput.fill("새 헤더 제목");
  await titleInput.press("Enter");
  await expect(titleButton("새 헤더 제목")).toBeVisible();

  // 새로고침 없이 뒤로 가도 목록에 새 제목이 보인다(목록 캐시도 함께 갱신)
  await page.getByRole("link", { name: "작품 목록으로 돌아가기" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "새 헤더 제목", exact: true })).toBeVisible();
  await expect(page.getByText("헤더 제목", { exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "새 헤더 제목", exact: true })).toBeVisible();
});
