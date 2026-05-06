const STATIC_CACHE = 'voicebank-static-v2'
const RUNTIME_CACHE = 'voicebank-runtime-v2'
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
    caches.open(STATIC_CACHE)
      .then(async (cache) => {
        // Precache the basic URLs first
        await cache.addAll(PRECACHE_URLS)
        
        // Fetch and cache all JS and CSS bundles from /assets/
        try {
          const assetManifest = await fetch('/index.html')
          const html = await assetManifest.text()
          
          // Extract all /assets/*.js and /assets/*.css URLs from the HTML
          const jsMatches = html.matchAll(/\/assets\/[^"']+\.js/g)
          const cssMatches = html.matchAll(/\/assets\/[^"']+\.css/g)
          
          const assetUrls = [
            ...Array.from(jsMatches, match => match[0]),
            ...Array.from(cssMatches, match => match[0])
          ]
          
          // Cache all found assets
          if (assetUrls.length > 0) {
            await cache.addAll(assetUrls)
            console.log(`[SW] Precached ${assetUrls.length} assets`)
          }
        } catch (error) {
          console.warn('[SW] Failed to precache assets:', error)
        }
      })
      .then(() => self.skipWaiting())
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

  // Immutable assets (JS/CSS with content hashes): CACHE-FIRST for instant loads
  if (url.pathname.startsWith('/assets/') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached  // Return from cache immediately
        }
        
        // Not in cache, fetch and cache it
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Other static assets: stale-while-revalidate
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