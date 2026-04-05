// Mapeia.AI — Service Worker
// Estratégia: Cache First para estáticos, Network First para páginas

const CACHE_NAME = 'mapeia-v1'
const STATIC_ASSETS = [
  '/',
  '/upload',
  '/dashboard',
  '/terms',
  '/privacy',
  '/manifest.json',
  '/icons/icon.svg',
]

// ── Install: pré-cache dos assets estáticos ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── Activate: limpa caches antigos ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: estratégia por tipo de request ──
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requests não-GET e da API
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  // Next.js internals (HMR, build chunks)
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Fontes externas (Google Fonts, unpkg)
  if (url.origin !== self.location.origin) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Páginas e assets: Network First com fallback para cache
  event.respondWith(networkFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Recurso indisponível offline', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    // Fallback offline para navegação
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/')
      if (offlinePage) return offlinePage
    }

    return new Response('Você está offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
