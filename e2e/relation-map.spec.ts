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

test("관계 종류별 색·라벨 색 띠가 붙고, 목록 보기로 전환하면 표가 나온다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createCharacter(page, "테아르");
  await createCharacter(page, "루나");
  // 테아르에 라벨 달기(인스펙터)
  await page.getByRole("treeitem", { name: "테아르" }).click();
  await page.keyboard.press("Control+Shift+Digit8");
  await page.getByLabel("문서 라벨").selectOption({ index: 1 });
  await page.keyboard.press("Control+Shift+Digit8");

  await openRelations(page);
  await expect(page.locator("rect[data-label-color]")).toHaveCount(1);

  await dragCenter(
    page,
    page.getByRole("button", { name: "테아르에서 관계 잇기" }),
    page.getByRole("button", { name: "인물 루나", exact: true }),
  );
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("종류", { exact: true }).selectOption("적");
  await dialog.getByRole("button", { name: "만들기" }).click();
  await expect(page.getByRole("button", { name: "관계 테아르 – 루나: 적" })).toHaveClass(/text-label-red/);

  await page.getByRole("group", { name: "관계도 보기" }).getByRole("button", { name: "목록" }).click();
  const table = page.getByRole("table", { name: "관계 목록" });
  await expect(table).toBeVisible();
  await expect(table.getByRole("row").nth(1)).toContainText("테아르");
  await expect(table.getByRole("row").nth(1)).toContainText("적");
  await table.getByRole("row").nth(1).click();
  await expect(page.getByRole("dialog")).toContainText("관계 고치기");
  await page.getByRole("dialog").getByRole("button", { name: "취소" }).click();

  // 보기 선택은 기억된다
  await page.reload();
  await openRelations(page);
  await expect(page.getByRole("table", { name: "관계 목록" })).toBeVisible();
});

test("회차별 변화를 적으면 시점 보기·연표에 나타난다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createCharacter(page, "테아르");
  await createCharacter(page, "루나");
  await openRelations(page);
  await dragCenter(
    page,
    page.getByRole("button", { name: "테아르에서 관계 잇기" }),
    page.getByRole("button", { name: "인물 루나", exact: true }),
  );
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("종류", { exact: true }).selectOption("동료");
  await dialog.getByRole("button", { name: "+ 변화 추가" }).click();
  await dialog.getByLabel("변화 회차").selectOption({ label: "1화" });
  await dialog.getByLabel("변화 내용").fill("동맹이 된다");
  await dialog.getByRole("button", { name: "만들기" }).click();

  const edge = page.getByRole("button", { name: "관계 테아르 – 루나: 동료" });
  await expect(edge).toContainText("동맹이 된다"); // 최신 시점
  const point = page.getByLabel("시점");
  await expect(point).toBeVisible();
  await point.selectOption({ label: "1화까지" });
  await expect(edge).toContainText("동맹이 된다");

  // 목록에도 최근 변화가 보인다
  await page.getByRole("group", { name: "관계도 보기" }).getByRole("button", { name: "목록" }).click();
  await expect(page.getByRole("table", { name: "관계 목록" })).toContainText("동맹이 된다");

  // 연표 패널의 관계 변화 절
  await page.keyboard.press("Control+Shift+Digit1");
  const section = page.getByRole("region", { name: "관계 변화" });
  await expect(section).toContainText("1화");
  await expect(section).toContainText("테아르 – 루나");
  await expect(section).toContainText("동맹이 된다");
});

test("종류 색을 고르면 같은 종류의 선이 모두 바뀌고, 이미지로 내려받을 수 있다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createCharacter(page, "테아르");
  await createCharacter(page, "루나");
  await openRelations(page);
  await dragCenter(
    page,
    page.getByRole("button", { name: "테아르에서 관계 잇기" }),
    page.getByRole("button", { name: "인물 루나", exact: true }),
  );
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("종류", { exact: true }).selectOption("연인");
  await dialog.getByLabel(/이 종류의 선 색/).selectOption("purple");
  await dialog.getByRole("button", { name: "만들기" }).click();
  const edge = page.getByRole("button", { name: "관계 테아르 – 루나: 연인" });
  await expect(edge).toHaveClass(/text-label-purple/);

  // 색 선택은 작품에 저장된다
  await page.reload();
  await openRelations(page);
  await expect(page.getByRole("button", { name: "관계 테아르 – 루나: 연인" })).toHaveClass(/text-label-purple/);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "이미지 저장" }).click();
  await page.getByRole("menuitem", { name: "컬러 PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^관계도 테스트-관계도-\d{4}-\d{2}-\d{2}\.png$/);
  await expect(page.getByText("관계도 이미지를 내려받았어요.")).toBeVisible();
});

test("회차에 연결된 연표 사건은 시점으로 고를 수 있다", async ({ page }) => {
  await createProjectAndOpen(page);
  // 연표 사건 하나를 1화에 연결
  await page.keyboard.press("Control+Shift+Digit1");
  await page.getByRole("button", { name: "+ 사건" }).click();
  await page.getByLabel("사건 이름").fill("주인공 회귀");
  await page.getByLabel("연결할 회차").selectOption({ label: "1화" });
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await page.keyboard.press("Control+Shift+Digit1");

  await createCharacter(page, "테아르");
  await createCharacter(page, "루나");
  await openRelations(page);
  await dragCenter(
    page,
    page.getByRole("button", { name: "테아르에서 관계 잇기" }),
    page.getByRole("button", { name: "인물 루나", exact: true }),
  );
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "+ 변화 추가" }).click();
  await dialog.getByLabel("변화 내용").fill("서로 알아본다");
  await dialog.getByRole("button", { name: "만들기" }).click();

  const point = page.getByLabel("시점");
  await point.selectOption({ label: "주인공 회귀 · 1화" });
  await expect(page.getByRole("button", { name: /관계 테아르 – 루나/ })).toContainText("서로 알아본다");
});

test("노드 폭은 이름 길이를 따르고, 흑백 이미지도 내려받으며, 인스펙터에 이 인물의 관계가 요약된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createCharacter(page, "루나");
  await createCharacter(page, "기사단장 로렌스");
  await openRelations(page);
  const narrow = page.getByRole("button", { name: "인물 루나", exact: true }).locator("rect[data-node-width]");
  const wide = page.getByRole("button", { name: "인물 기사단장 로렌스", exact: true }).locator("rect[data-node-width]");
  await expect(narrow).toHaveAttribute("data-node-width", "112");
  await expect(wide).toHaveAttribute("data-node-width", "160");

  await dragCenter(
    page,
    page.getByRole("button", { name: "루나에서 관계 잇기" }),
    page.getByRole("button", { name: "인물 기사단장 로렌스", exact: true }),
  );
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("종류", { exact: true }).selectOption("스승");
  await dialog.getByLabel("루나 → 기사단장 로렌스").fill("존경");
  await dialog.getByRole("button", { name: "만들기" }).click();
  await expect(page.getByRole("button", { name: "관계 루나 – 기사단장 로렌스: 스승" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "이미지 저장" }).click();
  await page.getByRole("menuitem", { name: "흑백 PNG (인쇄용)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/-관계도-흑백-\d{4}-\d{2}-\d{2}\.png$/);

  // 인스펙터 요약
  await page.getByRole("treeitem", { name: "루나" }).click();
  await page.keyboard.press("Control+Shift+Digit8");
  const summary = page.getByRole("region", { name: "이 인물의 관계" });
  await expect(summary).toContainText("기사단장 로렌스");
  await expect(summary).toContainText("스승");
  await expect(summary).toContainText("→ 존경");
  await summary.getByRole("button", { name: "관계도 열기" }).click();
  await expect(page.getByText("인물 관계도")).toBeVisible();
});
