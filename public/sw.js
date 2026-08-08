const CACHE_NAME = 'xiaoduoli-shell-v4'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/pet/xiaoduoli-large.jpg',
  '/pet/xiaoduoli-small.jpg',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

// 图片资源：缓存优先，后台更新（第二次打开秒开、离线可用）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin === self.location.origin && /\.(png|jpg|jpeg|webp|svg)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request)
        const fetched = fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone())
            return response
          })
          .catch(() => cached)
        return cached || fetched
      })
    )
    return
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((response) => response || caches.match('/')))
  )
})

// Web Push：服务端发的是空载荷唤醒推送，展示通用通知
self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('小多利', {
      body: '汪！有人在叫你，快回家看看～',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'xiaoduoli-push',
      renotify: true
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((item) => 'focus' in item)
      if (client) return client.focus()
      return self.clients.openWindow('/')
    })
  )
})
