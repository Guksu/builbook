import { test, expect, type Page } from "@playwright/test";

// 회귀 방지: 빈 상태에서 첫 작품 생성 시 중복 생성되던 버그.
// 원인 — Enter 제출 경로에 동시실행 가드가 없고, 한글 IME가 Enter keydown을
// 두 번 발생시켜 createProject가 2회 호출 → 작품 2개 생성.
// 수정 — handleCreate에 동기 in-flight 가드(ref) + Enter의 isComposing 가드.

async function projectCount(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open("builbook");
        req.onsuccess = () => {
          const tx = req.result.transaction("projects", "readonly");
          const c = tx.objectStore("projects").count();
          c.onsuccess = () => resolve(c.result);
          c.onerror = () => reject(c.error);
        };
        req.onerror = () => reject(req.error);
      }),
  );
}

test("Enter 연속 2회로 제출해도 작품은 1개만 생성된다", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  const input = page.getByPlaceholder(/회귀한 검사/);
  await input.fill("유일작품");
  // IME 더블 fire 모사: 같은 틱에 Enter keydown 2개를 동기 디스패치
  // (네비게이션 전에 두 핸들러가 모두 호출됨 → 동시실행 가드 검증)
  await input.evaluate((el) => {
    const ev = () =>
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    el.dispatchEvent(ev());
    el.dispatchEvent(ev());
  });
  await expect(page).toHaveURL(/\/projects\/.+/);

  expect(await projectCount(page)).toBe(1);
});

test("만들기 버튼 빠른 더블클릭에도 1개만 생성된다", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("유일작품2");
  const btn = page.getByRole("button", { name: "만들기", exact: true });
  await btn.dblclick();
  await expect(page).toHaveURL(/\/projects\/.+/);

  expect(await projectCount(page)).toBe(1);
});
