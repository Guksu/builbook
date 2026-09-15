import { test, expect, type Page } from "@playwright/test";

// 바인더(옵시디언식 파일 탐색기) 전용 스펙 —
// 즉시 생성 + 인라인 이름 편집 / 폴더 접힘 영속 / 우클릭 메뉴 / 정렬 / 키보드 이동.

async function createProjectAndOpen(page: Page, title = "바인더 테스트") {
  await page.goto("/dashboard");
  // 하이드레이션 완료를 기다린다 — 빈 상태가 보이기 전에 누르면 클릭이 먹지 않는다.
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

const tree = (page: Page) => page.getByRole("tree", { name: "문서 트리" });
const nameInput = (page: Page) => page.getByRole("textbox", { name: "이름" });

test("새 문서는 다음 회차 이름으로 즉시 생성되고 그 자리에서 이름을 고친다", async ({
  page,
}) => {
  await createProjectAndOpen(page);
  // 새 작품에는 "1화"가 이미 만들어져 있다.
  await expect(tree(page).getByRole("treeitem", { name: "1화" })).toBeVisible();

  // 다이얼로그 없이 바로 생성 + 기본 이름이 선택된 입력이 열린다.
  await page.getByRole("button", { name: "새 문서" }).click();
  await expect(nameInput(page)).toHaveValue("2화");
  await expect(tree(page).getByRole("treeitem")).toHaveCount(2);

  await nameInput(page).fill("2화 - 각성");
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);
  await expect(
    tree(page).getByRole("treeitem", { name: "2화 - 각성" }),
  ).toBeVisible();

  // Esc로 빠져나오면 기본 이름("3화")이 그대로 남는다.
  await page.getByRole("button", { name: "새 문서" }).click();
  await expect(nameInput(page)).toHaveValue("3화");
  await nameInput(page).fill("버려질 이름");
  await nameInput(page).press("Escape");
  await expect(nameInput(page)).toHaveCount(0);
  await expect(tree(page).getByRole("treeitem", { name: "3화" })).toBeVisible();
});

test("더블클릭으로 이름을 바꾼다", async ({ page }) => {
  await createProjectAndOpen(page);

  await tree(page).getByRole("treeitem", { name: "1화" }).dblclick();
  await nameInput(page).fill("프롤로그");
  await nameInput(page).press("Enter");

  await expect(tree(page).getByRole("treeitem", { name: "프롤로그" })).toBeVisible();
  await expect(tree(page).getByRole("treeitem", { name: "1화" })).toHaveCount(0);
});

test("폴더 접기 상태가 새로고침 후에도 유지된다", async ({ page }) => {
  await createProjectAndOpen(page);

  await page.getByRole("button", { name: "새 폴더" }).click();
  await nameInput(page).fill("1부");
  await nameInput(page).press("Enter");
  const folder = tree(page).getByRole("treeitem", { name: "1부" });
  await expect(folder).toHaveAttribute("aria-expanded", "true");

  // 폴더를 고른 뒤 새 문서를 만들면 그 폴더 안에 들어간다(옵시디언과 동일).
  await folder.click();
  await page.getByRole("button", { name: "새 문서" }).click();
  await nameInput(page).fill("안쪽 문서");
  await nameInput(page).press("Enter");
  const child = tree(page).getByRole("treeitem", { name: "안쪽 문서" });
  await expect(child).toHaveAttribute("aria-level", "2");

  // chevron으로 접으면 자식 줄은 아예 사라진다.
  await page.getByRole("button", { name: "1부 접기" }).click();
  await expect(child).toHaveCount(0);

  await page.reload();
  await expect(tree(page).getByRole("treeitem", { name: "1부" })).toBeVisible();
  await expect(tree(page).getByRole("treeitem", { name: "안쪽 문서" })).toHaveCount(0);

  await page.getByRole("button", { name: "1부 펼치기" }).click();
  await expect(tree(page).getByRole("treeitem", { name: "안쪽 문서" })).toBeVisible();
});

test("우클릭 메뉴로 문서를 삭제한다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "새 문서" }).click();
  await nameInput(page).fill("지울 문서");
  await nameInput(page).press("Enter");

  await tree(page)
    .getByRole("treeitem", { name: "지울 문서" })
    .click({ button: "right" });
  const menu = page.getByRole("menu", { name: "지울 문서 메뉴" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "삭제" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click();

  await expect(tree(page).getByRole("treeitem", { name: "지울 문서" })).toHaveCount(0);
  // 휴지통으로 갔을 뿐이라 되살릴 수 있다.
  await page.getByRole("button", { name: "휴지통", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "휴지통 목록" }).getByText("지울 문서"),
  ).toBeVisible();
});

test("정렬 기준을 이름순으로 바꿨다 되돌린다", async ({ page }) => {
  await createProjectAndOpen(page);

  // 배치 순서: 히읗 → 1화 → 2화 (이름순이면 1화 → 2화 → 히읗)
  await tree(page).getByRole("treeitem", { name: "1화" }).dblclick();
  await nameInput(page).fill("히읗");
  await nameInput(page).press("Enter");
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "새 문서" }).click();
    await nameInput(page).press("Enter");
    await expect(nameInput(page)).toHaveCount(0);
  }

  const items = tree(page).getByRole("treeitem");
  await expect(items).toHaveCount(3);
  await expect(items.first()).toHaveAttribute("aria-label", "히읗");

  await page.getByRole("button", { name: "정렬" }).click();
  await page.getByRole("menuitemradio", { name: "이름순" }).click();
  await expect(items.first()).toHaveAttribute("aria-label", "1화");

  await page.getByRole("button", { name: "정렬" }).click();
  await expect(
    page.getByRole("menuitemradio", { name: "이름순" }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("menuitemradio", { name: "바인더 순서" }).click();
  await expect(items.first()).toHaveAttribute("aria-label", "히읗");
});

test("위/아래 화살표로 옮겨 다니고 Enter로 연다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "새 문서" }).click();
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);

  const items = tree(page).getByRole("treeitem");
  await items.first().click();
  await expect(items.first()).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(items.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(items.first()).toHaveAttribute("aria-selected", "false");
});
