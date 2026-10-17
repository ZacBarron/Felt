# Product analytics

How Aced measures what helps players, without tracking them. The site and the app send short, anonymous usage events to Aced's own server. The owner reads them in the operations console (see [ADMIN.md](ADMIN.md)).

Code: the event dictionary and every shared rule are in `packages/core/src/analytics.ts`. The browser queue is in `apps/web/src/analytics/` and is shared by the app (`apps/web/src/state/events.ts`) and the site (`apps/site/src/analytics.ts`). The server side is `apps/server/src/analytics.ts`, with the dashboard queries in `apps/server/src/admin/metrics.ts`.

## Privacy rules

These are rules, not goals. Tests check each one.

- **No cookies and no third parties.** No analytics SDK and no script from another site. Events go to `POST /api/events` on Aced's own server.
- **Anonymous.** A random install id is made on the device (`felt.anon.v1` in localStorage) and replaced after 13 months. A visit id lives in sessionStorage and ends after 30 idle minutes.
- **Nothing personal in an event.** Property values are short tags (letters, digits and `_ . : / , # + -`, at most 80 characters), numbers or booleans. A tag cannot hold a space or an `@`, so a sentence, a name or an email address never fits. Unknown events and unknown properties are dropped by the server.
- **Never sent:** emails, names, text the player typed, cards and hands, IP addresses, user agents and precise location. Errors are sent as a hash of the message, never its text or stack.
- **Coarse device fields, worked out on the device.** Platform (`ios`, `android` or `desktop`), in-app browser (yes or no) and installed app (yes or no). The time zone offset in minutes, so days count in the player's own time. Country is not collected.
- **The server stores no IP address and no user agent.** The address is used only in memory, for the rate limit.
- **Off means off.** Global Privacy Control or Do Not Track: no events, no install id, and A/B tests show today's page. The Settings switch "Share anonymous usage" (Settings, Your data) is on by default. Turning it off deletes the queue and the install id, and asks the server to delete everything that install sent (`POST /api/events/forget`).
- **Retention.** Raw events, and installs not seen since, are deleted after 13 months by a daily job. An account keeps a copy of its first touch (the link that brought it), so revenue can still be traced to its source.
- **Accounts.** When a player makes an account or signs in, the app links its install id to the account (`POST /api/events/link`). Deleting the account removes the link. Its events stay as anonymous counts.
- **No selling.** Usage data never leaves Aced's server.

The privacy page in the app (`apps/web/src/pages/LegalPage.tsx`) says all of this in plain words. Change it whenever these rules change.

## How events travel

1. Code calls `track(name, props)`. It is typed against `EVENTS`, so a wrong name or property does not compile.
2. The queue keeps events in localStorage (`felt.analytics.queue.v1`, at most 200) and sends a batch of up to 50 after 4 seconds.
3. Batches go as `text/plain` with `fetch` in `no-cors` mode, so there is no preflight and no cookie. When the page hides, everything left goes with `navigator.sendBeacon`.
4. A failed batch is tried again with the same batch id, backing off, then dropped after 3 tries. The server keeps one copy of a batch id seen twice.
5. The server checks the batch (`parseBatch`), rate limits it (30 batches a minute and 1,200 events in 10 minutes per install, and 120 batches a minute per address in memory), stores the events and updates the rollups in one transaction.

Measurement never blocks the page and never throws. Device clocks off by more than 7 days (or 10 minutes ahead) are replaced with the server's time.

The batch:

```json
{ "v": 1, "install": "22 chars", "session": "22 chars", "batch": "22 chars", "app": "site",
  "ctx": { "platform": "ios", "in_app": true, "standalone": false, "tzo": -240 },
  "attr": { "utm_source": "mike", "loc": "bellagio", "landing": "/", "referrer": "instagram.com" },
  "events": [{ "name": "cta_click", "at": 1792252800000, "props": { "cta": "start_free", "pos": "hero" } }] }
```

### Tables

| Table | What it holds |
| --- | --- |
| `events` | Every raw event: time, local day, name, surface, install, visit, platform, flags, props as JSON. Indexed by (name, day), day and (install, time) |
| `installs` | One row per install: first and last day, first visit, first surface, device fields, first touch tags and source, the linked account |
| `install_days` | One row per install and local day with any event. Daily and weekly actives and retention read this |
| `milestones` | The first time each install reached each funnel step, with the visit it happened in |
| `exposures` | The first variant each install saw in each A/B test |
| `users.first_*` | The account's first touch, copied when an install is linked. Kept while the account exists |
| `users.revenue_cents` | Money received from the account so far, from Stripe's amounts, minus refunds |

## Event dictionary

Every property is optional. `s` is a tag, `n` a number and `b` a boolean. The surface is where the event may come from: the server refuses an event from the wrong surface, and refuses every server event from a browser.

### Both surfaces

| Event | Properties | When |
| --- | --- | --- |
| `experiment_exposed` | exp s, variant s | The first time an install sees a test's variant. Logged once per install and test |
| `web_vital` | metric s (LCP, CLS, INP), value n, rating s, path s | Once per sampled page load (25% by default, `analytics.vitals_sample`), when the page first hides. INP is the slowest interaction seen |
| `error` | kind s (error, rejection), name s, hash s, route s | An unhandled error or promise rejection. At most 10 a page. `hash` is `hashMessage(message)` |

### Site

| Event | Properties | When |
| --- | --- | --- |
| `page_view` | utm_source, utm_medium, utm_campaign, utm_content, src, loc, ref, path, referrer, platform s; in_app b; variant s | Every page load. Tags come from the link, else the stored first touch. `referrer` is a host only. `variant` lists the tests this visitor is in |
| `section_view` | section s | A section is a third in view, once each |
| `cta_click` | cta s, pos s, variant s | Any element with `data-cta`. `pos` is its `data-pos` (hero, nav, sticky, move, pricing, final, footer, voices, apps, how, sticker) |
| `nav_click` | target s | A header link to a section |
| `sticky_shown` | variant s | The phone sticky bar shows for the first time |
| `open_demo_used` | size n, limpers n | The open size demo, once, with the size chosen |
| `move_answered` | hand s, choice s, verdict s | The "Your move" spot is answered |
| `move_next` | | Try another hand |
| `seat_tab` | seat s | A seat is tapped in "Your seat changes everything" |
| `story_step` | step s | A story step comes into view, once each |
| `compare_scrolled` | | The comparison table is swiped, once |
| `faq_opened` | q n | An FAQ answer is opened. `q` is its position from 0 |
| `video_played` | clip s | A clip plays for the first time |
| `waitlist_submit` | list s, result s (ok, invalid, rate_limited, error, offline) | A notify or founding form is sent |
| `founding_status_seen` | open b, left n | The founding card comes into view |
| `inapp_hint_shown` | platform s | The "open in Safari" hint shows |
| `platform_link_click` | platform s | The iPhone and Android line in the hero |

### App: opening and habit

| Event | Properties | When |
| --- | --- | --- |
| `app_open` | standalone b, path s, via s (push, email, share, site, link, direct), returning b | Every load of the app. `returning` means the install id existed before |
| `daily_active` | standalone b | Once per local day the app is open, also when a phone keeps it open for days |
| `notification_opened` | channel s (push, email), kind s | The app opened from a link with `?n=channel.kind`. Push and email links carry it |
| `install_prompt_shown` | kind s (native, ios_help) | The home screen card shows |
| `install_prompt_result` | outcome s (accepted, dismissed, installed, dismissed_card) | The player answers it |
| `push_permission_asked` | from s (reminders, trial) | The browser's permission prompt opens |
| `push_permission_result` | result s (granted, denied, default), from s | The player answers it |
| `reminder_added` | kind s, cue s, from s, via s | A study or trial reminder is added |
| `study_cue_set` | cue s, from s | The player picks when to study |
| `moment_shown` | kind s, tier s, days n | A tier or streak moment shows |
| `moment_share_tapped` | tier s | Share from a moment |
| `share_tapped` | what s, via s | The share sheet opens |
| `card_shared` | kind s, design s, via s | A share card is shared or saved |

### App: onboarding and placement

| Event | Properties | When |
| --- | --- | --- |
| `onboarding_started` | | Get started on the welcome screen |
| `onboarding_step_viewed` | step s, index n | Each onboarding screen |
| `onboarding_step_answered` | step s, value s | Each answer. Values are choice ids or counts, never text |
| `plan_committed` | goals s, daily n, focus n | The plan is accepted |
| `onboarding_completed` | experience s, placed s | Onboarding ends. A funnel step |
| `placement_started` | from s, experience s | The placement quiz starts |
| `placement_completed` | right n, asked n, skipped n, placedAt s | It ends |
| `check_started` | module s, lesson s | A skip ahead quiz starts |
| `check_finished` | module s, right n, asked n, passed n | It ends |

### App: study

| Event | Properties | When |
| --- | --- | --- |
| `lesson_started` | lesson s, track s, resumed b | A lesson opens |
| `lesson_finished` | lesson s, track s, correct n, total n | A lesson ends. A funnel step |
| `first_lesson_done` | correct n, total n | The first lesson's celebration |
| `answer_graded` | source s (lesson, review, check, daily, weekly, play), domain s, correct b, score n, lesson s | Every objective graded answer, the same ones that move the Aced Rating. Covers lesson questions, drills, review cards and play. Never the question or the answer. A funnel step |
| `review_started` | cards n | A review session starts |
| `review_finished` | cards n, right n | It ends |
| `drill_started` | chart s, kind s (quick, paint) | A chart drill opens in Ranges |
| `practice_started` | domain s | Practice starts |
| `practice_finished` | right n, total n | It ends |
| `daily_started` | number n | The daily challenge starts |
| `daily_finished` | number n, right n | It ends, with the score out of 5 |
| `weekly_locked_viewed` | week s | A free player opens the weekly Pro challenge |
| `weekly_started` | week s | It starts |
| `weekly_finished` | week s, right n, accuracy n | It ends |
| `scenario_started` | id s | A scenario starts |
| `scenario_graded` | id s, grade s | It is graded |

### App: play

| Event | Properties | When |
| --- | --- | --- |
| `table_sat` | table s, custom b, seats n | The player sits down. Custom tables report `custom` |
| `hand_dealt` | table s, skipped n, speed s | Each hand dealt. `skipped` counts clear folds folded for the player, `speed` includes instant |
| `decision_graded` | tier s, grade s, street s | Each graded decision in a hand |
| `play_setting_changed` | setting s, value s | Bot speed, after fold, skip clear folds or grades |
| `table_left` | hands n | The player leaves |
| `custom_table_created` | seats n, edited b | A custom table is saved |

### App: tools

| Event | Properties | When |
| --- | --- | --- |
| `ranges_viewed` | spot s, seats n | A chart opens in Ranges, by spot type |
| `solver_run` | kind s (example, custom), street s, exploitability n, ms n | A solve finishes. Exploitability is reported with every solver result |
| `coach_opened` | from s, pro b | The coach page opens |
| `coach_asked` | turn n | A question is sent. Never its text |
| `coach_answered` | ok b, refused b | The answer arrives or fails |

### App: accounts

| Event | Properties | When |
| --- | --- | --- |
| `account_prompt_viewed` | from s, passkeys b, email b | Keep your progress shows |
| `account_skipped` | from s | It is skipped |
| `create_account_tapped` | loggedOut s | Make an account is tapped |
| `signin_code_sent` | | An email code is sent |
| `account_created` | method s (passkey, email) | A new account. A funnel step. The install is linked right after |
| `signed_in` | method s | An existing account signs in |
| `logged_out` | removeLocal b | Log out |
| `sync_conflict_resolved` | choice s | Both copies had progress and the player chose |

### App: Aced Pro

| Event | Properties | When |
| --- | --- | --- |
| `paywall_viewed` | from s | The Pro screen opens. `from` is why (onboarding, first-lesson, locked-lesson, coach, settings, site and more) |
| `paywall_dismissed` | from s | It is closed |
| `plan_selected` | plan s, from s | Another plan tile is picked |
| `paywall_cta_tapped` | from s, plan s, remind b | The buy button is tapped |
| `checkout_started` | plan s (annual, monthly, founding), from s | The app leaves for Stripe Checkout |
| `checkout_returned` | result s (success, cancel), plan s | Back from Stripe |
| `purchase_result` | plan s, ok b, reason s | A purchase that did not leave for Stripe: done in developer mode, or failed (`needs_account`, `failed`) |
| `restore_tapped` | result s | Restore purchases, with what it found |
| `manage_opened` | status s, plan s | Manage Pro opens |
| `cancel_started` | plan s | Cancel Pro opens |
| `cancel_reason_picked` | reason s | A reason chip is picked |
| `cancel_offer_shown` | offer s, reason s | The one offer for that reason shows |
| `cancel_offer_taken` | offer s, reason s | It is taken |
| `cancel_confirmed` | reason s, offer s | Cancel is confirmed |
| `cancel_undone` | | Keep Aced Pro after cancelling |
| `billing_banner_shown` | where s (today, settings, account) | The payment problem banner shows |
| `billing_banner_tapped` | where s | Update payment is tapped |

### Server

Only the server knows these, so only the server records them. They are counted under the account's linked install when there is one, so they join the funnel. Without one they are anonymous counts. The app never sends money events, so nothing is counted twice: the app's `checkout_started` is intent, the server's `subscription_started` is the fact.

| Event | Properties | Recorded by |
| --- | --- | --- |
| `subscription_started` | plan s, trial b | Webhook `customer.subscription.created` |
| `first_payment` | plan s, after_trial b, amount n | Webhook `invoice.paid` with an amount, the account's first |
| `subscription_renewed` | plan s, amount n | Webhook `invoice.paid` with an amount, every later one |
| `subscription_cancelled` | plan s, reason s, offer s | The cancel flow (`POST /api/billing/cancel`) or a console action (`reason` staff). Not the webhook |
| `retention_offer_taken` | offer s, reason s | The cancel flow, when the offer is taken |
| `subscription_paused` | months n | The cancel flow or the console |
| `subscription_resumed` | from s (pause, cancel) | `POST /api/billing/resume` or the console |
| `subscription_ended` | plan s | Webhook, when a live subscription stops being live |
| `payment_failed` | plan s | Webhook `invoice.payment_failed`, once per episode (Stripe's retries do not count again) |
| `payment_recovered` | plan s | Webhook `invoice.paid` while a payment problem is open |
| `refund` | amount n | Webhook `charge.refunded`, including refunds made from the console |
| `founding_seat_sold` | amount n | Webhook `checkout.session.completed` for a founding purchase |
| `email_sent` | kind s | The lifecycle email job, per email sent |
| `email_unsubscribed` | via s (link, header, staff) | The one tap unsubscribe or a console action |
| `push_sent` | kind s (reminder, closing, trial-ending) | The push jobs, per player reached |

## Funnels and milestones

Each install reaches each step at most once (`milestones`). The first event that marks a step sets it.

| Step | Marked by |
| --- | --- |
| Site visit | `page_view` |
| CTA click | `cta_click` |
| App open | `app_open` |
| Onboarding done | `onboarding_completed` |
| Activated | `answer_graded` in the install's first visit (see below) |
| First lesson done | `lesson_finished` |
| Account made | `account_created` |
| Trial or founding | `subscription_started` or `founding_seat_sold` |
| Paid | `first_payment` or `founding_seat_sold` |

Two cohorts are shown. The site funnel counts new installs that arrived on the site. All installs adds players who went straight to the app. Each step shows its share of the cohort and of the step before.

## Metric definitions

- **Active install (daily).** An install with any event on that local day. Weekly is any event from Monday to Sunday.
- **New install.** An install on its first local day.
- **Activation.** The share of new installs that answered a graded decision in their first visit. A visit ends after 30 idle minutes, and the site and the app share it on acedpoker.app. This is the metric that matters most (UX review, section 2.6). Click through is a vanity number when the button leads to a long flow.
- **Day N retention.** Among installs whose first day is at least N days ago, the share with any event exactly N days after their first day, in their own time. Shown for days 1, 7 and 30, by week of first visit and by first touch source. A cohort too new for a day shows a dot.
- **Source.** One per install: the creator tag (`utm_source`), else `src`, else `ref`, else the referring site, else direct. Creator is `utm_source` alone. Card room is `loc`.
- **Conversion by source.** New installs from each source and the share that reached each later step.
- **Paywall conversion.** Installs that viewed the paywall from a place and later started a trial or founding.
- **MRR.** Arithmetic: live paying plans (not trialing, not paused) at list price, yearly divided by 12. Coupons are not taken off, and the console says so. ARR is MRR times 12.
- **Money received.** Stripe's own amounts from first payments, renewals and founding places. Refunds are shown apart.
- **Churn.** Subscriptions that ended in the range over those live at its start. The start is our estimate: today's live plans, plus those that ended since, minus those that started since.
- **LTV by first touch.** Money received from accounts with that first touch, per account, so far. Accounts with sharing off show as unknown.
- **Web vitals.** The 75th percentile per metric and surface, the number Google reports. Good is LCP 2,500 ms, CLS 0.1 and INP 200 ms or less.

Engagement metrics reward demonstrated skill and returns, never time spent (see ENGAGEMENT.md).

## A/B tests

The site buckets visitors with an inline script in the head of `apps/site/index.html`, before first paint, so nothing flickers. The tests are listed in `EXPERIMENTS` in `packages/core/src/analytics.ts`. A test in `apps/site/test/ab.test.ts` runs the inline script and checks it buckets exactly like `assign()` in core.

- **Stable.** The bucket is an FNV-1a hash of the test id and the install id, so a visitor sees the same variant every time.
- **Weights.** Each variant has a weight. 1 and 1 split evenly.
- **Exposure.** `experiment_exposed` is logged once per install and test, at the moment the variant matters: on arrival for the hero test, and when the sticky bar would show for the sticky bar test (both arms, so the arms compare fairly).
- **Today's page by default.** The first variant is always the control. Everyone gets it when analytics is off (GPC, Do Not Track or the switch), when the last send to the server failed, or when the console turns the test off (`exp.<id>` flags, read from the cached `/api/config`). Phone only tests give desktop the control.
- **Markup.** Both versions of a CTA are in the HTML. `data-ab-hero-cta` on `<html>` hides one with CSS. Without the script, today's page shows.

Running tests (UX review, section 2.7):

| Test | Control | Variant | Main metric | Guardrail |
| --- | --- | --- | --- | --- |
| `hero_cta` | Start training free first | Play today's challenge first, also in the sticky bar | Activation, then day 1 return | Free starts |
| `sticky_bar` (phones) | Sticky bar on | Sticky bar off | App open rate | Pricing section views |

Run at most 2 at once, each for at least 2 full weeks. With early traffic, a lift from 10% to 13% needs about 1,800 visitors per arm. The console shows each arm's exposed installs and the steps they reached after exposure.

To add a test: add it to `EXPERIMENTS` (control first), add the same entry to the `tests` list in the inline script, add a flag `exp.<id>` in `apps/server/src/flags.ts`, put both versions in the HTML with `ab-` classes and CSS, and call `exposed('<id>')` where the variant matters.

## How to add an event

1. Add it to `EVENTS` in `packages/core/src/analytics.ts` with its surface and properties. Keep property values to ids, counts and yes or no. Never free text.
2. Call `track('name', { ... })` in the app (`state/events.ts`) or the site (`src/analytics.ts`). TypeScript checks the name and the properties.
3. If it marks a funnel step, add it to `MILESTONE_OF`.
4. Add it to the dictionary above. A test fails when an event is missing here.
5. If the console should show it, add a query in `apps/server/src/admin/metrics.ts` that uses the (name, day) index, and a test with fixture data.

Server events are recorded with `serverEvent()` in `apps/server/src/analytics.ts`. Record each fact in one place only.

## Legal notes for the owner

Aced is run by a Canadian sole proprietor. These are points to check with someone qualified, not legal advice.

- **PIPEDA.** Anonymous usage counts with a clear notice and an easy opt out are usually acceptable as implied consent. Linking an install to an account makes those events personal information, so the privacy page says so and account deletion removes the link.
- **Quebec Law 25.** It asks that technology that can profile a person be off by default, with the person informed first. Aced's switch is on by default. Consider turning it off by default for players in Quebec, or getting advice on whether anonymous product counts fall under that rule.
- **EU and UK visitors.** Storing an install id on a device usually needs consent under the ePrivacy rules, unless the measurement is strictly limited. France's CNIL exempts audience measurement only when it is not combined with other data, and linking to accounts and revenue goes beyond that. Before marketing in the EU or UK, add a consent step for those visitors or turn off the account link for them.
- **California and other US states.** Aced honors Global Privacy Control and sells no data, which covers the main asks of the CCPA and similar laws.
- **Staff access.** The console logs every look at a player and every change. Keep named admins to the people who need them.
- **Retention.** 13 months for raw events, and the life of the account for first touch and revenue per account. Write down why, in case a player asks.
