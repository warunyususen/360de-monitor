// 360DE Temperature Monitor - Service Worker
// Version: 1.0.0

const CACHE_NAME = '360de-monitor-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/360DE.jpg',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // External CDNs (optional - ถ้า offline จะใช้ cached version)
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap'
];

// Install Event - Cache ไฟล์ทั้งหมด
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell...');
        // Cache local files first (ต้องสำเร็จ)
        return cache.addAll([
          '/',
          '/index.html',
          '/360DE.jpg',
          '/icons/icon-180.png',
          '/icons/icon-192.png',
          '/icons/icon-512.png'
        ]);
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err);
      })
  );
});

// Activate Event - ลบ cache เก่า
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients...');
      return self.clients.claim();
    })
  );
});

// Fetch Event - Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    // ลอง fetch จาก network ก่อน
    fetch(event.request)
      .then((networkResponse) => {
        // ถ้าได้ response จาก network สำเร็จ
        if (networkResponse && networkResponse.status === 200) {
          // Clone response เพื่อเก็บ cache
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // เก็บเฉพาะ local files และ CDN ที่สำคัญ
            if (event.request.url.includes(self.location.origin) ||
                event.request.url.includes('cdn.tailwindcss.com') ||
                event.request.url.includes('unpkg.com') ||
                event.request.url.includes('fonts.googleapis.com') ||
                event.request.url.includes('fonts.gstatic.com')) {
              cache.put(event.request, responseClone);
            }
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed - ใช้ cache
        console.log('[SW] Network failed, trying cache for:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // ถ้าไม่มีใน cache และเป็น navigate request - แสดง offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
