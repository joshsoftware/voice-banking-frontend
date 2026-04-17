const STATIC_CACHE = 'voicebank-static-v1'
const RUNTIME_CACHE = 'voicebank-runtime-v1'
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = ['/', '/index.html', OFFLINE_URL, '/manifest.webmanifest', '/favicon.svg']

// Never cache auth/session/voice/realtime endpoints.
const NETWORK_ONLY_PATTERNS = [
  /\/start($|\/)/,
  /\/sessions($|\/)/,
  /\/api($|\/)/,
  /\/voiceprint($|\/)/,
  /\/verify($|\/)/,
  /\/enrollment($|\/)/,
  /\/auth($|\/)/,
  /\/otp($|\/)/,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return

  // Network only for sensitive/realtime APIs.
  if (NETWORK_ONLY_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(fetch(request))
    return
  }

  // Do not cache cross-origin API calls by default.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request))
    return
  }

  // Navigation: network first, fallback to cached shell/offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/index.html')) || caches.match(OFFLINE_URL))
    )
    return
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => cached)

      return cached || networkFetch
    })
  )
})
