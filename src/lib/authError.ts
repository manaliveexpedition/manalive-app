// Turn Supabase Auth errors into words a man can act on.
//
// The camp-roster gate (handle_new_user) refuses to create an account for an
// email that isn't on a roster. Supabase Auth reports that only as a generic
// "Database error saving new user", from the email-code request or, for
// Google, as an error on the redirect back to the app.

export const NOT_ON_ROSTER_MESSAGE =
  "We couldn't find that email on a camp roster. Sign in with the email you registered with for camp. " +
  'If that still doesn\'t work, email Pulley at jpulley@manaliveexpedition.com and he\'ll get you in.'

export function friendlyAuthError(message: string): string {
  return /database error saving new user|not_on_roster/i.test(message) ? NOT_ON_ROSTER_MESSAGE : message
}

// After a failed Google sign-in, Supabase redirects back with the error in the
// URL (query or hash). Read it once, clear it from the address bar, and return
// a friendly message, or null when there was no error.
export function consumeAuthRedirectError(): string | null {
  const params = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const desc = params.get('error_description') ?? hash.get('error_description')
  const code = params.get('error') ?? hash.get('error')
  if (!desc && !code) return null
  window.history.replaceState(null, '', window.location.pathname)
  return friendlyAuthError(desc ?? code ?? 'Sign-in failed.')
}
