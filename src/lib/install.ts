// Add-to-Home-Screen (PWA install) helpers.
//
// Android/desktop Chrome fire `beforeinstallprompt`, which we capture and replay
// from a button. iOS Safari has NO install API, so there we show instructions.
// The event can fire before React mounts, so we capture it at module load and
// let components subscribe.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach((s) => s())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => { deferred = null; emit() })
}

export function getInstallPrompt() { return deferred }
export function clearInstallPrompt() { deferred = null; emit() }
export function subscribeInstall(cb: () => void) { subs.add(cb); return () => { subs.delete(cb) } }

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}
