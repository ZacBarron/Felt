# Testing and deploying Aced

Aced is a web app that installs on a phone (a PWA). It runs on its own from any static host. Lessons, charts and the solver ship inside the app. Each player's progress is stored in their own browser.

The Aced server adds accounts, sync across devices, study reminders, leagues and Aced Pro billing. One server process hosts both the app and its API. It keeps everything in one SQLite file.

## 1. Test

### Automated checks

```bash
pnpm install
pnpm check      # typecheck and every unit test (core, content, web, server)
pnpm build      # production build of the app into apps/web/dist
```

GitHub Actions runs the same steps on every push (`.github/workflows/ci.yml`).

### On your computer

```bash
pnpm dev        # http://localhost:5173, reloads as you edit
```

To try accounts and sync, run the server in a second terminal:

```bash
pnpm dev:server # http://localhost:8787, the app sends /api here
```

In development the server shows sign in codes on screen and in its log. No email key is needed.

To test the production build, including the offline service worker:

```bash
pnpm build
pnpm preview    # http://localhost:4173
```

To run exactly what a host runs:

```bash
pnpm build:server   # builds the app, then bundles the server
pnpm start          # http://localhost:8787, serves the app and the API
```

### On your phone, before deploying

Run the dev server so other devices on your Wi-Fi can reach it:

```bash
pnpm dev --host
```

Vite prints a `Network:` address such as `http://192.168.1.20:5173`. Open it on the phone. Everything works except 2 things that need HTTPS. Those are Add to Home Screen as an app, and working offline. Test them on a deployed URL, which every host below gives you for free.

### Things worth checking by hand

- Go through onboarding, the placement quiz, a lesson, review, the daily challenge and practice.
- Open Settings and tap the version number 7 times. Developer mode appears with a Pro switch, onboarding replay and progress reset.
- In Settings, Your data, save a backup. Clear the site's data in the browser. Restore the backup.
- Import a PokerStars hand history file and a sessions CSV.
- Visit the deployed site once. Turn on airplane mode. The app should still open.

## 2. Deploy the app with its server

The repo has a `Dockerfile`, a `fly.toml` and a `render.yaml`. The image holds the server bundle and the built app. It has no dev dependencies. The database lives on a volume mounted at `/data`.

You need 3 things before players can sign in.

1. A host with a persistent volume. Fly.io and Render both work.
2. A Resend account for sign in emails.
3. A pair of VAPID keys for reminders.

### Make the keys first

```bash
pnpm install
pnpm --filter @felt/server vapid
```

This prints `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Make them once and keep them. New keys break every reminder players already turned on.

For email, sign up at resend.com. Its free tier is enough for a group of testers. Add and verify your domain there. Until a domain is verified, Resend only delivers to your own address. Create an API key.

### Fly.io (fastest)

Install the `fly` command line tool and sign in with `fly auth login`. Then:

1. Pick an app name. Put it in `fly.toml` as `app`. Put `https://<name>.fly.dev` in `APP_URL`.
2. Create the app and its volume.

   ```bash
   fly apps create <name>
   fly volumes create felt_data --size 1 --region iad --yes
   ```

3. Add the secrets.

   ```bash
   fly secrets set \
     RESEND_API_KEY=re_... \
     EMAIL_FROM="Aced <login@yourdomain.com>" \
     VAPID_PUBLIC_KEY=... \
     VAPID_PRIVATE_KEY=... \
     VAPID_SUBJECT=mailto:you@yourdomain.com
   ```

4. Deploy one machine.

   ```bash
   fly deploy --ha=false
   ```

5. Open `https://<name>.fly.dev/api/health`. It lists which features are on.

Fly builds the image on its own builders. Each `fly deploy` ships the current code. `fly.toml` keeps 1 machine running at all times so reminders go out. It checks `/api/health` every 30 seconds. Keep it to 1 machine. SQLite cannot be shared between machines.

To fill in the contact line on the terms and privacy pages, add `--build-arg VITE_SUPPORT_EMAIL=you@yourdomain.com` to `fly deploy`.

### Render

Persistent disks need a paid instance on Render. The Starter type is enough.

1. Push the repo to GitHub.
2. In the Render dashboard choose New, then Blueprint. Pick the repo. Render reads `render.yaml`.
3. Render asks for each secret. Fill in `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM` and the 3 VAPID values. Leave the Stripe values empty for now.
4. Apply the Blueprint. Render builds the `Dockerfile` and mounts a 1 GB disk at `/data`.
5. Your address is shown at the top of the service page. If it differs from the `APP_URL` you entered, update `APP_URL` under Environment.
6. Open `<your address>/api/health` to see which features are on.

Every push to the connected branch redeploys. Render runs 1 instance, because a service with a disk cannot scale out. Add `VITE_SUPPORT_EMAIL` under Environment to fill in the contact line on the legal pages.

### Any other host

Any host that runs a Docker image with a volume works.

```bash
docker build -t felt .
docker run -p 8787:8787 -v felt-data:/data --env-file apps/server/.env felt
```

Without Docker, run `pnpm install --frozen-lockfile && pnpm build:server`, then `pnpm start` with Node 22.13 or later.

### Settings

Every setting is an environment variable. `apps/server/.env.example` lists them all. An empty value counts as not set.

| Variable | What it does | Needed |
| --- | --- | --- |
| `APP_URL` | The address players use. Emails and Stripe links point here. | Yes |
| `DATABASE_PATH` | The SQLite file. The image sets `/data/felt.sqlite`. | Set for you |
| `NODE_ENV` | `production` on a live server. The image sets it. | Set for you |
| `PORT` | The port the server listens on. The default is 8787. | Set for you |
| `WEB_DIR` | The built app to serve. The image sets `/app/web`. | Set for you |
| `WEBAUTHN_RP_ID` | The domain the app's pages are on, such as `felt-app.fly.dev` or `zacbarron.github.io`. Passkeys are tied to it. | For passkeys |
| `WEBAUTHN_ORIGINS` | The exact page origins, comma separated, such as `https://zacbarron.github.io`. | For passkeys |
| `WEBAUTHN_RP_NAME` | The name in passkey prompts. The default is Aced. | Optional |
| `ALLOWED_ORIGINS` | Other sites that may call the API from a browser, comma separated. Empty means only the server's own pages. | For the Pages link |
| `RESEND_API_KEY` | Sends sign in emails through Resend. | For email codes |
| `EMAIL_FROM` | The sender, such as `Aced <login@yourdomain.com>`. Use your verified domain. | For accounts |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Signs study reminders. | For reminders |
| `VAPID_SUBJECT` | A `mailto:` address push services can contact. | For reminders |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Takes payments for Aced Pro. | Optional |
| `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_MONTHLY` | The 2 Stripe price ids. | Optional |
| `TRIAL_DAYS` | Length of the free trial. The default is 7. | Optional |
| `ANTHROPIC_API_KEY` | Turns on the AI coach for Aced Pro players. Without it the coach is off. | Optional |
| `COACH_MODEL` | The Claude model the coach uses. The default is `claude-opus-5-5`. | Optional |
| `COACH_EFFORT` | How hard the model thinks: `low`, `medium`, `high`, `xhigh` or `max`. The default is `medium`. | Optional |
| `COACH_DAILY_LIMIT` | Coach messages each player can send a day. The default is 40. | Optional |
| `PRO_FOR_EVERYONE` | Testing only. `true` gives every signed in player Aced Pro, including the AI coach. The default is `false`. | Optional |
| `VITE_SUPPORT_EMAIL` | Contact address on the legal pages. It is read when the app is built. | Optional |

### How players sign in

Passkeys come first. A passkey signs in with Face ID, a fingerprint or the device PIN. There is no password and no email needed. Passkeys are on when `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGINS` are both set. Use the domain of the page players open, not the server's domain, when they differ.

An emailed code is the fallback. It is on when `RESEND_API_KEY` is set. A passkey player can add an email later, on the Account page, to sign in with a code and get receipts.

The health check lists `passkeys` and `email`. `accounts` is on when either one is.

A sign in lasts until it goes unused for 180 days. Every visit renews it, so a player who opens Aced now and then stays signed in. Logging out ends it on the server.

### Without an email key

A live server never shows sign in codes. Codes are only printed to the server log. The health check then reports email as off. With passkeys set up, players still get accounts. With neither, the app hides sign in and says there are no accounts here. Everything else keeps working on each device.

Development mode does show codes on screen. It is turned off whenever `NODE_ENV` is `production`. Do not run a public server in development mode. Anyone could sign in as anyone.

For real testers, set up Resend. Its free tier is enough.

### Aced Pro payments (optional)

1. In Stripe, create a product with a monthly and an annual price. Copy both price ids.
2. Add a webhook endpoint at `<APP_URL>/api/billing/webhook`. Send it `checkout.session.completed` and the `customer.subscription` events.
3. Set the 4 Stripe variables and redeploy.

The health check reports billing as on once all 4 are set. Use test mode keys until you are ready to charge.

### The AI coach (optional)

The coach answers questions about a player's own game. It uses Claude from Anthropic. Only signed in Aced Pro players can use it.

1. Create an API key at console.anthropic.com. Set a monthly spend limit there.
2. Set `ANTHROPIC_API_KEY` and redeploy. On Fly, use `fly secrets set ANTHROPIC_API_KEY=sk-ant-...`.
3. Open `/api/health`. It reports the coach as on.

Each player gets `COACH_DAILY_LIMIT` messages a day, counted on the server. The count resets at midnight in the player's time zone. A failed call does not count. The server never sends the key to the app.

The app sends a short summary with each question. It holds the Aced Rating, goals, game settings and recent misses. Nothing else from the device leaves it.

### Aced Pro for testing (optional)

Before purchases are open, you can give every signed in player Aced Pro. The AI coach and every other server check then treat them as Pro. Nobody is charged.

On Render:

1. Open the dashboard and pick the `felt` service.
2. Choose Environment, then Add Environment Variable.
3. Set the key to `PRO_FOR_EVERYONE` and the value to `true`.
4. Choose Save and deploy.
5. Open `<your address>/api/health`. It lists `proForEveryone` as `true`.

On Fly, run `fly secrets set PRO_FOR_EVERYONE=true`. To turn it off, set it to `false` or delete it, then redeploy.

Players see Aced Pro as on once they sign in. Guests stay on the free plan. To test Pro on one device without an account, use Settings, Testing, Unlock Aced Pro for testing. That switch only changes that device, so the coach still needs this variable or a real subscription.

Turn it off before you open purchases.

### Backups

All accounts, progress and leagues live in one SQLite file on the volume. Back it up.

Both hosts snapshot the volume once a day. Fly keeps 5 days by default. Find them with `fly volumes list`, then `fly volumes snapshots list <volume id>`. Render keeps 7 days. Restore one from the service's Disks page.

For a copy you keep yourself, the image includes `backup.cjs`. It writes a consistent copy while the server runs.

On Fly:

```bash
fly ssh console -C "node --no-warnings /app/backup.cjs"
fly ssh sftp get /data/felt-backup.sqlite
```

On Render, open the service's Shell tab and run `node --no-warnings /app/backup.cjs`. Then copy `/data/felt-backup.sqlite` off with scp. The Connect menu shows the SSH address.

To restore, stop the server. Replace `/data/felt.sqlite` with the backup. Delete `felt.sqlite-wal` and `felt.sqlite-shm` next to it. Start the server.

### Your own domain

Pick the domain before you invite players. Their browser data and reminders are tied to the address.

- On Fly, run `fly certs add felt.yourdomain.com`. Create the DNS records it prints.
- On Render, open Settings, then Custom Domains. Add the domain and create the CNAME record it shows.

HTTPS is issued automatically. Then set `APP_URL` to the new address and redeploy. On Fly it lives in `fly.toml`.

## Accounts on the GitHub Pages link

The copy at https://zacbarron.github.io/Felt/ is static. It can still have accounts, sync and passkeys: it talks to a Aced server deployed somewhere else.

1. Deploy the server with the Render blueprint (`render.yaml`) or on Fly (`fly.toml`), as above.
2. On the server, set these and redeploy.

   ```
   ALLOWED_ORIGINS=https://zacbarron.github.io
   WEBAUTHN_RP_ID=zacbarron.github.io
   WEBAUTHN_ORIGINS=https://zacbarron.github.io
   APP_URL=https://zacbarron.github.io/Felt
   ```

   `ALLOWED_ORIGINS` lets the Pages site call the API. `APP_URL` makes emails and Stripe links return to the Pages site. To keep passkeys working on the server's own address too, add it to `WEBAUTHN_ORIGINS`. A passkey belongs to one RP ID, so pick the address players will keep.
3. In GitHub, open the repo's Settings. Choose Secrets and variables, then Actions, then the Variables tab. Add a repository variable named `FELT_API_URL` with the server's address, such as `https://felt.onrender.com`. No trailing slash.
4. Open the Actions tab and re-run "Deploy to GitHub Pages". The build reads `FELT_API_URL` as `VITE_API_URL`.
5. Open the Pages link. "I have an account" now shows on the welcome screen. `<server>/api/health` should list `passkeys` as on.

The workflow defaults to the live server at https://felt-4g8a.onrender.com, so the variable is only needed to point at a different server.

Good to know:

- `github.io` is a shared domain. Passkeys for `zacbarron.github.io` work on every Pages site under that name. Only list origins you trust.
- The server never uses cookies. The app sends a bearer token, so CORS needs no credentials.

## 3. Deploy the app alone

Without the server, any static host works. Players get everything except accounts, sync, reminders, leagues and payments. The repo has ready configs for Vercel and Netlify. Build with `pnpm build` and publish `apps/web/dist`. Every route must load `index.html`, because the app uses routes such as `/learn`.

### Vercel

1. Sign in at vercel.com with GitHub. Choose Add New, then Project.
2. Import `ZacBarron/Felt`. Vercel reads `vercel.json`. Leave the root directory as the repo root.
3. Deploy. You get a `https://felt-xxxx.vercel.app` address.
4. Under Settings, Git, set the production branch, for example `main`. Every push to it redeploys. Every other branch and pull request gets its own preview URL. That is the easiest way to test a change on your phone.

### Netlify

Create a new site from Git and pick the repo. `netlify.toml` sets the build, Node 22, the route fallback and cache headers.

### Cloudflare Pages

Create a Pages project from the repo. Use the build command `pnpm install --frozen-lockfile && pnpm build` and the output directory `apps/web/dist`. Set the environment variable `NODE_VERSION=22`. Pages serves `index.html` for unknown routes on its own.

### Your own domain

Add the domain in the host's dashboard. Create the DNS record it shows. HTTPS is issued automatically.

## 4. Updates

The service worker updates itself. After a deploy, players get the new version the next time they open the app. The Aced server and the static configs keep `sw.js` and `index.html` uncached so updates are never stuck.

## 5. Keeping player data safe

Study data lives in the browser (IndexedDB) on each device. A deploy never touches it. A new domain starts empty. Players who sign in also keep a copy on the server, so it follows them to a new device.

- Aced asks the browser to keep its storage after onboarding and after signing up. Settings, Your data shows whether that was granted.
- Signed in players get every table and their settings back on a new device. Aced saves a few seconds after studying, when the app goes to the background, when the page closes and when the connection returns.
- Safari clears site data after about 7 days without a visit. Adding Aced to the home screen prevents this. Ask players to do it.
- Settings, Your data, Save a backup writes one file with everything. Restore from a backup brings it back on any device.
- Keep the same domain once players use the app. Data is tied to the address.

## 6. Still to do

- App Store and Play need a native shell around the web app. Capacitor is the usual choice. In app purchases there go through RevenueCat, not Stripe.
- Have the terms and privacy pages reviewed for your country before charging.
