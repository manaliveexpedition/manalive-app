/// <reference lib="webworker" />
// Custom service worker (vite-plugin-pwa injectManifest mode).
// Responsibilities:
//   1. Workbox precaching + offline shell (parity with the old generateSW output).
//   2. autoUpdate behaviour: a new SW takes over immediately (skipWaiting + claim).
//   3. Web Push: show a gentle notification and set the app-icon badge dot.
//   4. Notification taps focus an open tab or open the app.
// There are no push subscriptions yet (that arrives in a later stage), so the
// push handler is dormant in practice until a man opts in.
import { precacheAndRoute, cleanupOutdatedCaches, type PrecacheEntry } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>
}

// --- Precache (the build injects the asset manifest into __WB_MANIFEST) ---
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// --- autoUpdate parity: activate the new SW right away and control all tabs ---
self.addEventListener('install', () => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// --- Push: best-effort badge dot + a visible notification ---
// (iOS requires a notification to be shown on every push, or it revokes the
// subscription, so we always show one.)
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload: { title?: string; body?: string; tag?: string; badge?: boolean } = {}
      try {
        payload = event.data?.json() ?? {}
      } catch {
        // non-JSON or empty payload: fall back to defaults below
      }

      // Set the app-icon dot only when the sender asks for it (the man's
      // "new-day dot" toggle). Default to true for payloads without the flag
      // (e.g. the manual test script). The Badging API is not typed on
      // WorkerNavigator, so probe it defensively.
      if (payload.badge !== false) {
        const nav = self.navigator as { setAppBadge?: () => Promise<void> }
        if (typeof nav.setAppBadge === 'function') {
          try {
            await nav.setAppBadge()
          } catch {
            // badge not supported / not installed: ignore
          }
        }
      }

      await self.registration.showNotification(payload.title ?? 'ManAlive', {
        body: payload.body ?? 'A new day is ready.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: payload.tag ?? 'daily', // same tag replaces, never stacks
      })
    })(),
  )
})

// --- Click: focus an existing window, otherwise open the app on Today ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((c): c is WindowClient => 'focus' in c)
      if (open) {
        await open.focus()
        return
      }
      await self.clients.openWindow('/')
    })(),
  )
})
