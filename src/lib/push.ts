// Web Push client helpers: capability checks, permission + subscription, and
// reading/writing a man's notification_prefs row. The actual sending happens
// server-side (edge function); this file is only the browser side.
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

// The new-day dot is automatic (it rides every push), so it is NOT a user
// setting. The only thing a man chooses is whether to get the daily reminder,
// and at what time.
export type NotificationPrefs = {
  reminder_enabled: boolean
  reminder_time: string // 'HH:MM' (DB stores time; we trim seconds)
  timezone: string
}

export function defaultPrefs(): NotificationPrefs {
  return {
    reminder_enabled: false,
    reminder_time: '08:00',
    timezone: localTimezone(),
  }
}

// Current notification permission, or 'unsupported' if the browser lacks the API.
export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Does the browser have the APIs at all? (Push + notifications + SW.)
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (!uid) throw new Error('Not signed in')
  return uid
}

// --- prefs -----------------------------------------------------------------
export async function loadPrefs(): Promise<NotificationPrefs> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('reminder_enabled, reminder_time, timezone')
    .eq('user_id', uid)
    .maybeSingle()
  if (error) throw error
  if (!data) return defaultPrefs()
  return {
    reminder_enabled: data.reminder_enabled,
    reminder_time: hhmm(data.reminder_time),
    timezone: data.timezone,
  }
}

export async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  const uid = await getUid()
  // Always refresh the timezone on save, in case the man travels / it was UTC.
  const { error } = await supabase.from('notification_prefs').upsert(
    {
      user_id: uid,
      reminder_enabled: prefs.reminder_enabled,
      reminder_time: prefs.reminder_time,
      timezone: localTimezone(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}

// --- subscription ----------------------------------------------------------
export type EnableResult = { ok: true } | { ok: false; reason: 'unsupported' | 'denied' | 'error' }

// Request permission (must be from a user gesture) and register a push
// subscription, storing it for the server to send to. Idempotent.
export async function enablePush(): Promise<EnableResult> {
  if (!pushSupported() || !VAPID_PUBLIC_KEY) return { ok: false, reason: 'unsupported' }
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: 'denied' }

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    await storeSubscription(sub)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

async function storeSubscription(sub: PushSubscription): Promise<void> {
  const uid = await getUid()
  const json = sub.toJSON()
  const endpoint = sub.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) throw new Error('Incomplete push subscription')
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: uid,
      endpoint,
      p256dh,
      auth,
      ua_label: shortUA(),
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

// Clear the app-icon badge dot (called when the man opens/reads the day).
export function clearBadge(): void {
  const n = navigator as Navigator & { clearAppBadge?: () => Promise<void> }
  if (typeof n.clearAppBadge === 'function') {
    n.clearAppBadge().catch(() => {
      /* unsupported / not installed: ignore */
    })
  }
}

// --- small helpers ---------------------------------------------------------
function hhmm(time: string | null | undefined): string {
  if (!time) return '08:00'
  return time.slice(0, 5) // 'HH:MM:SS' -> 'HH:MM'
}

function shortUA(): string {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'iPhone'
  if (/android/i.test(ua)) return 'Android'
  return 'Browser'
}

// Standard VAPID public key (base64url) -> Uint8Array for applicationServerKey.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  // Allocate from an explicit ArrayBuffer so the type is Uint8Array<ArrayBuffer>
  // (not ArrayBufferLike), which satisfies BufferSource for applicationServerKey.
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}
