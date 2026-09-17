import { test, expect, type Page } from "@playwright/test";

async function createProjectAndOpen(page: Page) {
  await page.goto("/dashboard");
  // 하이드레이션 완료를 기다린다 — 빈 상태가 보이기 전에 누르면 클릭이 먹지 않는다.
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("구조 설계 테스트");
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

test("코르크보드에서 시놉시스를 적고 진행 상태를 바꾼다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화 회귀");

  await page.getByRole("button", { name: "카드", exact: true }).click();
  const board = page.getByRole("list", { name: "코르크보드 카드" });
  await expect(board.getByText("1화 회귀")).toBeVisible();

  // 시놉시스 인라인 편집 — 빈 카드는 안내 문구를 보여준다
  // (자동 생성된 "1화" 카드도 같은 문구를 쓰므로 대상 카드로 좁힌다)
  const card = board
    .getByRole("listitem")
    .filter({ has: page.getByTitle("1화 회귀") });
  await card.getByText("요약을 적어 두면").click();
  await page.getByLabel("1화 회귀 시놉시스").fill("주인공이 죽기 직전으로 돌아온다");
  await page.getByLabel("1화 회귀 시놉시스").blur();
  await expect(board.getByText("주인공이 죽기 직전으로 돌아온다")).toBeVisible();

  // 상태 칩: 초고 → 퇴고
  await page.getByRole("button", { name: "1화 회귀 진행 상태" }).click();
  await expect(page.getByRole("button", { name: "1화 회귀 진행 상태" })).toHaveText("퇴고");

  // 새로고침해도 유지된다(IndexedDB 저장)
  await page.reload();
  await page.getByRole("button", { name: "카드", exact: true }).click();
  await expect(page.getByRole("button", { name: "1화 회귀 진행 상태" })).toHaveText("퇴고");
});

test("카드 제목을 누르면 본문 편집으로 돌아간다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화 회귀");
  await createDoc(page, "2화 각성");

  await page.getByRole("button", { name: "카드", exact: true }).click();
  const board = page.getByRole("list", { name: "코르크보드 카드" });
  // 카드 제목 버튼(상태 칩과 구분하려고 title 속성으로 집는다)
  await board.getByTitle("1화 회귀").click();

  await expect(page.locator(".prose-editor")).toBeVisible();
  await expect(page.getByRole("heading", { name: "1화 회귀" })).toBeVisible();
});

test("연표에 사건을 세우고 회차와 연결한다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화 회귀");

  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "연표" }).click();
  await page.getByRole("button", { name: "+ 사건" }).click();
  await page.getByLabel("사건 이름").fill("주인공 회귀");
  await page.getByLabel("작중 시점").fill("1024년 봄");
  await page.getByLabel("연결할 회차").selectOption({ label: "1화 회귀" });
  await page.getByRole("button", { name: "추가" }).click();

  const list = page.getByRole("list", { name: "타임라인 목록" });
  await expect(list.getByText("주인공 회귀")).toBeVisible();
  await expect(list.getByText("1024년 봄")).toBeVisible();
  await expect(list.getByRole("button", { name: /1화 회귀/ })).toBeVisible();
});

test("연표 사건 순서를 위아래로 바꾼다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "연표" }).click();

  for (const name of ["첫 번째 사건", "두 번째 사건"]) {
    await page.getByRole("button", { name: "+ 사건" }).click();
    await page.getByLabel("사건 이름").fill(name);
    await page.getByRole("button", { name: "추가" }).click();
  }

  const items = page.getByRole("list", { name: "타임라인 목록" }).getByRole("listitem");
  await expect(items.first()).toContainText("첫 번째 사건");

  await page.getByRole("button", { name: "두 번째 사건 위로" }).click();
  await expect(items.first()).toContainText("두 번째 사건");

  // 새로고침해도 순서가 유지된다
  await page.reload();
  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "연표" }).click();
  await expect(
    page.getByRole("list", { name: "타임라인 목록" }).getByRole("listitem").first(),
  ).toContainText("두 번째 사건");
});
