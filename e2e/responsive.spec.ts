import { test, expect } from "@playwright/test";

// 좁은 화면(휴대폰) — 바인더는 드로어로, 우측 패널은 오버레이로 뜬다.
test.use({ viewport: { width: 390, height: 844 } });

async function createProjectAndOpen(page: import("@playwright/test").Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("모바일 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

test("휴대폰 폭: 바인더는 숨겨져 있고, 버튼으로 열어 문서를 고르면 닫힌다", async ({ page }) => {
  await createProjectAndOpen(page);
  const tree = page.getByRole("tree", { name: "문서 트리" });
  await expect(page.locator(".prose-editor")).toBeVisible();
  await expect(tree).toBeHidden();

  await page.getByRole("button", { name: "바인더", exact: true }).click();
  await expect(tree).toBeVisible();

  await page.getByRole("treeitem", { name: "1화" }).click();
  await expect(tree).toBeHidden();
  await expect(page.locator(".prose-editor")).toBeVisible();
});

test("휴대폰 폭: 인스펙터를 열면 오버레이로 뜨고 다시 누르면 닫힌다", async ({ page }) => {
  await createProjectAndOpen(page);
  // 좁은 화면에서는 인스펙터 칩이 숨고 "⋯" 메뉴에 들어간다
  const toggleInspector = async () => {
    await page.getByRole("button", { name: "더 보기" }).click();
    await page.getByRole("menuitemcheckbox", { name: "인스펙터" }).click();
  };
  await toggleInspector();
  await expect(page.getByRole("region", { name: "작품 목표" })).toBeVisible();
  await toggleInspector();
  await expect(page.getByRole("region", { name: "작품 목표" })).toBeHidden();
});

test("휴대폰 폭: 상단 바가 화면 밖으로 넘치지 않고, 숨긴 도구는 모두 \"⋯\" 메뉴에 있다", async ({ page }) => {
  await createProjectAndOpen(page);
  await expect(page.locator(".prose-editor")).toBeVisible();
  // 오른쪽 도구 묶음은 따로 가로 스크롤되므로 그 안에서 넘치는지 본다
  const tools = page.getByRole("toolbar", { name: "작업 패널과 도구" });
  const overflow = await tools.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const more = await page.getByRole("button", { name: "더 보기" }).boundingBox();
  expect(more && more.x + more.width).toBeLessThanOrEqual(390);
  await expect(page.getByRole("button", { name: "집중" })).toBeHidden();
  await expect(page.getByRole("button", { name: "패널", exact: true })).toBeHidden();

  await page.getByRole("button", { name: "더 보기" }).click();
  const menu = page.getByRole("menu", { name: "더 보기 메뉴" });
  await expect(menu.getByRole("menuitemcheckbox")).toHaveText(["연표", "현황", "점검", "검색", "영감", "인스펙터"]);
  await expect(menu.getByRole("menuitem")).toHaveText(["목표", "집중 모드", "미리보기", "내보내기"]);

  await menu.getByRole("menuitemcheckbox", { name: "현황" }).click();
  await expect(page.getByRole("heading", { name: "집필 현황" })).toBeVisible();

  await page.getByRole("button", { name: "더 보기" }).click();
  await page.getByRole("menuitem", { name: "목표" }).click();
  await expect(page.getByRole("dialog", { name: "목표" })).toBeVisible();
});
