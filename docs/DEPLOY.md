# Testing and deploying Felt

Felt is a static web app (a PWA). Today it needs no server: lessons, charts and the solver ship in the app, and each player's progress is stored in their own browser. Deploying means putting the built files on a static host with HTTPS.

## 1. Test

### Automated checks

```bash
pnpm install
pnpm check      # typecheck and every unit test (core, content, web)
pnpm build      # production build into apps/web/dist
```

GitHub Actions runs the same steps on every push (`.github/workflows/ci.yml`).

### On your computer

```bash
pnpm dev        # http://localhost:5173, reloads as you edit
```

To test the production build, including the offline service worker:

```bash
pnpm build
pnpm preview    # http://localhost:4173
```

### On your phone, before deploying

Run the dev server so other devices on your Wi-Fi can reach it:

```bash
pnpm dev --host
```

Vite prints a `Network:` address such as `http://192.168.1.20:5173`. Open it on the phone. Everything works except two things that need HTTPS: Add to Home Screen as an app, and working offline. Test those on a deployed URL (section 2), which every host below gives you for free.

### Things worth checking by hand

- Go through onboarding, the placement test, a lesson, review, the daily challenge and Practice.
- Settings, then tap the version number seven times: developer mode appears, with a Pro switch, onboarding replay and progress reset.
- Settings, Your data: save a backup, clear the site's data in the browser, restore the backup.
- Import: drop in a PokerStars hand history file and a sessions CSV.
- Turn on airplane mode after one visit to the deployed site: the app should still open.

## 2. Deploy

Any static host works. The repo has ready configs for Vercel and Netlify: build with `pnpm build`, publish `apps/web/dist`, and send every route to `index.html` (the app uses client side routes such as `/learn`).

### Vercel (recommended)

1. Sign in at vercel.com with GitHub and choose Add New, then Project.
2. Import `ZacBarron/Felt`. Vercel reads `vercel.json`; leave the root directory as the repo root.
3. Deploy. You get a `https://felt-xxxx.vercel.app` address.
4. Under Settings, Git, set the production branch (for example `main`). Every push to it redeploys; every other branch and pull request gets its own preview URL, which is the easiest way to test a change on your phone.

### Netlify

New site from Git, pick the repo. `netlify.toml` sets the build, Node 22, the route fallback and cache headers.

### Cloudflare Pages

Create a Pages project from the repo with build command `pnpm install --frozen-lockfile && pnpm build`, output directory `apps/web/dist`, and environment variable `NODE_VERSION=22`. Pages serves `index.html` for unknown routes on its own.

### Your own domain

Add the domain in the host's dashboard and create the DNS record it shows. HTTPS is issued automatically.

### Updates

The service worker updates itself: after a deploy, players get the new version the next time they open the app. The configs keep `sw.js` and `index.html` uncached so updates are never stuck.

## 3. Keeping player data safe

All study data lives in the browser (IndexedDB) on each device, so a deploy never touches it, and a new domain starts empty.

- Felt asks the browser to keep its storage persistent after onboarding. Settings, Your data shows whether that was granted.
- Safari clears site data after about seven days without a visit unless the site is added to the home screen. Ask players to add Felt to the home screen.
- Settings, Your data, Save a backup writes one file with everything (study, ratings, saves, imports, settings). Restore from a backup brings it back on any device.
- Keep the same domain once players use the app: data is tied to the address.

## 4. When Felt needs a server

None of these work without one, and each is a separate step:

| Need | What it takes | Suggested service |
| --- | --- | --- |
| Real payments for Felt Pro | Checkout and receipts, connected to `purchase()` in `apps/web/src/state/access.ts` | Stripe Checkout for the web; RevenueCat if the app ships to the App Store or Play |
| Accounts and sync across devices | Sign in, then store progress per user instead of only in the browser | Supabase (Postgres, auth and row level security) |
| Push reminders | Web push subscriptions and a scheduled sender | Supabase Edge Functions or Cloudflare Workers with a cron |
| Leagues, global daily stats, calibrated ratings | Every player's answers in one place | Same database as accounts |
| App Store and Play | Wrap the web app as a native shell | Capacitor |

A sensible order: deploy the static app now, add Stripe when ready to charge, then Supabase accounts so progress follows the player, then push and leagues. `/terms` and `/privacy` pages are linked from the paywall and need writing before charging.
