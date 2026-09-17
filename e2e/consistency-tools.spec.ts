import { test, expect, type Page } from "@playwright/test";

async function createProjectAndOpen(page: Page) {
  await page.goto("/dashboard");
  // 하이드레이션 완료를 기다린다 — 빈 상태가 보이기 전에 누르면 클릭이 먹지 않는다.
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("일관성 테스트");
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
  await page.waitForTimeout(1500); // 자동저장 flush
}

async function addTerm(page: Page, name: string) {
  await page.getByRole("button", { name: "+ 용어" }).click();
  await page.getByLabel("정본 표기").fill(name);
  await page.getByRole("button", { name: "추가" }).click();
}

test("용어를 등록하면 사전에 남고 새로고침해도 유지된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "점검" }).click();
  await addTerm(page, "테아르");

  const list = page.getByRole("list", { name: "용어 목록" });
  await expect(list.getByText("테아르")).toBeVisible();

  await page.reload();
  // 열린 패널은 작품별로 기억되므로 새로고침 뒤에도 점검 패널이 그대로 열려 있다.
  await expect(page.getByRole("list", { name: "용어 목록" }).getByText("테아르")).toBeVisible();
});

test("표기 흔들림을 찾아 정본 표기와 함께 보여준다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화");
  await typeBody(page, "테아르가 걸었다. 테아리가 웃었다.");

  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "점검" }).click();
  await addTerm(page, "테아르");

  await page.getByRole("tab", { name: "표기 검사" }).click();
  const variants = page.getByRole("list", { name: "표기 흔들림 목록" });
  await expect(variants.getByText("테아리")).toBeVisible();

  // 정본 표기 등장 횟수도 함께 보여준다
  await expect(page.getByRole("list", { name: "용어 등장 횟수" })).toContainText("1회");
});

test("이명으로 등록한 표기는 흔들림으로 잡지 않는다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화");
  await typeBody(page, "테아리가 웃었다.");

  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "점검" }).click();
  await page.getByRole("button", { name: "+ 용어" }).click();
  await page.getByLabel("정본 표기").fill("테아르");
  await page.getByLabel("허용 표기").fill("테아리");
  await page.getByRole("button", { name: "추가" }).click();

  await page.getByRole("tab", { name: "표기 검사" }).click();
  await expect(page.getByText("흔들린 표기를 찾지 못했어요.")).toBeVisible();
});

test("문장 진단이 어미 반복과 긴 문장을 알려준다", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화");
  await typeBody(page, "그는 갔었다. 그녀는 봤었다. 둘은 울었다.");

  await page.getByRole("button", { name: "패널", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "점검" }).click();
  await page.getByRole("tab", { name: "문장 진단" }).click();

  await expect(page.getByText("문장 수")).toBeVisible();
  await expect(page.getByRole("list", { name: "어미 반복 목록" })).toContainText("3회 연속");
});
