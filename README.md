# The Journey

A PWA that delivers a daily devotional ("The Daily") as text and audio, lets a
member log a quick check-in, shows his private progress, and gives the admin a
view of engagement.

**Stack:** Vite + React + TypeScript (PWA) · Supabase (auth, Postgres, storage, RLS)
**Auth:** Sign in with Google (primary) · email 6-digit code (fallback) — both passwordless

## Step 1 status — auth scaffold (current)

Done so far:

- Vite + React + TS app, installable as a PWA (`vite-plugin-pwa`, manifest + service worker).
- Supabase client wired to env vars.
- Sign-in flow: **Continue with Google** (OAuth) as primary; **email 6-digit code**
  (OTP: request → verify) as fallback for users without a Google account.
- Signed-in view showing the user's email + sign out.

The database schema (check-ins, events, daily content) and RLS policies are
**not** built yet — that is the next step.

## One-time setup

You need a Supabase project + its API keys, and a Google OAuth client, before
both sign-in methods work.

### 1. Create a Supabase project

1. Go to https://supabase.com → **New project**. Pick a name and a strong
   database password (you won't need it for step 1).
2. Once it finishes provisioning, open **Project Settings → API**.
3. Copy the **Project URL** and the **anon / public** key.

### 2. Configure local env

```sh
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

`.env.local` is gitignored, so your keys stay out of version control. Only the
**anon** key belongs here — never the service-role key (it bypasses RLS).

### 3. Configure auth URLs

In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** add `http://localhost:5173` (where the user lands after the
  Google round-trip).

### 4. Enable Google sign-in (primary)

You need a Google OAuth client, then connect it to Supabase.

1. In **Google Cloud Console** → **APIs & Services → Credentials** → **Create
   credentials → OAuth client ID** → application type **Web application**.
2. Under **Authorized redirect URIs**, add your Supabase callback:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (find it in Supabase → Authentication → Providers → Google; copy it exactly).
3. Copy the generated **Client ID** and **Client secret**.
4. In **Supabase → Authentication → Providers → Google**: enable it and paste the
   Client ID + secret. Save.

(First time using OAuth in this Google project, you may need to configure the
**OAuth consent screen** — pick "External", add yourself as a test user.)

### 5. Enable the 6-digit email code (fallback)

By default Supabase's email template sends a magic *link*, not a code. To send a
6-digit code instead:

1. In **Supabase → Authentication → Email Templates → Magic Link**, edit the body
   to include the token, e.g. `Your code is {{ .Token }}` (instead of relying on
   `{{ .ConfirmationURL }}`).
2. Save. The app calls `verifyOtp` with whatever code the user types.

No separate test user is needed — both methods create the user automatically on
first successful sign-in.

## Run it

```sh
npm install      # if you haven't already
npm run dev
```

Open http://localhost:5173.

## Testing auth with one user

**Google (primary):**

1. Click **Continue with Google**, pick your account, approve.
2. You land back on the app showing **"You're in"** and your email.

**Email 6-digit code (fallback):**

1. Enter your email, click **Send code**.
2. Check your inbox for the 6-digit code (built-in email is rate-limited to a few
   per hour — fine for testing, not production; we'll add custom SMTP before launch).
   - **Tip:** to skip the inbox, you can read the token via the dashboard logs, or
     just test the Google path.
3. Enter the code, click **Verify** → **"You're in"**.

Click **Sign out** to confirm the session clears for either method.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check + production build (also generates the service worker)
- `npm run preview` — serve the production build locally
- `npm run lint` — ESLint

## Notes / known rough edges (to revisit later)

- **Production email:** swap Supabase's built-in email for custom SMTP (Resend/Postmark).
- **Google OAuth in production:** add your real domain to the Google client's
  authorized redirect URIs and Supabase's redirect URLs, and publish the OAuth
  consent screen.
- **PWA icons:** `public/pwa-192.png` and `public/pwa-512.png` are solid-color
  placeholders — replace with real artwork before launch.
- **Admin view:** will read across all users, which RLS deliberately blocks for
  normal members. We'll handle it with an admin role check / `security definer`
  function, not by weakening per-user policies.
