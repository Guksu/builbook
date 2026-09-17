import { test, expect, type Page } from "@playwright/test";

async function createProjectAndOpen(page: Page) {
  await page.goto("/dashboard");
  // 하이드레이션 완료를 기다린다 — 빈 상태가 보이기 전에 누르면 클릭이 먹지 않는다.
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("연재 도구 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

// 새 문서: "새 문서" 아이콘 → 기본 이름("N화")으로 즉시 생성 → 인라인 입력에 제목 입력 → Enter.
async function createDoc(page: Page, title: string) {
  await page.getByRole("button", { name: "새 문서" }).click();
  const name = page.getByRole("textbox", { name: "이름" });
  await name.fill(title);
  await name.press("Enter");
  await expect(name).toHaveCount(0);
}

async function typeBody(page: Page, text: string) {
  const editor = page.locator(".prose-editor");
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type(text);
  await page.waitForTimeout(1500); // 자동저장 debounce flush
}

test("타이핑하면 오늘 집필량·연속 집필일이 기록된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화 회귀");
  await typeBody(page, "그는 눈을 떴다. 죽기 직전의 기억이 선명했다.");

  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "현황" }).click();
  // 오늘 쓴 분량이 0자가 아니다(자동저장이 델타를 기록했다)
  await expect(page.getByText(/오늘 쓴 분량/)).toBeVisible();
  await expect(page.getByText(/^[1-9]\d*자$/).first()).toBeVisible();
  // 오늘 썼으므로 연속 집필은 1일
  await expect(page.getByText("연속 집필")).toBeVisible();
  await expect(page.getByText("1일").first()).toBeVisible();
});

test("회차 분량표에 회차가 순서대로 쌓이고 클릭하면 그 회차가 열린다", async ({
  page,
}) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화 회귀");
  await typeBody(page, "첫 화 본문.");
  await createDoc(page, "2화 각성");
  await typeBody(page, "둘째 화 본문.");

  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "현황" }).click();
  const list = page.getByRole("list", { name: "회차 분량 목록" });
  // 3 = 새 작품에 자동 생성된 "1화" + 방금 만든 두 회차.
  await expect(list.getByRole("button")).toHaveCount(3);
  // 목표(기본 5,500자)에 한참 못 미치므로 '짧음'으로 표시된다
  await expect(list.getByText("짧음").first()).toBeVisible();

  // 회차를 클릭하면 에디터가 그 문서로 전환된다
  await list.getByRole("button", { name: /1화 회귀/ }).click();
  await expect(page.getByRole("heading", { name: "1화 회귀" })).toBeVisible();
});

test("하루 목표를 정하면 오늘 진행률 바가 나타난다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화");
  await typeBody(page, "오늘의 분량.");

  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "현황" }).click();
  await expect(page.getByRole("progressbar", { name: "오늘 목표 진행률" })).toHaveCount(0);

  await page.getByLabel("하루 목표 분량").fill("100");
  await page.getByLabel("하루 목표 분량").blur();
  await expect(page.getByRole("progressbar", { name: "오늘 목표 진행률" })).toBeVisible();
});

test("독자 뷰 미리보기가 본문을 문단으로 보여준다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화 회귀");
  await typeBody(page, "그는 눈을 떴다.");

  await page.getByRole("button", { name: "더 보기" }).click();
  await page.getByRole("menuitem", { name: "미리보기" }).click();
  const article = page.getByRole("article", { name: "독자 뷰 본문" });
  await expect(article).toContainText("그는 눈을 떴다.");
  // 읽기 시간·분량 요약이 함께 보인다
  await expect(page.getByText(/읽는 데 약 \d+분/)).toBeVisible();

  // 글자 크기 전환이 동작한다
  await page.getByRole("button", { name: "크게" }).click();
  await expect(page.getByRole("button", { name: "크게" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
