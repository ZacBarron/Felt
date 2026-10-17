# The operations console

Everything needed to run Aced day to day, at `/admin` on the server: dashboards, players, support actions, feature flags, lifecycle programs, health and the audit log. It is plain server rendered HTML with hand drawn charts, no libraries and nothing loaded from another site. It works on a phone.

Code: routes in `apps/server/src/admin.ts`, sign in and roles in `admin/auth.ts`, player actions in `admin/actions.ts`, queries in `admin/metrics.ts`, charts in `admin/charts.ts`, page layout in `admin/html.ts`, flags in `flags.ts`, the audit log and job health in `ops.ts`. Tests: `apps/server/test/admin.test.ts` and `apps/server/test/analytics.test.ts`. The events behind the numbers are in [ANALYTICS.md](ANALYTICS.md).

## Signing in

- **Owner.** Set `ADMIN_TOKEN` on the server (at least 16 random characters; see DEPLOY.md). Without it every console address answers 404.
- **Browser.** Open `/admin`, paste the token once. The console sets a signed cookie that lasts 12 hours. It is HttpOnly, SameSite Strict, Secure in production, and limited to the `/admin` path. The token itself is never stored in the cookie. Changing `ADMIN_TOKEN` signs every browser out.
- **Scripts.** Send `Authorization: Bearer <token>` or `X-Admin-Token: <token>`. `GET /api/admin/metrics` returns every dashboard number as JSON, with the same filters as the pages (`from`, `to` or `days`, `source`, `platform`, `in_app`).
- **Forms.** Every form signed in by cookie carries a form token tied to the session, so another site cannot post as you.
- **Guessing.** 10 wrong tokens from one address in 15 minutes locks that address out for the rest of the window.
- **Pages.** No caching, no framing, and a content policy that allows only the page's own style and script.

### Named admins and roles

The owner adds people in Access. Each gets their own token, shown once and stored only as a hash, so the audit log names who did what. An admin can be turned off at any time.

| Role | Can |
| --- | --- |
| owner | Everything: actions on players, flags, programs, test sends, exports with personal data, and Access |
| support | Read every page and add staff notes. No actions, flags or personal data exports |

## The audit log

Every sign in, every look at a player, every action, note, flag change, test send, admin change and personal data export writes one row: when, who, their role, what, on whom, why, and the state before and after. The Audit log page lists them newest first and exports them as CSV. Each player's page shows their own entries.

## Filters

Every dashboard has one row of filters at the top: Today, 7, 30 or 90 days, a custom range, source, device (iPhone, Android, computer) and in-app browser. They apply to every chart and table on the page. Days are the player's own days.

## Screens

### Overview

Tiles for active installs today and this week, new installs, activation, MRR, paying plans and founding places left. Then a line chart of active and new installs by day, the site funnel, money received by week and the retention heatmap.

### Growth

- Weekly active installs, as columns.
- The site funnel and the all installs funnel, as bars with the share of the cohort and the drop from the step before.
- Retention by week of first visit and by first touch source, as heatmaps (day 1, 7 and 30).
- Conversion by source as bars, then full tables by source, by creator (`utm_source`) and by card room (`loc`), from install to paid.

### Product

- Feature use: installs that used lessons, review, play, ranges, the daily and weekly challenges, practice, the solver and the coach.
- The paywall by where it opened, with checkouts and the share that went on to a trial or founding.
- A/B tests: each arm's exposed installs, CTA clicks, app opens, activation, day 1 return and paid.
- Cancel reasons with offer take rates, and billing recovery (failed, recovered, banner shown and tapped).
- Web vitals at the 75th percentile by surface, labelled Good, Needs work or Poor.
- Errors in the browser by day, and the top error codes with their type and route. A code is `hashMessage()` of the message; hash a message you see in development to match it.
- Every event name with its count.

### Revenue

MRR, ARR, yearly and monthly plans, trials, founding places sold, comped, held and left, money received, refunds, churn, failed payments and recoveries, cancelling, paused and past due. Money received by week as columns. Lifetime value by first touch source as bars and a table.

MRR uses list prices from `LIST_PRICES` in `admin/metrics.ts`, so coupons are not taken off. Keep it in step with `PLANS` in `apps/web/src/state/access.ts`. Money received uses Stripe's own amounts. Churn's starting count is an estimate, and the page says so.

### Players

Search by email, id, display name or Stripe customer id. Without a search, the newest 25 accounts. The owner can download every account as CSV.

A player's page shows:

- **Profile:** id, email, name, time zone, last visit, marketing email consent, holdout, first touch and money received so far.
- **Plan:** status, plan, Stripe's status, paid through, granted Pro, cancelling, paused, payment problems, comp reason and a link to the Stripe customer.
- **Devices and sync:** sessions, passkeys, push devices (by push service, never the address), reminder time, the sync copy's version, size and date, and linked installs.
- **Rating and progress:** graded answers, the share right, the Aced Rating at the last answer (about), and daily challenges.
- **Emails and pushes** sent, newest first. **Cancel feedback** with any note the player wrote.
- **Recent events** from the player's linked installs.
- **Staff notes.** Anyone signed in can add one. Notes are deleted with the account.
- **Actions** and the player's audit log.

Opening a player's page is logged.

### Actions

Each action opens on tap, asks for a reason and a confirm box, asks the browser to confirm again, and writes an audit row with the account's state before and after. Money moves only through Stripe with the server's existing Stripe client. The console never sees card details.

| Action | What it does |
| --- | --- |
| Grant Pro | Free Pro for 1 to 3650 days, on top of anything paid (`bonus_until`) |
| Revoke granted Pro | Ends Pro given by staff or invites, and a comped founding place. Paid Pro is cancelled or refunded instead |
| Extend the trial | Moves the trial end in Stripe by 1 to 60 days |
| Comp a founding place | Pro for as long as Aced runs, no charge. Takes one of the seats. A running subscription is set to end at its period end |
| Refund the last payment | Refunds the latest charge in Stripe, ends a running subscription at once and removes Pro now. A refunded founding place gives its seat back. The webhook records the refund |
| Cancel at period end | The same as the player's own cancel. Pro stays on to the end of what was paid |
| Resume the subscription | Undoes a cancel or ends a pause |
| Pause the subscription | Pauses billing for 1 or 2 months after the paid period |
| Resend the last receipt | Stripe emails the receipt for the latest charge again |
| Email a sign in code | A fresh 6 digit code, good for 10 minutes |
| Unsubscribe from marketing | Turns off tips and news email. Account email still goes |
| Reset push | Removes every push device and turns reminders off |
| Sign out everywhere | Ends every session |
| Export their data | Everything stored about the player as JSON, for a privacy request: the account, progress from the sync copy, answers, daily results, leagues, emails and pushes sent, cancel feedback, notes and linked usage events. Secrets such as key material and token hashes are left out |
| Delete the player | Asks for the id or email again, then deletes the account and everything stored with it. Linked usage events stay as anonymous counts. Billing in Stripe is not touched, so cancel or refund first |

### Flags

Every flag with its value, default, note and last change, grouped. The owner changes one with a reason, or resets it to its default. Changes apply at once and are logged with before and after. Public flags reach browsers through `GET /api/config` (cached for 60 seconds). The site and the app keep the last copy in localStorage (`felt.config.v1`) and use their own defaults when the server cannot be reached, so a server outage never changes what players see.

| Flag | Kind | Default | Public | What it does |
| --- | --- | --- | --- | --- |
| `analytics.enabled` | on or off | on | yes | Collect usage events. Off stops the site and app from sending, and the server drops what still arrives |
| `analytics.vitals_sample` | number 0 to 1 | 0.25 | yes | Share of page loads that report web vitals |
| `exp.hero_cta` | on or off | on | yes | Run the hero test. Off shows everyone the control |
| `exp.sticky_bar` | on or off | on | yes | Run the sticky bar test |
| `coach.enabled` | on or off | on | no | Kill switch for the AI coach |
| `coach.rollout` | percent | 100 | no | Share of accounts that get the coach, by account id |
| `coach.daily_limit` | number | `COACH_DAILY_LIMIT` | no | Coach messages a player can send a day |
| `founding.open` | on or off | on | yes | Founding checkout open. Off shows the waitlist |
| `founding.seats` | number | 500 | yes | The founding cap |
| `push.enabled` | on or off | on | no | Send pushes at all |
| `email.enabled` | on or off | on | no | Send lifecycle email at all. Sign in codes always go |
| `push.day_cap`, `push.week_cap` | number | 1, 4 | no | The push caps (ENGAGEMENT.md) |
| `lifecycle.holdout` | number 0 to 1 | `LIFECYCLE_HOLDOUT` | no | Share of new accounts in the holdout |
| `program.<id>` | on or off | on | no | Pause or resume one lifecycle program |
| `site.notice` | text | empty | yes | One short line under the site header |

A percent flag is on for an id when the id's hash falls under the percent, so each account gets the same answer every time. To add a flag, add it to `flagDefs()` in `apps/server/src/flags.ts`, read it with `flags.bool`, `flags.num` or `flags.on`, and add it to this table. Prices are not flags: they must match Stripe and `PLANS` in `access.ts`, so changing them is a deploy.

### Lifecycle

- **Switches:** email and push on or off, the push caps, whether marketing email can send (it needs `MAIL_POSTAL_ADDRESS`) and unsubscribes in the last 30 days.
- **Programs:** trial ending (email and push), payment failed (first and second email), weekly recap, win back news, win back offer, the daily study reminder and the closing note. For each, its state, sent in the last 7 and 30 days, opened in the last 30 days, a preview with sample numbers, and Pause or Resume (with a reason). A paused program sends nothing and records nothing as sent, so it picks up cleanly when resumed. The sunset (no marketing email after 90 days without a visit) and the caps are rules, not programs. Their effect shows in the suppression lists.
- **Opened** counts app opens from the message's link (`?n=email.<kind>` or `?n=push.<kind>`). Email opens are not tracked, since mail apps preload images.
- **Send a test** of any email program to any address, with sample numbers and a subject starting with [Test].
- **Holdout:** the share for new accounts (editable) and how many accounts are in it.
- **Suppression lists:** unsubscribed, holdout, sunset and never opted in, with CSV downloads.

### Operations

Uptime, database size, server errors in the last hour and day, browser errors in the last day and the last Stripe webhook. Services: email (Resend), push, Stripe (and test mode), the coach, analytics and Pro for everyone. Scheduled jobs (reminders, trial notices, lifecycle email, pause resumes, analytics retention and webhook deliveries) with the last run, last success, runs, failures and the last error. Waitlists (iPhone, Android and founding members) with counts and CSV downloads. Row counts of the main tables.

### Exports

Table views have a Download CSV button: users, waitlists, suppression lists, the audit log, the funnel, sources, retention, A/B tests and event counts. Values that start like a spreadsheet formula get a leading apostrophe. Exports with personal data need the owner role and are logged.

### Access

Owner only. The list of admins with their role, who added them and when they were last seen. Add an admin (name, role and a reason) to get their token once. Turn one off with a reason.
