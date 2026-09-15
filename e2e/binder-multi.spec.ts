import { test, expect, type Page } from "@playwright/test";

// 바인더 다중 선택(Ctrl·Shift 클릭)과 라벨 필터 —
// 스크리브너처럼 여러 회차를 한꺼번에 버리고, 폴더 밖으로 꺼내고, 한 라벨만 모아 본다.

async function createProjectAndOpen(page: Page, title = "다중 선택 테스트") {
  await page.goto("/dashboard");
  // 하이드레이션 완료를 기다린다 — 빈 상태가 보이기 전에 누르면 클릭이 먹지 않는다.
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  // 새 작품에는 "1화"가 이미 만들어져 있다.
  await expect(tree(page).getByRole("treeitem", { name: "1화" })).toBeVisible();
}

const tree = (page: Page) => page.getByRole("tree", { name: "문서 트리" });
const nameInput = (page: Page) => page.getByRole("textbox", { name: "이름" });

/** 상단 "새 문서"로 한 개 만들고 이름을 확정한다(이름을 안 주면 기본 "N화"). */
async function addDoc(page: Page, name?: string) {
  await page.getByRole("button", { name: "새 문서" }).click();
  if (name) await nameInput(page).fill(name);
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);
}

test("Shift+클릭으로 범위를 골라 한꺼번에 휴지통으로 보낸다", async ({ page }) => {
  await createProjectAndOpen(page);
  await addDoc(page, "2화");
  await addDoc(page, "3화");

  const items = tree(page).getByRole("treeitem");
  await expect(items).toHaveCount(3);

  // 첫 줄을 고른 뒤 Shift+클릭 → 보이는 순서대로 세 줄이 묶인다.
  await items.first().click();
  await items.nth(2).click({ modifiers: ["Shift"] });
  await expect(page.getByText("3개 선택")).toBeVisible();
  await expect(items.nth(1)).toHaveAttribute("data-multiselected", "true");

  await page.getByRole("button", { name: "선택 항목 휴지통으로" }).click();
  await expect(page.getByRole("dialog")).toContainText("3개 항목을 휴지통으로 보냅니다.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click();

  // 셋 다 사라지고 휴지통에 그대로 있다(되살릴 수 있다).
  await expect(tree(page).getByRole("treeitem")).toHaveCount(0);
  await expect(page.getByText("3개 선택")).toHaveCount(0);
  await page.getByRole("button", { name: "휴지통", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "휴지통 목록" }).getByRole("listitem"),
  ).toHaveCount(3);
});

test("Ctrl+클릭으로 두 개를 골라 폴더 밖 최상위로 꺼낸다", async ({ page }) => {
  await createProjectAndOpen(page);

  // 폴더를 만들고 그 안에 문서 둘을 넣는다(우클릭 → 새 문서 = 폴더 안).
  await page.getByRole("button", { name: "새 폴더" }).click();
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);
  await tree(page)
    .getByRole("treeitem", { name: "새 폴더" })
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "새 문서" }).click();
  await nameInput(page).fill("속1");
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);
  await addDoc(page, "속2"); // 형제로 같은 폴더 안에

  const inner1 = tree(page).getByRole("treeitem", { name: "속1" });
  const inner2 = tree(page).getByRole("treeitem", { name: "속2" });
  await expect(inner1).toHaveAttribute("aria-level", "2");
  await expect(inner2).toHaveAttribute("aria-level", "2");

  // 하나를 고르고 Ctrl(⌘)+클릭으로 하나 더 얹는다.
  await inner1.click();
  await inner2.click({ modifiers: ["ControlOrMeta"] });
  await expect(page.getByText("2개 선택")).toBeVisible();

  await page.getByRole("button", { name: "선택 항목 최상위로" }).click();
  await expect(inner1).toHaveAttribute("aria-level", "1");
  await expect(inner2).toHaveAttribute("aria-level", "1");
  // 옮기고 나면 묶음은 풀린다.
  await expect(page.getByText("2개 선택")).toHaveCount(0);

  // 폴더를 접어도 둘 다 남아 있다(정말 밖으로 나왔다).
  await page.getByRole("button", { name: "새 폴더 접기" }).click();
  await expect(inner1).toBeVisible();
  await expect(inner2).toBeVisible();
});

test("라벨 필터를 걸면 그 라벨의 회차만 남는다", async ({ page }) => {
  await createProjectAndOpen(page);
  await addDoc(page, "2화");

  // 1화에 기본 라벨(복선)을 단다.
  await tree(page).getByRole("treeitem", { name: "1화" }).click();
  await page.getByRole("button", { name: "인스펙터", exact: true }).click();
  await page.getByLabel("문서 라벨").selectOption({ label: "복선" });
  await expect(tree(page).getByTitle("라벨: 복선")).toBeVisible();

  const filterButton = page.getByRole("button", { name: "라벨 필터", exact: true });
  await expect(filterButton).toHaveAttribute("aria-pressed", "false");
  await filterButton.click();
  await page
    .getByRole("menu", { name: "라벨 필터" })
    .getByRole("menuitemradio", { name: "복선" })
    .click();

  const items = tree(page).getByRole("treeitem");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toHaveAttribute("aria-label", "1화");
  await expect(page.getByText("라벨: 복선", { exact: false }).first()).toBeVisible();
  await expect(filterButton).toHaveAttribute("aria-pressed", "true");

  // 해제하면 전부 돌아온다.
  await page.getByRole("button", { name: "필터 해제" }).click();
  await expect(items).toHaveCount(2);
  await expect(filterButton).toHaveAttribute("aria-pressed", "false");
});
