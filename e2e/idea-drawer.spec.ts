import { test, expect, type Page, type Route } from "@playwright/test";

// 영감 서랍 — 뽑기(오프라인)·메모·AI(내 키, 네트워크는 가짜 응답으로 대체).

async function createProjectAndOpen(page: Page, title = "영감 테스트") {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
}

async function openIdeas(page: Page) {
  await page.keyboard.press("Control+Shift+Digit7");
  await expect(page.getByRole("heading", { name: "영감 서랍" })).toBeVisible();
}

test("장르를 고르면 카드 3장이 나오고, 고정한 카드는 다시 뽑아도 남는다", async ({ page }) => {
  await createProjectAndOpen(page);
  await openIdeas(page);
  await expect(page.getByText("장르를 고르면 카드 3장이")).toBeVisible();
  await page.getByRole("button", { name: "무협", exact: true }).click();
  const cards = page.getByRole("list", { name: "뽑은 카드" }).getByRole("listitem");
  await expect(cards).toHaveCount(3);
  await expect(page.getByText("무협 덱 · 60장")).toBeVisible();

  const firstText = await cards.nth(0).locator("p").innerText();
  await cards.nth(0).getByRole("button", { name: "고정", exact: true }).click();
  await page.getByRole("button", { name: /다시 뽑기/ }).click();
  await expect(cards.nth(0).locator("p")).toHaveText(firstText);

  // 장르는 작품에 저장된다 — 새로고침 뒤에도 같은 덱.
  await page.reload();
  await expect(page.getByText("무협 덱 · 60장")).toBeVisible();
});

test("카드를 메모로 저장하면 메모 탭에 쌓이고 새로고침 뒤에도 남는다", async ({ page }) => {
  await createProjectAndOpen(page);
  await openIdeas(page);
  await page.getByRole("button", { name: "로판", exact: true }).click();
  const cards = page.getByRole("list", { name: "뽑은 카드" }).getByRole("listitem");
  const text = await cards.nth(1).locator("p").innerText();
  await cards.nth(1).getByRole("button", { name: "메모로 저장" }).click();
  await expect(page.getByText("메모에 저장했어요.")).toBeVisible();

  await page.getByRole("tab", { name: /^메모/ }).click();
  const memos = page.getByRole("list", { name: "아이디어 메모" }).getByRole("listitem");
  await expect(memos).toHaveCount(1);
  await expect(memos.first()).toContainText(text);
  await expect(memos.first()).toContainText("1화"); // 현재 회차에 붙는다

  await page.getByLabel("새 메모").fill("직접 쓴 메모");
  await page.getByRole("button", { name: "메모 추가" }).click();
  await expect(memos).toHaveCount(2);

  await page.reload();
  // 열린 패널은 기억된다 — 단축키를 다시 누르면 닫히므로 보이는지만 확인한다.
  await expect(page.getByRole("heading", { name: "영감 서랍" })).toBeVisible();
  await page.getByRole("tab", { name: /^메모/ }).click();
  await expect(page.getByRole("list", { name: "아이디어 메모" }).getByRole("listitem")).toHaveCount(2);
});

test("조합기는 인물 카드가 있어야 켜진다", async ({ page }) => {
  await createProjectAndOpen(page);
  await openIdeas(page);
  await expect(page.getByText("인물 카드를 만들면 조합기가 켜져요")).toBeVisible();
  await page.getByRole("button", { name: "카드 템플릿", exact: true }).click();
  await page.getByRole("menuitem", { name: "새 인물 카드" }).click();
  const nameInput = page.getByRole("textbox", { name: "이름" });
  await nameInput.fill("주인공");
  await nameInput.press("Enter");
  await expect(nameInput).toHaveCount(0);
  await expect(page.getByRole("button", { name: "섞기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "섞기", exact: true }).click();
  await expect(page.getByRole("button", { name: "다시 섞기" })).toBeVisible();
});

// Anthropic SSE 응답 흉내 — SDK가 실제로 파싱하는 이벤트 순서 그대로.
function sseBody(text: string): string {
  const ev = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  return (
    ev("message_start", {
      message: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-opus-5",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 120, output_tokens: 0 },
      },
    }) +
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }) +
    ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: text.slice(0, 5) } }) +
    ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: text.slice(5) } }) +
    ev("content_block_stop", { index: 0 }) +
    ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 20 } }) +
    ev("message_stop", {})
  );
}

test("AI 탭: 키를 넣고 미리보기에 동의하면 스트리밍 결과가 오고 메모로 저장된다", async ({ page }) => {
  const seen: { url: string; body: string }[] = [];
  await page.route("https://api.anthropic.com/**", async (route: Route) => {
    const req = route.request();
    seen.push({ url: req.url(), body: req.postData() ?? "" });
    if (req.url().endsWith("/count_tokens")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ input_tokens: 321 }) });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body: sseBody("1. 배신 — 동료가 문을 잠근다.\n대가: 신뢰"),
    });
  });

  await createProjectAndOpen(page);
  await page.locator("main .prose-editor").click();
  await page.keyboard.type("그는 검을 들었다.");
  await openIdeas(page);
  await page.getByRole("tab", { name: "AI" }).click();

  // 키 없음 → 안내 + 입력
  await expect(page.getByText("내 Anthropic API 키로 동작해요.")).toBeVisible();
  const keyInput = page.getByRole("textbox", { name: "API 키" });
  await keyInput.fill("hello");
  await expect(page.getByRole("button", { name: "키 사용" })).toBeDisabled();
  await keyInput.fill("sk-ant-api03-" + "x".repeat(40));
  await page.getByRole("button", { name: "키 사용" }).click();
  await expect(page.getByText("이번 탭에서만")).toBeVisible();

  // 선택 없음 → 현재 회차 본문을 보낸다. 선택 전용 작업은 잠긴다.
  await expect(page.getByText(/현재 회차 본문 .*자를 보내요/)).toBeVisible();
  await expect(page.getByRole("button", { name: /묘사 다듬기/ })).toBeDisabled();

  await page.getByRole("button", { name: /다음 전개 3안/ }).click();
  const preview = page.getByRole("region", { name: "보낼 내용 확인" });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("그는 검을 들었다.");
  await expect(preview).toContainText("321 토큰");
  await preview.getByRole("button", { name: "보내기" }).click();

  const result = page.getByRole("region", { name: "AI 결과" });
  await expect(result).toContainText("동료가 문을 잠근다");
  await result.getByRole("button", { name: "메모로 저장" }).click();
  await expect(page.getByText("메모에 저장했어요.")).toBeVisible();

  // 실제 전송 본문에 원고와 시스템 규칙이 실린다. 키는 헤더로만.
  const msg = seen.find((s) => s.url.endsWith("/v1/messages"));
  expect(msg).toBeTruthy();
  expect(msg!.body).toContain("그는 검을 들었다.");
  expect(msg!.body).toContain("claude-opus-5");
  expect(msg!.body).not.toContain("sk-ant-api03-");

  await page.getByRole("tab", { name: /^메모/ }).click();
  await expect(page.getByRole("list", { name: "아이디어 메모" }).getByRole("listitem").first()).toContainText("AI");
});

test("AI 탭: 401이면 키 입력 화면으로 돌아가며 이유를 알려 준다", async ({ page }) => {
  await page.route("https://api.anthropic.com/**", async (route: Route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }),
    });
  });
  await createProjectAndOpen(page);
  await openIdeas(page);
  await page.getByRole("tab", { name: "AI" }).click();
  await page.getByRole("textbox", { name: "API 키" }).fill("sk-ant-api03-" + "y".repeat(40));
  await page.getByRole("button", { name: "키 사용" }).click();
  await page.getByRole("button", { name: /회차 제목 후보/ }).click();
  await page.getByRole("region", { name: "보낼 내용 확인" }).getByRole("button", { name: "보내기" }).click();
  await expect(page.getByRole("region", { name: "API 키 입력" }).getByRole("alert")).toContainText(
    "API 키가 맞지 않아요",
  );
  await expect(page.getByRole("textbox", { name: "API 키" })).toBeVisible();
});
