/* global self */

const CACHE_VERSION = "v1"
const CACHE_NAME = `todo-pwa-${CACHE_VERSION}`

const APP_SHELL_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/maskable.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(APP_SHELL_URLS)
      self.skipWaiting()
    })()
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.startsWith("todo-pwa-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
      self.clients.claim()
    })()
  )
})

function isNavigationRequest(request) {
  return request.mode === "navigate" ||
    (request.method === "GET" &&
      request.headers.get("accept")?.includes("text/html"))
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request)
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, networkResponse.clone())
          return networkResponse
        } catch {
          const indexUrl = new URL("./index.html", self.location)
          return (await caches.match(indexUrl)) || new Response("Offline", { status: 503 })
        }
      })()
    )
    return
  }

  // Cache-first for same-origin static assets within our scope.
  const url = new URL(request.url)
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => (await caches.match(request)) || fetch(request))()
    )
  }
})
