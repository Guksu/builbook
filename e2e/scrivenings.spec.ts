import { test, expect, type Page } from "@playwright/test";

// 스크리브닝(연속 보기) — 폴더를 고르면 그 아래 회차가 한 장으로 이어 보이고,
// 그 자리에서 고친 내용이 회차별로 저장된다(스크리브너 Scrivenings).

async function createProjectAndOpen(page: Page, title = "연속 보기 테스트") {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

const tree = (page: Page) => page.getByRole("tree", { name: "문서 트리" });
const nameInput = (page: Page) => page.getByRole("textbox", { name: "이름" });
const main = (page: Page) => page.locator("main");
const section = (page: Page, title: string) =>
  page.getByRole("region", { name: `${title} 구획` });

/** 폴더 "1부" 안에 "프롤로그"·"추격전" 두 회차를 만든다. */
async function buildFolderWithTwoDocs(page: Page) {
  await page.getByRole("button", { name: "새 폴더" }).click();
  await nameInput(page).fill("1부");
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);

  for (const docTitle of ["프롤로그", "추격전"]) {
    // 우클릭 → 새 문서 = 그 폴더 안에 생성.
    await tree(page).getByRole("treeitem", { name: "1부" }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "새 문서" }).click();
    await nameInput(page).fill(docTitle);
    await nameInput(page).press("Enter");
    await expect(nameInput(page)).toHaveCount(0);
    await expect(
      tree(page).getByRole("treeitem", { name: docTitle }),
    ).toHaveAttribute("aria-level", "2");
  }
}

test("폴더를 고르면 하위 회차가 순서대로 이어 보인다", async ({ page }) => {
  await createProjectAndOpen(page);
  await buildFolderWithTwoDocs(page);

  const folder = tree(page).getByRole("treeitem", { name: "1부" });
  await folder.click();
  // 폴더도 선택 대상 — 행 강조는 문서와 같다(접기/펼치기는 chevron 몫).
  await expect(folder).toHaveAttribute("aria-selected", "true");
  await expect(folder).toHaveAttribute("aria-expanded", "true");

  // 폴더 제목 헤더 + 문서 수/합계 분량
  await expect(main(page).getByRole("heading", { level: 1, name: "1부" })).toBeVisible();
  await expect(main(page).getByText("문서 2개 · 0자")).toBeVisible();

  // 두 회차가 트리 순서대로 한 화면에, 각 구획에 편집 가능한 본문이 있다.
  await expect(
    main(page).getByRole("heading", { level: 2 }),
  ).toHaveText(["프롤로그", "추격전"]);
  await expect(main(page).locator(".prose-editor")).toHaveCount(2);
  await expect(section(page, "프롤로그").locator(".prose-editor")).toBeVisible();
  await expect(section(page, "추격전").locator(".prose-editor")).toBeVisible();
});

test("연속 보기에서 고친 내용이 그 회차에 저장된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await buildFolderWithTwoDocs(page);
  await tree(page).getByRole("treeitem", { name: "1부" }).click();

  // 두 번째 구획에만 타이핑.
  await section(page, "추격전").locator(".prose-editor").click();
  await page.keyboard.type("추격이 시작됐다.");

  // 자동저장이 끝나면 헤더 합계가 따라 올라간다(= 저장 완료 신호).
  await expect(main(page).getByText("문서 2개 · 9자")).toBeVisible();

  await page.reload();

  // 새로고침 후 다시 폴더를 고르면 그 구획에 내용이 남아 있다.
  await tree(page).getByRole("treeitem", { name: "1부" }).click();
  await expect(section(page, "추격전").locator(".prose-editor")).toContainText(
    "추격이 시작됐다.",
  );
  // 옆 회차는 건드리지 않았다.
  await expect(section(page, "프롤로그").locator(".prose-editor")).not.toContainText(
    "추격이",
  );
});

test("‘이 문서만 열기’로 단일 에디터로 넘어간다", async ({ page }) => {
  await createProjectAndOpen(page);
  await buildFolderWithTwoDocs(page);
  await tree(page).getByRole("treeitem", { name: "1부" }).click();

  await section(page, "추격전").getByRole("button", { name: "이 문서만 열기" }).click();

  // 단일 에디터 화면 — 제목이 h1이 되고 본문은 하나뿐이며 툴바가 함께 온다.
  await expect(main(page).getByRole("heading", { level: 1, name: "추격전" })).toBeVisible();
  await expect(main(page).locator(".prose-editor")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "굵게", exact: true })).toBeVisible();
  await expect(
    tree(page).getByRole("treeitem", { name: "추격전" }),
  ).toHaveAttribute("aria-selected", "true");
});

test("빈 폴더는 안내 문구를 보여준다", async ({ page }) => {
  await createProjectAndOpen(page);

  await page.getByRole("button", { name: "새 폴더" }).click();
  await nameInput(page).fill("설정 자료");
  await nameInput(page).press("Enter");
  await expect(nameInput(page)).toHaveCount(0);

  await tree(page).getByRole("treeitem", { name: "설정 자료" }).click();
  await expect(main(page).getByText("이 폴더에는 아직 문서가 없어요.")).toBeVisible();
  await expect(main(page).getByText("이어 볼 문서 없음")).toBeVisible();
  await expect(main(page).locator(".prose-editor")).toHaveCount(0);
});
