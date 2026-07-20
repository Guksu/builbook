import { test, expect, type Page } from "@playwright/test";

function count(page: Page, store: "projects" | "documents") {
  return page.evaluate(
    (s) =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open("builbook");
        req.onsuccess = () => {
          const tx = req.result.transaction(s, "readonly");
          const c = tx.objectStore(s).count();
          c.onsuccess = () => resolve(c.result);
          c.onerror = () => reject(c.error);
        };
        req.onerror = () => reject(req.error);
      }),
    store,
  );
}

async function newProject(page: Page, title = "테스트") {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

test("공백만 입력한 제목으로는 문서가 생성되지 않는다", async ({ page }) => {
  await newProject(page);

  // PromptModal: 공백 제목이면 만들기 버튼이 비활성 → 생성 안 됨
  await page.getByRole("button", { name: "+ 문서" }).click();
  const dialog = page.getByRole("dialog", { name: "새 문서" });
  await dialog.getByLabel("문서 제목").fill("   ");
  await expect(
    dialog.getByRole("button", { name: "만들기", exact: true }),
  ).toBeDisabled();
  expect(await count(page, "documents")).toBe(0);

  // 유효 제목 → 생성됨 (+ 앞뒤 공백은 trim)
  await dialog.getByLabel("문서 제목").fill("  1화  ");
  await dialog.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "1화", exact: true })).toBeVisible();
  expect(await count(page, "documents")).toBe(1);
});

test("작품 삭제 시 그 작품의 문서까지 cascade 삭제된다", async ({ page }) => {
  await newProject(page, "삭제대상");
  await page.getByRole("button", { name: "+ 문서" }).click();
  const newDocDialog = page.getByRole("dialog", { name: "새 문서" });
  await newDocDialog.getByLabel("문서 제목").fill("문서X");
  await newDocDialog.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "문서X" })).toBeVisible();
  expect(await count(page, "documents")).toBe(1);

  // 대시보드에서 작품 삭제
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "작품 삭제" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "삭제", exact: true }).click();

  await expect(page.getByText("삭제대상")).toHaveCount(0);
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  // cascade: 고아 문서 없음
  expect(await count(page, "projects")).toBe(0);
  expect(await count(page, "documents")).toBe(0);
});
