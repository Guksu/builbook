// 공통 fetch 헬퍼. !ok면 throw (SWR 에러 처리로 연결).
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function parse(res: Response) {
  if (!res.ok) {
    let message = "요청에 실패했습니다.";
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
    } catch {
      /* no body */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return null; // no body
  return res.json();
}

// SWR용 GET fetcher
export const fetcher = (url: string) => fetch(url).then(parse);

// 변이 헬퍼
export async function apiSend(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return parse(res);
}
