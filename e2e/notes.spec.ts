import { test, expect, type Page } from "@playwright/test";

// IndexedDB 스토어 레코드 수 (snapshot.spec.ts와 동일 패턴)
function count(page: Page, store: "projects" | "documents" | "notes") {
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

// 작품 1개 생성하고 작업실 URL로 이동 (snapshot.spec.ts와 동일 헬퍼)
async function createProjectAndOpen(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("노트 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

// 헤더의 '리서치' 토글로 노트 패널 열기
async function openNotes(page: Page) {
  await page.getByRole("button", { name: "리서치", exact: true }).click();
}

test("캐릭터 노트 추가 → 목록 표시 → 편집 → 삭제", async ({ page }) => {
  await createProjectAndOpen(page);
  await openNotes(page);

  const list = page.getByRole("list", { name: "캐릭터 목록" });

  // 빈 상태 안내 노출
  await expect(page.getByText(/아직 캐릭터가 없어요/)).toBeVisible();

  // 캐릭터 추가
  await page.getByRole("button", { name: "+ 캐릭터 추가" }).click();
  const addDialog = page.getByRole("dialog", { name: "캐릭터 추가" });
  await addDialog.getByLabel("이름").fill("홍길동");
  await addDialog.getByLabel("역할 (선택)").fill("주인공");
  await addDialog.getByLabel("설명 (선택)").fill("의적. 활빈당의 우두머리.");
  await addDialog.getByRole("button", { name: "추가", exact: true }).click();

  // 목록에 등장 + DB 저장 확인
  await expect(list.getByText("홍길동")).toBeVisible();
  await expect(list.getByText("주인공")).toBeVisible();
  expect(await count(page, "notes")).toBe(1);

  // 편집 → 이름 변경
  await list.getByRole("button", { name: "편집" }).click();
  const editDialog = page.getByRole("dialog", { name: "캐릭터 저장" });
  await editDialog.getByLabel("이름").fill("홍길순");
  await editDialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(list.getByText("홍길순")).toBeVisible();
  await expect(list.getByText("홍길동")).toHaveCount(0);
  expect(await count(page, "notes")).toBe(1);

  // 삭제 (확인 모달)
  await list.getByRole("button", { name: "삭제" }).click();
  await page
    .getByRole("dialog", { name: "노트 삭제" })
    .getByRole("button", { name: "삭제", exact: true })
    .click();
  await expect(list.getByText("홍길순")).toHaveCount(0);
  await expect(page.getByText(/아직 캐릭터가 없어요/)).toBeVisible();
  expect(await count(page, "notes")).toBe(0);
});

test("설정 노트는 캐릭터 탭과 분리되어 카테고리별로 표시된다", async ({
  page,
}) => {
  await createProjectAndOpen(page);
  await openNotes(page);

  // 캐릭터 1개 추가
  await page.getByRole("button", { name: "+ 캐릭터 추가" }).click();
  const charDialog = page.getByRole("dialog", { name: "캐릭터 추가" });
  await charDialog.getByLabel("이름").fill("주인공");
  await charDialog.getByRole("button", { name: "추가", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "캐릭터 목록" }).getByText("주인공"),
  ).toBeVisible();

  // 설정 탭으로 전환 (역할 필드 없음 → 설정은 이름 대신 '제목')
  await page.getByRole("tab", { name: /설정/ }).click();
  await expect(page.getByText(/아직 설정이 없어요/)).toBeVisible();

  await page.getByRole("button", { name: "+ 설정 추가" }).click();
  const setDialog = page.getByRole("dialog", { name: "설정 추가" });
  await expect(setDialog.getByLabel("제목")).toBeVisible();
  await expect(setDialog.getByLabel("역할 (선택)")).toHaveCount(0);
  await setDialog.getByLabel("제목").fill("마법 체계");
  await setDialog.getByRole("button", { name: "추가", exact: true }).click();

  const settingList = page.getByRole("list", { name: "설정 목록" });
  await expect(settingList.getByText("마법 체계")).toBeVisible();
  // 설정 목록엔 캐릭터가 섞이지 않는다
  await expect(settingList.getByText("주인공")).toHaveCount(0);
  expect(await count(page, "notes")).toBe(2);
});

test("작품 삭제 시 그 작품의 노트도 cascade 삭제된다 (고아 방지)", async ({
  page,
}) => {
  await createProjectAndOpen(page);
  await openNotes(page);

  await page.getByRole("button", { name: "+ 캐릭터 추가" }).click();
  const dialog = page.getByRole("dialog", { name: "캐릭터 추가" });
  await dialog.getByLabel("이름").fill("삭제될 캐릭터");
  await dialog.getByRole("button", { name: "추가", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "캐릭터 목록" }).getByText("삭제될 캐릭터"),
  ).toBeVisible();
  expect(await count(page, "notes")).toBe(1);

  // 대시보드에서 작품 삭제 → 노트도 함께 사라져야 한다(고아 누적 방지)
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "작품 삭제" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click();

  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  expect(await count(page, "projects")).toBe(0);
  expect(await count(page, "notes")).toBe(0);
});
