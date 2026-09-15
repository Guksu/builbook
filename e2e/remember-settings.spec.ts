import { test, expect, type Page } from "@playwright/test";

// 화면 설정 기억 — 바인더 정렬, 코르크보드 카드 크기, 컴파일 프리셋(작품 데이터).

async function createProjectAndOpen(page: Page, title = "기억 테스트") {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

test("바인더 정렬 기준은 새로고침 후에도 유지된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "정렬" }).click();
  await page.getByRole("menuitemradio", { name: "이름순" }).click();
  await page.reload();
  await page.getByRole("button", { name: "정렬" }).click();
  await expect(page.getByRole("menuitemradio", { name: "이름순" })).toHaveAttribute("aria-checked", "true");
});

test("코르크보드 카드 크기는 새로고침 후에도 유지된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "카드", exact: true }).click();
  await page.getByRole("group", { name: "카드 크기" }).getByRole("button", { name: "작게" }).click();
  await expect(page.getByRole("list", { name: "코르크보드 카드" })).toHaveAttribute("data-card-size", "small");
  await page.reload();
  await page.getByRole("button", { name: "카드", exact: true }).click();
  await expect(page.getByRole("list", { name: "코르크보드 카드" })).toHaveAttribute("data-card-size", "small");
});

test("컴파일 프리셋을 저장하면 다시 열었을 때 옵션이 되살아난다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "내보내기" });
  await dialog.getByLabel("회차 구분").selectOption("stars");
  await dialog.getByLabel("회차 제목 포함").uncheck();
  await dialog.getByLabel("프리셋 이름").fill("플랫폼용");
  await dialog.getByRole("button", { name: "프리셋 저장" }).click();
  await expect(dialog.getByLabel("컴파일 프리셋")).toHaveValue(/.+/);

  await page.reload();
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  const again = page.getByRole("dialog", { name: "내보내기" });
  await expect(again.getByLabel("회차 구분")).toHaveValue("none"); // 열 때는 기본값
  await again.getByLabel("컴파일 프리셋").selectOption({ label: "플랫폼용" });
  await expect(again.getByLabel("회차 구분")).toHaveValue("stars");
  await expect(again.getByLabel("회차 제목 포함")).not.toBeChecked();
  await again.getByRole("button", { name: "프리셋 삭제" }).click();
  await expect(again.getByLabel("컴파일 프리셋")).toHaveValue("");
});
