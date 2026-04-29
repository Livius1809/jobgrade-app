/**
 * Service Worker — JobGrade PWA
 * Cache-first pentru assets statice, network-first pentru API
 */

const CACHE_NAME = "jobgrade-v1"
const STATIC_ASSETS = [
  "/favicon.svg",
  "/favicon.ico",
]

// Install — pre-cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — network first for API, cache first for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // API calls — passthrough direct la network (nu intercepta!)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request))
    return
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.match(/\.(js|css|svg|ico|png|jpg|woff2?)$/))) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
