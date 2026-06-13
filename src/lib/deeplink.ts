// Deep-link routing for the weekly email links (#settings, #days, #day/N).
// The tricky case: a logged-out man taps a link, then signs in with GOOGLE,
// which does a full redirect that DROPS the #hash. So we stash the target in
// localStorage on load and consume it after login. A timestamp expires a stale
// stash so a normal open never accidentally deep-links somewhere.
const KEY = 'pendingDeepLink'
const MAX_AGE_MS = 5 * 60 * 1000

function isDeepLink(h: string): boolean {
  return h === '#settings' || h === '#days' || /^#day\/\d+$/.test(h)
}

// Stash any deep-link hash present at load, BEFORE an OAuth redirect can lose it.
export function captureDeepLink(): void {
  const h = window.location.hash.toLowerCase()
  if (isDeepLink(h)) {
    try { localStorage.setItem(KEY, JSON.stringify({ t: h, at: Date.now() })) } catch { /* ignore */ }
  }
}

// Return the deep-link target if it matches `wants`, consuming it (clear stash +
// URL hash). Each caller only consumes its OWN kind, so a #settings target is
// left intact for the settings handler even if the history handler checks first.
export function consumeDeepLink(wants: (target: string) => boolean): string | null {
  const h = window.location.hash.toLowerCase()
  const live = isDeepLink(h) ? h : null
  let stashed: string | null = null
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const o = JSON.parse(raw) as { t?: string; at?: number }
      if (typeof o.t === 'string' && typeof o.at === 'number' && Date.now() - o.at < MAX_AGE_MS) stashed = o.t
    }
  } catch { /* ignore */ }

  const target = live ?? stashed
  if (!target || !wants(target)) return null

  if (stashed === target) { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }
  if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  return target
}

export const isSettingsLink = (t: string) => t === '#settings'
export const isHistoryLink = (t: string) => t === '#days' || /^#day\/\d+$/.test(t)
export const dayFromLink = (t: string): number | undefined => {
  const m = t.match(/^#day\/(\d+)$/)
  return m ? Number(m[1]) : undefined
}
