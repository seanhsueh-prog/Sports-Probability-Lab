const CACHE_NAME = 'spl-cache-v1.0.1'; // 升級版本號以強制更新
const urlsToCache = [
  './',
  './sports-probability-lab-v1.0.html', // 修正為正確的 HTML 檔名
  './icon-192.png', // 加入圖片快取
  './icon-512.png', // 加入圖片快取
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
        // 嘗試快取核心資源，若失敗不阻擋安裝
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
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 策略：HTML Network First (確保讀到新版), Assets Cache First
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 對於 HTML 頁面或根路徑，使用 Network First
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
        .catch(() => caches.match(event.request))
    );
  } else {
    // 其他靜態資源使用 Cache First
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