import { test, expect, type Page } from "@playwright/test";

// IndexedDB 스토어 레코드 수 (edge-cases.spec.ts와 동일 패턴)
function count(page: Page, store: "projects" | "documents" | "snapshots") {
  return page.evaluate(
    (s) =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open("builbook");
        req.onsuccess = () => {
          const tx = req.result.transaction(s, "readonly");
          const c = tx.objectStore(s).count();
          c.onsuccess = () => resolve(c.result);
          c.onerror = () => reject(c.error);
        };
        req.onerror = () => reject(req.error);
      }),
    store,
  );
}

// 작품 1개 생성하고 작업실 URL로 이동 (document.spec.ts와 동일 헬퍼)
async function createProjectAndOpen(page: import("@playwright/test").Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("스냅샷 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

// '+ 문서'는 PromptModal로 제목을 받는다
async function createDoc(page: import("@playwright/test").Page, title: string) {
  await page.getByRole("button", { name: "+ 문서" }).click();
  const dialog = page.getByRole("dialog", { name: "새 문서" });
  await dialog.getByLabel("문서 제목").fill(title);
  await dialog.getByRole("button", { name: "만들기", exact: true }).click();
}

// 인스펙터 열고 '스냅샷' 탭으로 전환
async function openSnapshotTab(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "인스펙터", exact: true }).click();
  await page.getByRole("tab", { name: "스냅샷" }).click();
}

test("스냅샷 저장 → 목록 표시 → 복원 → 자동 스냅샷", async ({ page }) => {
  await createProjectAndOpen(page);
  await createDoc(page, "1화 - 초안");

  const editor = page.locator(".prose-editor");
  await expect(editor).toBeVisible();

  // 첫 번째 버전 작성 후 자동저장(debounce 800ms) flush 대기
  await editor.click();
  await page.keyboard.type("첫 번째 버전 원고입니다.");
  await page.waitForTimeout(1500);

  // 스냅샷 저장 (메모 없이)
  await openSnapshotTab(page);
  await page.getByRole("button", { name: "스냅샷 저장", exact: true }).click();
  const saveDialog = page.getByRole("dialog", { name: "스냅샷 저장" });
  await expect(saveDialog).toBeVisible();
  await saveDialog.getByRole("button", { name: "저장", exact: true }).click();

  // 목록에 스냅샷 1개 등장 (단어 수 표시 확인)
  const list = page.getByRole("list", { name: "스냅샷 목록" });
  await expect(list.getByText(/단어$/)).toHaveCount(1);

  // 본문을 두 번째 버전으로 교체 후 자동저장 대기
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("완전히 다른 두 번째 버전.");
  await page.waitForTimeout(1500);
  await expect(editor).toContainText("완전히 다른 두 번째 버전.");

  // 스냅샷 펼쳐 미리보기 + 복원
  await list.getByRole("button", { name: /단어$/ }).first().click();
  await expect(page.getByText("첫 번째 버전 원고입니다.")).toBeVisible();
  await page.getByRole("button", { name: "복원", exact: true }).click();

  // 복원 확인 모달
  const confirmDialog = page.getByRole("dialog", { name: "스냅샷 복원" });
  await confirmDialog.getByRole("button", { name: "복원", exact: true }).click();

  // 에디터가 첫 번째 버전으로 되돌아왔다
  await expect(page.locator(".prose-editor")).toContainText(
    "첫 번째 버전 원고입니다.",
  );
  await expect(page.locator(".prose-editor")).not.toContainText(
    "완전히 다른 두 번째 버전.",
  );

  // 복원 직전 상태가 자동 스냅샷("복원 전 자동 저장")으로 남아 목록이 2개가 됐다
  await expect(page.getByText("복원 전 자동 저장")).toBeVisible();
  await expect(
    page.getByRole("list", { name: "스냅샷 목록" }).getByText(/단어$/),
  ).toHaveCount(2);
});

test("영구 삭제 시 그 문서의 스냅샷도 cascade 삭제된다 (고아 방지)", async ({
  page,
}) => {
  await createProjectAndOpen(page);
  await createDoc(page, "삭제될 문서");

  const editor = page.locator(".prose-editor");
  await editor.click();
  await page.keyboard.type("스냅샷을 남길 원고.");
  await page.waitForTimeout(1500);

  // 스냅샷 저장
  await openSnapshotTab(page);
  await page.getByRole("button", { name: "스냅샷 저장", exact: true }).click();
  await page
    .getByRole("dialog", { name: "스냅샷 저장" })
    .getByRole("button", { name: "저장", exact: true })
    .click();
  await expect(
    page.getByRole("list", { name: "스냅샷 목록" }).getByText(/단어$/),
  ).toHaveCount(1);
  expect(await count(page, "snapshots")).toBe(1);

  // 소프트 삭제(휴지통 이동): 바인더에서 사라지지만 DB엔 남고 스냅샷도 보존된다(복원 대비)
  await page
    .locator("nav")
    .getByRole("button", { name: "삭제", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click();
  await expect(page.locator("nav").getByText("삭제될 문서")).toHaveCount(0);
  expect(await count(page, "documents")).toBe(1);
  expect(await count(page, "snapshots")).toBe(1);

  // 휴지통에서 영구 삭제 → 이제 문서·스냅샷 모두 완전 제거(고아 누적 방지)
  await page.getByRole("button", { name: "휴지통", exact: true }).click();
  await page
    .getByRole("list", { name: "휴지통 목록" })
    .getByRole("button", { name: "영구 삭제" })
    .click();
  await page
    .getByRole("dialog", { name: /영구 삭제/ })
    .getByRole("button", { name: "영구 삭제", exact: true })
    .click();

  expect(await count(page, "documents")).toBe(0);
  expect(await count(page, "snapshots")).toBe(0);
});
