# Deploying ManAlive

The app is a static Vite build (`dist/`) talking to Supabase. Any static host
with a free tier works; these notes use **Vercel** (simplest for Vite).

## Build settings

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

## Environment variables (set on the host)

These are the **public** client values (the anon key is publishable and already
ships in the browser bundle — safe to expose). Copy them from your local
`.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

> Never put `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, or
> `SUPABASE_ACCESS_TOKEN` on the host. Those are server/admin only and live in
> `.secrets.local` (gitignored).

## One-time setup (GitHub + Vercel)

1. **Create an empty GitHub repo** (no README/license) at github.com/new — e.g. `manalive-app`.
2. **Push this project** to it (from the project root):
   ```
   git remote add origin https://github.com/<you>/manalive-app.git
   git branch -M main
   git push -u origin main
   ```
3. **Import into Vercel**: vercel.com → Add New → Project → import the repo.
   Confirm the build settings above and add the two `VITE_` env vars → Deploy.
4. Vercel gives you a URL like `https://manalive-app.vercel.app`.

## After the first deploy — point auth at the real domain

In **Supabase → Authentication → URL Configuration**:
- **Site URL**: your Vercel URL
- **Redirect URLs**: add `https://<your-vercel-url>/**`

When you open Google sign-in to everyone, also add the Vercel URL to the Google
OAuth client's **Authorized JavaScript origins** and the Supabase callback stays
as the **Authorized redirect URI**, then **Publish** the OAuth consent screen.

## Installing on a phone (PWA)

Once it's live on HTTPS, open the URL in Chrome (Android) or Safari (iOS) and
use **Add to Home Screen**. No app store needed for the beta.
