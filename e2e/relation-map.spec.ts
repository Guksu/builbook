import { test, expect, type Page } from "@playwright/test";

// 인물 관계도 — 인물 카드가 노드, 손잡이 드래그로 관계선, 배치·관계 저장.

async function createProjectAndOpen(page: Page, title = "관계도 테스트") {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
}

async function createCharacter(page: Page, name: string) {
  await page.getByRole("button", { name: "카드 템플릿", exact: true }).click();
  await page.getByRole("menuitem", { name: "새 인물 카드" }).click();
  const nameInput = page.getByRole("textbox", { name: "이름" });
  await nameInput.fill(name);
  await nameInput.press("Enter");
  await expect(nameInput).toHaveCount(0);
  await expect(page.getByRole("treeitem", { name: name })).toBeVisible();
}

async function openRelations(page: Page) {
  await page.getByRole("button", { name: "관계", exact: true }).click();
  await expect(page.getByText("인물 관계도")).toBeVisible();
}

async function dragCenter(page: Page, from: ReturnType<Page["getByRole"]>, to: ReturnType<Page["getByRole"]>) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error("bounding box 없음");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

test("인물 카드가 없으면 빈 상태이고, 첫 카드를 만들면 노드로 나타난다", async ({ page }) => {
  await createProjectAndOpen(page);
  await openRelations(page);
  await expect(page.getByText("아직 인물 카드가 없어요.")).toBeVisible();
  await page.getByRole("button", { name: "첫 인물 카드 만들기" }).click();
  await expect(page.getByRole("button", { name: "인물 새 인물", exact: true })).toBeVisible();
  await expect(page.getByLabel("관계도 요약")).toHaveText("인물 1명 · 관계 0개");
});

test("손잡이에서 다른 인물로 끌면 관계가 생기고, 새로고침 뒤에도 남으며, 지울 수 있다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createCharacter(page, "테아르");
  await createCharacter(page, "루나");
  await openRelations(page);

  const handle = page.getByRole("button", { name: "테아르에서 관계 잇기" });
  const luna = page.getByRole("button", { name: "인물 루나", exact: true });
  await dragCenter(page, handle, luna);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("관계 만들기");
  await expect(dialog).toContainText("테아르 ↔ 루나");
  await dialog.getByLabel("종류", { exact: true }).selectOption("연인");
  await dialog.getByLabel("테아르 → 루나").fill("짝사랑");
  await dialog.getByLabel("루나 → 테아르").fill("경계");
  await dialog.getByRole("button", { name: "만들기" }).click();

  const edge = page.getByRole("button", { name: "관계 테아르 – 루나: 연인" });
  await expect(edge).toBeVisible();
  await expect(edge).toContainText("짝사랑");
  await expect(edge).toContainText("경계");
  await expect(page.getByLabel("관계도 요약")).toHaveText("인물 2명 · 관계 1개");

  await page.reload();
  await openRelations(page);
  await expect(page.getByRole("button", { name: "관계 테아르 – 루나: 연인" })).toBeVisible();

  // 같은 두 인물을 다시 이으면 새로 만들지 않고 고친다.
  await dragCenter(
    page,
    page.getByRole("button", { name: "루나에서 관계 잇기" }),
    page.getByRole("button", { name: "인물 테아르", exact: true }),
  );
  await expect(page.getByRole("dialog")).toContainText("관계 고치기");
  await page.getByRole("dialog").getByRole("button", { name: "관계 삭제" }).click();
  await expect(page.getByRole("button", { name: /관계 테아르 – 루나/ })).toHaveCount(0);
  await expect(page.getByLabel("관계도 요약")).toHaveText("인물 2명 · 관계 0개");
});

test("노드를 끌어 옮기면 위치가 저장되고, 자동 배치로 되돌릴 수 있다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createCharacter(page, "강산");
  await createCharacter(page, "유진");
  await openRelations(page);

  const node = page.locator("g[data-node-id]").first();
  const before = await node.getAttribute("transform");
  const box = await node.boundingBox();
  if (!box) throw new Error("bounding box 없음");
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 140, { steps: 10 });
  await page.mouse.up();
  const after = await node.getAttribute("transform");
  expect(after).not.toBe(before);

  await page.reload();
  await openRelations(page);
  await expect(page.locator("g[data-node-id]").first()).toHaveAttribute("transform", after!);

  await page.getByRole("button", { name: "자동 배치" }).click();
  await expect(page.locator("g[data-node-id]").first()).toHaveAttribute("transform", before!);
});
