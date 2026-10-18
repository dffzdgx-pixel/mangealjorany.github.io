// Service Worker لتطبيق "مكتبة الجوراني"
// يحفظ كل ملفات التطبيق داخل الجهاز، فيعمل بدون إنترنت بعد أول فتح.
// عند تعديل أي ملف في الموقع: غيّر قيمة CACHE_VERSION (مثلاً v3) ليحصل الجميع على النسخة الجديدة.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `jurani-cache-${CACHE_VERSION}`;

// كل الملفات التي يحتاجها التطبيق (كلها داخل الموقع، لا يوجد أي رابط خارجي)
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './vendor/jspdf.umd.min.js',
  './vendor/html2canvas.min.js',
  './vendor/chart.umd.min.js',
  './vendor/xlsx.full.min.js',
  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './vendor/fontawesome/webfonts/fa-regular-400.woff2',
  './vendor/fontawesome/webfonts/fa-brands-400.woff2',
  './vendor/fontawesome/webfonts/fa-v4compatibility.woff2',
  './vendor/inter/inter.css',
  './vendor/inter/inter-latin-300-normal.woff2',
  './vendor/inter/inter-latin-400-normal.woff2',
  './vendor/inter/inter-latin-500-normal.woff2',
  './vendor/inter/inter-latin-600-normal.woff2',
  './vendor/inter/inter-latin-700-normal.woff2',
  './vendor/inter/inter-latin-800-normal.woff2'
];

// تحويل المسارات إلى روابط كاملة بالنسبة لمكان هذا الملف (يعمل داخل أي مسار، مثل /mangealjorany.github.io/)
const PRECACHE = PRECACHE_URLS.map(url => new URL(url, self.location).href);

// التثبيت: حفظ كل الملفات في الكاش
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

// التفعيل: حذف الكاش القديم والسيطرة على الصفحات المفتوحة
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

// الطلبات: نعرض من الكاش فوراً (يعمل بدون إنترنت)، ونحدّثه من الشبكة في الخلفية
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(staleWhileRevalidate(event));
});

async function staleWhileRevalidate(event) {
  const { request } = event;
  const isPage = request.mode === 'navigate';
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: isPage });

  const network = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }

  const response = await network;
  if (response) return response;

  // بدون إنترنت ولم تُحفظ هذه الصفحة: نعرض الصفحة الرئيسية
  if (isPage) {
    const home = await cache.match(new URL('./index.html', self.location).href);
    if (home) return home;
  }
  return Response.error();
}
