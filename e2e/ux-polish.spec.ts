import { test, expect, type Page } from "@playwright/test";

// UX 다듬기 — 본문 표시 설정, 탭 닫기 전 백업 복구, 입력 높이(h-28) 수정.

async function createProjectAndOpen(page: Page, title = "UX 테스트") {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
}

test("본문 표시 설정(글자 크기·폭)이 적용되고 새로고침 후에도 유지된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "본문 표시 설정" }).click();
  await page.getByRole("group", { name: "글자 크기" }).getByRole("button", { name: "크게", exact: true }).click();
  await page.getByRole("group", { name: "본문 폭" }).getByRole("button", { name: "넓게", exact: true }).click();
  const editor = page.locator("main .prose-editor");
  await expect(editor).toHaveCSS("font-size", "19px");
  await page.reload();
  await expect(page.locator("main .prose-editor")).toHaveCSS("font-size", "19px");
});

test("탭이 닫히기 전 남긴 백업을 다음에 열 때 되살린다", async ({ page }) => {
  await createProjectAndOpen(page);
  // 현재 문서 id를 IndexedDB에서 읽어 백업을 흉내 낸다(pagehide 백업과 같은 형식).
  const docId = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const req = indexedDB.open("builbook");
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const all = db.transaction("documents").objectStore("documents").getAll();
          all.onsuccess = () => resolve((all.result as { id: string }[])[0].id);
        };
      }),
  );
  await page.evaluate((id) => {
    const content = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "닫기 직전에 쓴 문장" }] }],
    };
    localStorage.setItem(
      `builbook:doc-backup:${id}`,
      JSON.stringify({ content, measure: { words: 3, chars: 11, charsNoSpace: 9 } }),
    );
  }, docId);
  await page.reload();
  await expect(page.locator("main .prose-editor")).toContainText("닫기 직전에 쓴 문장");
  await expect(page.getByText("닫기 전에 저장되지 않았던 내용을 되살렸어요.")).toBeVisible();
  // 백업은 한 번 쓰고 지운다
  expect(await page.evaluate((id) => localStorage.getItem(`builbook:doc-backup:${id}`), docId)).toBeNull();
});

test("내보내기 옵션의 select·input 높이가 28px로 고정된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "더 보기" }).click();
  await page.getByRole("menuitem", { name: "내보내기" }).click();
  const dialog = page.getByRole("dialog", { name: "내보내기" });
  await expect(dialog.getByLabel("회차 구분")).toHaveCSS("height", "28px");
  await expect(dialog.getByLabel("시작 회차")).toHaveCSS("height", "28px");
});
