const CACHE_NAME = 'spl-cache-v1.0.3'; // 版本號升級，強制更新快取
const urlsToCache = [
  './index.html', // 修正：只快取標準的 index.html
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // 抓取 index.html，確保離線可用
        return cache.addAll(urlsToCache).catch(err => console.log('Cache addAll error:', err));
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 導航請求 (Navigation) 或 HTML 請求：Network First
  // 這樣確保使用者重新整理時一定會先去抓最新的 index.html
  if (event.request.mode === 'navigate' || requestUrl.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match('./index.html')) // 若離線，回傳快取的 index.html
    );
  } else {
    // 其他資源 (JS, CSS, Images)：Cache First
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request).then((networkResponse) => {
             const responseClone = networkResponse.clone();
             caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
             });
             return networkResponse;
          });
        })
    );
  }
});