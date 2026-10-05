import { test, expect, type Page } from "@playwright/test";

// 검색 키우기(2026-10) — 결과를 누르면 본문으로 넘어가 그 위치를 보여 주고(찾기 바),
// 작품 전체 바꾸기는 바꾸기 전 문서마다 스냅샷을 남긴다.

async function createProjectAndOpen(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("검색 키우기 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
}

async function newDocWithBody(page: Page, title: string, body: string) {
  await page.getByRole("button", { name: "새 문서" }).click();
  const name = page.getByRole("textbox", { name: "이름" });
  await name.fill(title);
  await name.press("Enter");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.locator("main .prose-editor").click();
  await page.keyboard.type(body);
}

async function waitSaved(page: Page) {
  // 자동저장(debounce 800ms) 후 상단 바 합계에 반영될 때까지
  await page.waitForTimeout(1200);
}

test("검색 결과를 누르면 카드 화면에서도 본문으로 넘어가 찾기 바에 그 위치를 보여 준다", async ({ page }) => {
  await createProjectAndOpen(page);
  await newDocWithBody(page, "2화", "첫 줄.\n둘째 줄에 강서준이 있다.");
  await waitSaved(page);

  await page.getByRole("button", { name: "카드", exact: true }).click();
  await page.keyboard.press("Control+Shift+Digit4"); // 검색
  const panel = page.getByRole("region", { name: "작품 검색" });
  await panel.getByLabel("문서 검색").fill("강서준");
  await panel.getByRole("list", { name: "검색 결과" }).getByRole("button", { name: /2화/ }).click();

  await expect(page.getByRole("heading", { name: "2화" })).toBeVisible();
  const bar = page.getByRole("search", { name: "찾기 및 바꾸기" });
  await expect(bar.getByLabel("찾을 말")).toHaveValue("강서준");
  await expect(bar.getByText("1/1")).toBeVisible();
  await expect(page.locator("main .prose-editor .find-match--active")).toHaveText("강서준");
});

test("작품 전체 바꾸기: 여러 문서를 한 번에 바꾸고, 바꾸기 전 본문은 문서마다 스냅샷으로 남는다", async ({ page }) => {
  await createProjectAndOpen(page);
  await newDocWithBody(page, "2화", "강서준이 웃었다.");
  await newDocWithBody(page, "3화", "KANG과 강서준, 다시 강서준.");
  await waitSaved(page);

  await page.keyboard.press("Control+Shift+Digit4");
  const panel = page.getByRole("region", { name: "작품 검색" });
  await panel.getByLabel("문서 검색").fill("강서준");
  await panel.getByLabel("작품 전체에서 바꿀 말").fill("강준");
  await panel.getByRole("button", { name: "전체 바꾸기" }).click();

  const confirm = page.getByRole("dialog", { name: /전체 바꾸기/ });
  await expect(confirm).toContainText("문서 2개, 3곳");
  await confirm.getByRole("button", { name: "전체 바꾸기" }).click();
  await expect(page.getByText("문서 2개에서 3곳을 바꿨어요.", { exact: false })).toBeVisible();

  // 열려 있던 3화는 다시 불러와 바뀐 본문을 보여 준다
  const editor = page.locator("main .prose-editor");
  await expect(editor).toContainText("KANG과 강준, 다시 강준.");
  await page.getByRole("treeitem", { name: "2화" }).click();
  await expect(editor).toContainText("강준이 웃었다.");
  await expect(editor).not.toContainText("강서준");

  // 바꾸기 전 본문이 스냅샷으로 남아 있다
  await page.keyboard.press("Control+Shift+Digit6"); // 인스펙터
  await page.getByRole("tab", { name: "스냅샷" }).click();
  await expect(page.getByText(/전체 바꾸기 전 자동 저장/)).toBeVisible();

  // 새로고침해도 바뀐 본문이 유지된다
  await page.reload();
  await page.getByRole("treeitem", { name: "3화" }).click();
  await expect(page.locator("main .prose-editor")).toContainText("KANG과 강준, 다시 강준.");
});

test("방금 친 글이 아직 저장되기 전에 전체 바꾸기를 해도 그 글까지 바뀌고 사라지지 않는다", async ({ page }) => {
  await page.clock.install();
  await createProjectAndOpen(page);
  await newDocWithBody(page, "2화", "강서준이 웃었다.");
  await page.clock.runFor(1500); // 첫 문장은 저장

  // 시계를 멈춰 자동저장(0.8초 뒤)이 돌지 않게 한 채로 글을 더 친다
  await page.clock.pauseAt(Date.now() + 2000);
  const editor = page.locator("main .prose-editor");
  await editor.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" 강서준이 돌아섰다.");

  await page.keyboard.press("Control+Shift+Digit4");
  const panel = page.getByRole("region", { name: "작품 검색" });
  await panel.getByLabel("문서 검색").fill("강서준");
  await panel.getByLabel("작품 전체에서 바꿀 말").fill("강준");
  await panel.getByRole("button", { name: "전체 바꾸기" }).click();
  await page.getByRole("dialog", { name: /전체 바꾸기/ }).getByRole("button", { name: "전체 바꾸기" }).click();

  await expect(editor).toContainText("강준이 웃었다. 강준이 돌아섰다.");
  await page.clock.resume();
  await page.clock.runFor(1500);
  await page.reload();
  await page.getByRole("treeitem", { name: "2화" }).click();
  await expect(page.locator("main .prose-editor")).toContainText("강준이 웃었다. 강준이 돌아섰다.");
});
