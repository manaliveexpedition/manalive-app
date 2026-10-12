// Cross-screen navigation and outbound links.

// Ask the app shell to switch tabs (e.g. Day 7 -> My Notes). A window event
// keeps the screens from needing the shell's setView threaded through them.
export const NAVIGATE_EVENT = 'journey:navigate'
export type NavTarget = 'notes' | 'today'
export function navigateTo(view: NavTarget) {
  window.dispatchEvent(new CustomEvent<NavTarget>(NAVIGATE_EVENT, { detail: view }))
}

// The alumni Facebook group. Facebook won't let an app pre-fill a post, so the
// Share card copies his words and opens the group for him to paste.
export const ALUMNI_GROUP_URL = 'https://www.facebook.com/groups/manalivealumni'
