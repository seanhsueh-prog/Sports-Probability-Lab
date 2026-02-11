/**
 * 機率分析模型 (Probability Analysis Model)
 * Service Worker v1.0.5
 */

const CACHE_NAME = 'spl-cache-v1.0.5'; // 每次更新 HTML 或資產時需升級此版本號
const urlsToCache = [
  './index.html',      // PWA 入口點
  './icon-192.png',    // 必須存在的圖示
  './icon-512.png',    // 必須存在的圖示
  './manifest.json',   // 安裝設定檔
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// 安裝階段：將核心檔案存入快取
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // addAll 會在任一檔案抓取失敗時中斷安裝，確保快取完整性
        return cache.addAll(urlsToCache).catch(err => console.error('快取失敗:', err));
      })
  );
  self.skipWaiting(); // 強制跳過等待，立即接管
});

// 激活階段：清除過期的舊版本快取
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
  return self.clients.claim(); // 立即開始控制所有客戶端
});

// 擷取階段：處理網路請求
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 針對導航請求 (HTML 頁面)：採用 Network-First 策略，確保讀到最新版
  if (event.request.mode === 'navigate' || requestUrl.pathname.endsWith('.html') || requestUrl.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match('./index.html')) // 斷網時讀取快取的入口點
    );
  } else {
    // 針對其餘靜態資源 (JS/CSS/圖示)：採用 Cache-First 策略
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