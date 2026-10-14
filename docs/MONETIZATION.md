# Onboarding, retention and Felt Pro

How Felt turns a first open into a daily habit and a paid subscription, and why each piece is built the way it is. Code lives in `apps/web/src/pages/OnboardingPage.tsx`, `CheckPage.tsx` (placement and test outs), `ProPage.tsx` (paywall) and `state/access.ts` (plans, prices and gating).

## Principles

1. **Value before the ask.** The paywall appears after the player has a personal plan, never before.
2. **Every question earns its place.** Each onboarding answer changes something the player can see: the plan, the order of lessons, the stakes in examples.
3. **No dark patterns.** The price, the trial length and the charge date are on screen before any tap. Closing is one tap. No fake reviews, no fake countdowns, no fake discounts. Trust is the product for a player who cares about accuracy.

## Onboarding flow

| Screen | What it does | Why it works |
| --- | --- | --- |
| Welcome | Two aces dealt on the felt, "From your first hand to Elite", the rating ladder climbing, and real counts of lessons, questions and charts. "I have an account" appears only when a server answers | Names the whole journey for a beginner and a regular alike. The proof is depth that can be checked, not claims |
| Level | New to pro, with a one line reply to the answer | Each answer is heard (the reply), and it decides basics first or placement |
| Target | Pick a tier to aim for: Solid, Regular, Expert or Elite, with what each means and its rating | A specific, hard goal beats "do your best" (Locke and Latham 2002); Elite is the cap because higher tiers could not be measured honestly |
| Goal | Win live, move up, go pro, master GTO, tournaments | The goal is quoted back in the plan and on Today |
| Game | Live 1/3, live 2/5+, online, tournaments | Sets the game preset, so the first hand and every chart match |
| Focus | What costs you money (multi select). Skipped for new players | Moves those modules up the path |
| First hand | New players pick the better of two starting hands; players get a real button open from their game, untimed, graded with its mix | Value before the ask. It is winnable on purpose: an early success is the strongest source of self efficacy (Bandura 1977). Letting people try before signing up is how Duolingo onboards (secondary reports of a large lift) |
| Why it works | Sources on every answer, recall over rereading (61% vs 40% a week later), a rating built on Elo and Glicko | Real, cited reasons in place of invented social proof |
| Daily goal | 5, 10, 15 or 20 minutes | A specific, small, chosen target |
| Study cue | When they will study | Implementation intention (Gollwitzer 1999) |
| Find where you start | Placement or start from the basics. Skipped for new players | Nobody repeats what they know |
| Plan | Pledge, the climb to their target, and the first week starting with a done "Set up your plan" row, then hold to commit | The labor of building is shown (Buell and Norton 2011). A step already done is honest endowed progress (Nunes and Drèze 2006) |
| Day 1 | A short moment: "Your plan is set" | Marks the commitment the player just made |
| Paywall | Felt Pro, personalized headline | Shown at peak intent, right after commitment |

New players always start with the basics, whatever their goals; so does a casual player who skips placement (`pathPrefs` in `state/goals.ts`).

**Social proof.** Felt shows only proof that is true: counts read from the content, cited research and, once real players give them, quotes in `TESTIMONIALS` (`packages/content/src/onboarding.ts`). Social proof persuades most when it describes people like the reader (Goldstein, Cialdini and Griskevicius 2008), and invented numbers or reviews would break the trust the product depends on. The section stays hidden while the list is empty.

The progress bar at the top of every step keeps the end in sight.

## Placement and test outs

Logic in `packages/core/src/placement.ts` (unit tested); questions come from the lessons themselves.

- **Placement** walks the core path in teaching order (math, opens, facing opens, ranges, textures, c-betting, defending, turn and river, river play, exploits). Each module asks one question from up to three of its lessons. Clearing a module (75% or better) marks all its lessons known and moves on. The first module below the bar is where the player starts; lessons answered correctly there are still marked known.
- **Module test out** (the "Test out" button on every module in Learn) asks two questions per lesson: the last quiz, which checks the main idea, and the first. A lesson is skipped only if every one of its questions is right. Any miss puts that lesson back in the path in full: the short version expands into the real lesson exactly where the player has a gap.
- Every lesson must have at least two quiz steps; the content tests enforce it.

Skipped lessons show as "Skipped" and count as complete. The plan and Today both show how many minutes were saved.

## Retention loop

- **Daily goal ring** on Today, measured from real review time and finished lessons.
- **Next lesson** on Today and Learn follows the player's path: the lesson in progress, then the placement module, then focus areas, then curriculum order.
- **Streaks** from review days (already in place).
- **Saves** turn curiosity into memory: anything bookmarked joins the review deck, ahead of the new card limit, so the things a player cared about come back on schedule.
- Shipped: streak freezes (one to start, one earned every seven days), calendar reminders for the study time and the trial end, and a local event log.
- Next: push reminders at a chosen time and a weekly summary.

## Felt Pro

| | Free | Pro |
| --- | --- | --- |
| Lessons | First module of every track (about a quarter of the library) | All lessons |
| Placement and test outs | Yes, for every module | Yes |
| Spaced review and drills | Yes | Yes |
| Solver | Example spots | Any board, range, pot and stack |

Free gives a real taste of every track. The natural upgrade moments are: the end of onboarding, a locked lesson in the path, and a test out result whose gaps are in Pro modules ("Unlock these 2 lessons").

### Prices

Set in `PLANS` in `state/access.ts`. Current placeholders: yearly $79.99 with a 7 day free trial, monthly $14.99 without a trial. The yearly plan is preselected and shows its saving against monthly, computed rather than typed.

### Paywall layout

1. Close button, always visible.
2. Felt hero with a headline that names why the player arrived ("Add every lesson to your plan", "This lesson is part of Felt Pro", "Solve your own spots").
3. Two plan cards, yearly preselected with its saving, so the price is on screen before any benefit.
4. Only what Pro adds (more lessons, solving your own spots, what is added later), then a line listing what stays free.
5. Trial timeline with real dates: today, two days before the end (with a calendar reminder offered once the trial starts), the charge date and amount. The bottom bar repeats the price and charge date next to the button, and declining sits in the same bar.
6. Fine print: price, renewal, how to cancel, restore purchases, terms, privacy.
7. One primary button in the thumb zone.

### Connecting payments

`purchase()` and `restorePurchases()` in `state/access.ts` are the only seams. To go live, wire them to a store SDK (for example RevenueCat for App Store and Play, or Stripe Checkout on the web) and set `access.pro`, `plan` and `trialEndsAt` from the store's entitlement. Until then, release builds say purchases are not open yet.

### Developer switch

In Settings, tap the version number seven times to show the Developer section (always shown in dev builds). It has:

- **Developer mode**: purchases complete locally, so the whole flow can be tested.
- **Pro unlocked**: forces Pro on or off regardless of purchases.
- **Clear purchase**, **Replay onboarding** and **Clear lesson progress**.

## Metrics to watch once live

Onboarding completion by step, placement start and finish rate, lessons skipped per placement, paywall view to trial, trial to paid, day 1, 7 and 30 retention, share of days the daily goal is met.
