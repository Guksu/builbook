import { test, expect, type Page } from "@playwright/test";

// 리서치 노트 → 바인더 인물·설정 카드(2026-10). 리서치 패널은 없어졌고, 옛 노트는 작업실을 열 때
// '리서치 노트' 폴더의 카드로 한 번 옮겨진다. 원래 노트 기록은 지우지 않는다.

const tree = (page: Page) => page.getByRole("tree", { name: "문서 트리" });

async function createProjectAndOpen(page: Page): Promise<string> {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("노트 옮기기 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
  return page.url().split("/projects/")[1]!;
}

// 리서치 패널이 있던 시절에 만든 노트를 그대로 흉내 내 IndexedDB에 넣는다.
function seedNotes(page: Page, projectId: string) {
  return page.evaluate(
    (pid) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("builbook");
        req.onsuccess = () => {
          const tx = req.result.transaction("notes", "readwrite");
          const store = tx.objectStore("notes");
          const base = { projectId: pid, updatedAt: "2026-09-01T00:00:00.000Z" };
          store.put({ ...base, id: "n-set", category: "SETTING", title: "북방 성채", role: null, body: "얼음 벽으로 둘러싸인 요새.", createdAt: "2026-09-01T00:00:00.000Z" });
          store.put({ ...base, id: "n-char", category: "CHARACTER", title: "강서준", role: "주인공", body: "회귀한 검사.", createdAt: "2026-09-02T00:00:00.000Z" });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      }),
    projectId,
  );
}

function countNotes(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open("builbook");
        req.onsuccess = () => {
          const c = req.result.transaction("notes", "readonly").objectStore("notes").count();
          c.onsuccess = () => resolve(c.result);
          c.onerror = () => reject(c.error);
        };
        req.onerror = () => reject(req.error);
      }),
  );
}

test("옛 리서치 노트는 작업실을 열 때 '리서치 노트' 폴더의 카드로 한 번만 옮겨진다", async ({ page }) => {
  const projectId = await createProjectAndOpen(page);
  await seedNotes(page, projectId);
  await page.reload();

  await expect(page.getByText("리서치 노트 2개를 바인더 '리서치 노트' 폴더의 카드로 옮겼어요.")).toBeVisible();
  const folder = tree(page).getByRole("treeitem", { name: "리서치 노트" });
  await expect(folder).toBeVisible();
  // 인물 먼저, 그다음 설정
  const items = tree(page).getByRole("treeitem");
  await expect(items).toHaveText([/1화/, /리서치 노트/, /강서준/, /북방 성채/]);

  // 카드 본문에 역할·설명이 옮겨져 있다
  await tree(page).getByRole("treeitem", { name: "강서준" }).click();
  await expect(page.locator("main .prose-editor")).toContainText("주인공");
  await expect(page.locator("main .prose-editor")).toContainText("회귀한 검사.");

  // 다시 열어도 겹치지 않고, 원래 노트 기록은 남아 있다
  await page.reload();
  await expect(tree(page).getByRole("treeitem", { name: "강서준" })).toHaveCount(1);
  await expect(tree(page).getByRole("treeitem", { name: "리서치 노트" })).toHaveCount(1);
  await expect(page.getByText(/리서치 노트 \d+개를/)).toHaveCount(0);
  expect(await countNotes(page)).toBe(2);
});

test("패널 메뉴에 리서치가 없고, 노트가 없는 작품에는 폴더가 생기지 않는다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "패널", exact: true }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "연표" })).toBeVisible();
  await expect(page.getByRole("menuitemcheckbox", { name: /리서치/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(tree(page).getByRole("treeitem", { name: "리서치 노트" })).toHaveCount(0);
});
