const CACHE_NAME = 'xiaoduoli-shell-v11'
const NAVIGATION_TIMEOUT_MS = 2500
const APP_SHELL = [
  '/manifest.webmanifest',
  '/pet/xiaoduoli.png',
  '/nest/room-background.webp',
  '/navigation/tab-bar-background.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/navigation/nest.png',
  '/navigation/journal.png',
  '/navigation/paw.png',
  '/navigation/messages.png',
  '/navigation/me.png',
  '/me/birthday.png',
  '/me/notification.png',
  '/me/contact.png',
  '/me/about.png',
  '/me/logout.png'
]

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  const response = await fetch('/index.html', { cache: 'no-store' })
  if (!response.ok) throw new Error('app_shell_unavailable')
  const html = await response.clone().text()
  const assetUrls = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1])
  const shellRequests = [...APP_SHELL, ...assetUrls]
    .map((assetUrl) => new Request(assetUrl, { cache: 'reload' }))
  await Promise.all([
    cache.put('/', response.clone()),
    cache.put('/index.html', response),
    cache.addAll(shellRequests)
  ])
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell())
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

function fetchWithTimeout(request, timeoutMs) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => setTimeout(() => reject(new Error('network_timeout')), timeoutMs))
  ])
}

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match('/index.html') || await cache.match('/')
  try {
    const response = await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS)
    if (response.ok) {
      await Promise.all([
        cache.put('/', response.clone()),
        cache.put('/index.html', response.clone())
      ])
    }
    return response
  } catch {
    return cached || Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) void cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || network
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return
  }

  if (
    request.destination === 'script'
    || request.destination === 'style'
    || request.destination === 'font'
    || request.destination === 'image'
  ) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('小多利', {
      body: '你有一条新消息',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'pet10-message',
      renotify: true,
      data: { url: '/' }
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
