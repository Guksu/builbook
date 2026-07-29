import { test, expect, type Page } from "@playwright/test";

// 백업 파일을 만들고 그 텍스트를 돌려준다(다운로드 스트림을 그대로 읽는다).
async function exportBackup(page: Page): Promise<string> {
  await page.getByRole("button", { name: "백업", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "백업 · 복원" });
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "지금 백업하기" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function createProject(page: Page, title: string) {
  const isFirst = await page
    .getByRole("button", { name: "첫 작품 만들기" })
    .isVisible()
    .catch(() => false);
  await page
    .getByRole("button", { name: isFirst ? "첫 작품 만들기" : "+ 새 작품" })
    .click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await page.goto("/dashboard");
}

test("백업한 적 없으면 배너가 뜨고, 백업하면 사라진다", async ({ page }) => {
  await page.goto("/dashboard");
  // 작품이 0개일 때는 겁주지 않는다 — 배너 없음
  await expect(page.getByRole("status", { name: "백업 안내" })).toHaveCount(0);

  await createProject(page, "백업 대상 작품");
  await expect(page.getByRole("status", { name: "백업 안내" })).toContainText("아직 백업한 적이 없어요");

  const text = await exportBackup(page);
  const parsed = JSON.parse(text);
  expect(parsed.format).toBe("builbook-backup");
  expect(parsed.data.projects).toHaveLength(1);
  expect(parsed.data.projects[0].title).toBe("백업 대상 작품");

  await page.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByRole("status", { name: "백업 안내" })).toHaveCount(0);
});

test("백업 파일을 다른 브라우저 상태에 합치면 작품이 복원된다", async ({
  page,
  context,
}) => {
  await page.goto("/dashboard");
  await createProject(page, "복원될 작품");
  const backupText = await exportBackup(page);
  await page.getByRole("button", { name: "닫기" }).click();

  // 깨끗한 컨텍스트(빈 IndexedDB) = 브라우저를 갈아탄 상황
  const fresh = await context.browser()!.newPage();
  await fresh.goto("/dashboard");
  await expect(fresh.getByText("아직 작품이 없어요")).toBeVisible();

  await fresh.getByRole("button", { name: "백업", exact: true }).click();
  const dialog = fresh.getByRole("dialog", { name: "백업 · 복원" });
  await dialog.getByLabel("백업 파일 선택").setInputFiles({
    name: "builbook-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backupText, "utf8"),
  });
  // 파일 내용 확인 화면 → 기본값(합치기)으로 복원
  await expect(dialog.getByText(/작품 1 · 문서/)).toBeVisible();
  await dialog.getByRole("button", { name: "복원 실행" }).click();

  await expect(fresh.getByText("복원될 작품")).toBeVisible();
  await fresh.close();
});

test("builbook 백업이 아닌 파일은 거부한다", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "백업", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "백업 · 복원" });
  await dialog.getByLabel("백업 파일 선택").setInputFiles({
    name: "not-a-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ hello: "world" }), "utf8"),
  });
  await expect(dialog.getByText("builbook 백업 파일이 아니에요.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "복원 실행" })).toHaveCount(0);
});
