import { test, expect, type Page } from "@playwright/test";

// 라벨 · 상태 · 문서 메모(스크리브너의 Label / Status / Document Notes) —
// 인스펙터에서 지정하고, 바인더 행에서 색 막대·상태 점으로 알아보고, 새로고침 후에도 남는다.

async function createProjectAndOpen(page: Page) {
  await page.goto("/dashboard");
  // 하이드레이션 완료를 기다린다 — 빈 상태가 보이기 전에 누르면 클릭이 먹지 않는다.
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("라벨 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  // 새 작품에는 "1화"가 자동으로 만들어져 있다.
  await expect(tree(page).getByRole("treeitem", { name: "1화" })).toBeVisible();
}

const tree = (page: Page) => page.getByRole("tree", { name: "문서 트리" });

async function openInspector(page: Page) {
  await page.getByRole("button", { name: "인스펙터", exact: true }).click();
  await expect(page.getByLabel("문서 상태")).toBeVisible();
}

test("상태를 바꾸면 바인더 행에 상태 점이 뜬다", async ({ page }) => {
  await createProjectAndOpen(page);
  await openInspector(page);

  // 초고는 표시가 없다(평소 바인더는 이름만 보인다).
  await expect(page.getByLabel("상태: 퇴고")).toHaveCount(0);

  await page.getByLabel("문서 상태").selectOption("revise");
  await expect(tree(page).getByLabel("상태: 퇴고")).toBeVisible();

  // 완료로 올리면 점도 바뀐다.
  await page.getByLabel("문서 상태").selectOption("done");
  await expect(tree(page).getByLabel("상태: 완료")).toBeVisible();
  await expect(tree(page).getByLabel("상태: 퇴고")).toHaveCount(0);
});

test("라벨을 만들어 문서에 달고, 메모와 함께 새로고침 뒤에도 남는다", async ({
  page,
}) => {
  await createProjectAndOpen(page);
  await openInspector(page);

  // 라벨 관리에서 새 라벨을 만든다.
  await page.getByRole("button", { name: "라벨 관리" }).click();
  await page.getByLabel("새 라벨 색").selectOption("green");
  await page.getByLabel("새 라벨 이름").fill("회상");
  await page.getByRole("button", { name: "추가" }).click();
  await expect(
    page.getByRole("list", { name: "라벨 목록" }).getByLabel("회상 이름"),
  ).toHaveValue("회상");

  // 문서에 지정하면 바인더 행에 색 막대가 생긴다.
  await page.getByLabel("문서 라벨").selectOption({ label: "회상" });
  await expect(tree(page).getByTitle("라벨: 회상")).toBeVisible();

  // 메모·상태도 함께 적어 둔다.
  await page.getByLabel("문서 메모").fill("떡밥 회수 잊지 말 것");
  await page.getByLabel("문서 메모").blur();
  await page.getByLabel("문서 상태").selectOption("revise");

  await page.reload();
  await openInspector(page);
  await expect(page.getByLabel("문서 메모")).toHaveValue("떡밥 회수 잊지 말 것");
  await expect(page.getByLabel("문서 상태")).toHaveValue("revise");
  await expect(page.getByLabel("문서 라벨")).toHaveValue(/.+/);
  await expect(tree(page).getByTitle("라벨: 회상")).toBeVisible();
  await expect(tree(page).getByLabel("상태: 퇴고")).toBeVisible();

  // 카드 보기에서도 라벨 이름이 보인다.
  await page.getByRole("button", { name: "카드", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "코르크보드 카드" }).getByText("회상"),
  ).toBeVisible();
});

test("라벨을 지우면 그 라벨을 달고 있던 문서의 라벨도 비워진다", async ({ page }) => {
  await createProjectAndOpen(page);
  await openInspector(page);

  // 기본 라벨(복선)을 문서에 달아 둔다.
  await page.getByLabel("문서 라벨").selectOption({ label: "복선" });
  await expect(tree(page).getByTitle("라벨: 복선")).toBeVisible();

  // 라벨 관리에서 삭제 → 확인 모달.
  await page.getByRole("button", { name: "라벨 관리" }).click();
  await page.getByRole("button", { name: "복선 삭제" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();

  await expect(tree(page).getByTitle("라벨: 복선")).toHaveCount(0);
  await expect(page.getByLabel("문서 라벨")).toHaveValue("");
  await expect(
    page.getByRole("list", { name: "라벨 목록" }).getByLabel("복선 이름"),
  ).toHaveCount(0);

  // 새로고침해도 지워진 상태 그대로.
  await page.reload();
  await openInspector(page);
  await expect(page.getByLabel("문서 라벨")).toHaveValue("");
  await expect(tree(page).getByTitle("라벨: 복선")).toHaveCount(0);
});
