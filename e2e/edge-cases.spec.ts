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

// 새 문서: "새 문서" 아이콘 → 기본 이름("N화")으로 즉시 생성 → 인라인 입력에 제목 입력 → Enter.
async function createDoc(page: Page, title: string) {
  await page.getByRole("button", { name: "새 문서" }).click();
  const name = page.getByRole("textbox", { name: "이름" });
  await name.fill(title);
  await name.press("Enter");
  await expect(name).toHaveCount(0);
}

test("공백만 입력해도 기본 이름이 남는다 (이름 없는 문서는 생기지 않는다)", async ({
  page,
}) => {
  await newProject(page);
  // 새 작품에는 "1화"가 미리 만들어져 있다(빈 바인더 대신 바로 쓸 수 있게).
  expect(await count(page, "documents")).toBe(1);

  // 새 문서는 다이얼로그 없이 다음 회차 이름으로 즉시 생성된다.
  await page.getByRole("button", { name: "새 문서" }).click();
  const name = page.getByRole("textbox", { name: "이름" });
  await expect(name).toHaveValue("2화");

  // 공백만 남기고 확정 → 기본 이름 유지
  await name.fill("   ");
  await name.press("Enter");
  await expect(name).toHaveCount(0);
  await expect(page.getByRole("treeitem", { name: "2화" })).toBeVisible();
  expect(await count(page, "documents")).toBe(2);

  // 이름 변경(F2)에서도 앞뒤 공백은 잘라 저장한다 — 문서가 더 생기지도 않는다.
  const row = page.getByRole("treeitem", { name: "2화" });
  await row.click();
  await row.press("F2");
  const rename = page.getByRole("textbox", { name: "이름" });
  await rename.fill("  서장  ");
  await rename.press("Enter");
  await expect(page.getByRole("treeitem", { name: "서장" })).toBeVisible();
  expect(await count(page, "documents")).toBe(2);
});

test("작품 삭제 시 그 작품의 문서까지 cascade 삭제된다", async ({ page }) => {
  await newProject(page, "삭제대상");
  await createDoc(page, "문서X");
  await expect(page.getByRole("treeitem", { name: "문서X" })).toBeVisible();
  // 자동 생성된 "1화" + 방금 만든 "문서X"
  expect(await count(page, "documents")).toBe(2);

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
