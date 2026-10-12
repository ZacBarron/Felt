# Onboarding, retention and Felt Pro

How Felt turns a first open into a daily habit and a paid subscription, and why each piece is built the way it is. Code lives in `apps/web/src/pages/OnboardingPage.tsx`, `CheckPage.tsx` (placement and test outs), `ProPage.tsx` (paywall) and `state/access.ts` (plans, prices and gating).

## Principles

1. **Value before the ask.** The paywall appears after the player has a personal plan, never before.
2. **Every question earns its place.** Each onboarding answer changes something the player can see: the plan, the order of lessons, the stakes in examples.
3. **No dark patterns.** The price, the trial length and the charge date are on screen before any tap. Closing is one tap. No fake reviews, no fake countdowns, no fake discounts. Trust is the product for a player who cares about accuracy.

## Onboarding flow

| Screen | What it does | Why it works |
| --- | --- | --- |
| Welcome | Brand, one line promise | Sets the frame: serious training, minutes a day |
| Goal | Win live, move up, go pro, master GTO, tournaments | A stated goal raises follow through, and the goal is quoted back in the plan and on Today |
| Game | Live 1/3, live 2/5+, online, tournaments | Sets the game preset, so charts and money amounts match from the first screen |
| Experience | New to pro | Decides whether placement is recommended |
| Focus | What costs you money (multi select) | Moves those modules up the path; the player sees their own words reflected |
| Daily goal | 5, 10, 15 or 20 minutes, with the honest finish time for each | A specific, small, chosen target; the projection is computed from real lesson lengths |
| Find your level | Placement test or start from scratch | Nobody repeats what they know, and skipped lessons are instant progress |
| Plan | Daily target, lessons skipped, finish date, first three lessons, then hold to commit | A short build step, then a plan that is clearly theirs; holding to commit is a small deliberate act that makes the pledge real |
| Paywall | Felt Pro, personalized headline | Shown at peak intent, right after commitment |

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
- Next: reminder notifications at a chosen time, streak freeze, weekly summary.

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
2. Felt hero with a headline that uses the player's goal or the reason they arrived ("Unlock the lessons you need").
3. Five concrete benefits, each something the app does today, plus what is shipping next.
4. Two plan cards, yearly preselected with its saving.
5. Trial timeline with real dates: today, a reminder two days before the end, the charge date and amount.
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
