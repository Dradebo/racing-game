const CACHE = 'striving-observation-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/striving-observation-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

function isPrivateRequest(request) {
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return true
  if (url.pathname.startsWith('/api/')) return true
  if (request.headers.has('authorization')) return true
  return false
}

function isSafeAsset(request) {
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  return request.destination === 'script' || request.destination === 'style' || request.destination === 'font' || request.destination === 'image'
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  if (isPrivateRequest(request)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/'))),
    )
    return
  }

  if (!isSafeAsset(request)) return

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const cacheControl = response.headers.get('cache-control') || ''
      if (response.ok && !/private|no-store/i.test(cacheControl)) {
        caches.open(CACHE).then((cache) => cache.put(request, response.clone()))
      }
      return response
    })),
  )
})
