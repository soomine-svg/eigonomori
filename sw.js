/* えいごのもり Service Worker
   目的: ①辞書4.4MBを端末にキャッシュして通信量を節約 ②オフラインでも動くように
   方針: アプリ本体(index.html)はネット優先=更新がすぐ届く。辞書・アイコンはキャッシュ優先。 */
const CACHE = "eigonomori-v1";
const ASSETS = ["./", "dict.txt?v=1", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a)))) /* アイコン未設置でも失敗しない */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return; /* カメラ翻訳のPOSTは素通し */
  if (req.mode === "navigate") {
    /* アプリ本体: ネット優先。オフライン時はキャッシュで開く */
    e.respondWith(
      fetch(req)
        .then(res => {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put("./", cp));
          return res;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }
  /* 辞書・アイコンなど: キャッシュ優先(通信節約) */
  e.respondWith(
    caches.match(req).then(hit =>
      hit ||
      fetch(req).then(res => {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
        return res;
      })
    )
  );
});
