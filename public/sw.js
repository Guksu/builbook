/* builbook 서비스 워커 — 오프라인에서도 앱이 열리게 한다.
 * - 정적 자산(/_next/static, 아이콘): 캐시 우선(파일명에 해시가 있어 안전).
 * - 페이지·데이터 요청(같은 출처 GET): 네트워크 우선, 실패하면 마지막 성공 응답.
 * - 원고 데이터는 IndexedDB에 있으므로 워커가 만질 게 없다.
 * 캐시 이름의 버전을 올리면 activate에서 옛 캐시를 지운다. */
const VERSION = "builbook-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const SHELL = ["/", "/dashboard"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => Promise.allSettled(SHELL.map((u) => cache.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStatic = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname === "/og.png";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 폰트 CDN 등은 브라우저에 맡긴다

  if (isStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  event.respondWith(
    caches.open(PAGE_CACHE).then(async (cache) => {
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        const hit = await cache.match(req);
        if (hit) return hit;
        // 처음 여는 작업실 주소는 캐시가 없다 — 대시보드로 대신 연다(원고는 IndexedDB에 있다).
        if (req.mode === "navigate") {
          const dash = await cache.match("/dashboard");
          if (dash) return dash;
        }
        throw new Error("offline");
      }
    }),
  );
});
