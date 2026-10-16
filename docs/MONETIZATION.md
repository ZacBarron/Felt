# Onboarding, retention and Felt Pro

How Felt turns a first open into a daily habit and a paid subscription, and why each piece is built the way it is. Code lives in `apps/web/src/pages/OnboardingPage.tsx`, `CheckPage.tsx` (placement and test outs), `ProPage.tsx` (paywall) and `state/access.ts` (plans, prices and gating).

## Principles

1. **Value before the ask.** The paywall appears after the player has a personal plan, never before.
2. **Every question earns its place.** Each onboarding answer changes something the player can see: the plan, the order of lessons, the stakes in examples.
3. **No dark patterns.** The price, the trial length and the charge date are on screen before any tap. Closing is one tap. No fake reviews, no fake countdowns, no fake discounts. Trust is the product for a player who cares about accuracy.

## Onboarding flow

Short on purpose: about five screens, then the first lesson. Every question changes the plan; a question that only matters in one place is asked there, at the moment it matters.

| Screen | What it does | Why |
| --- | --- | --- |
| Welcome | The promise, who it is for at every level, and three swipeable cards that show the app (a lesson question, a range chart, the rating climb) | Show, not tell. Proof is real content counts, never invented users or reviews |
| Level | New to poker, play for fun, play regularly, poker is my job, with a one line reply | Decides basics first, the wording of every later question and whether placement is offered |
| Goals | In the player's words for their level (multi select) | Orders the first topics; quoted back in the plan |
| What costs you money | Regular players: the leak question. Players who play for fun: an optional "what feels hardest". New players: skipped | Only asked of people who can answer it |
| A quick guess / Try one hand | New and casual players guess how often aces beat 7 2 (87%: even the best hand loses 1 time in 8). Regular players face a real chart spot | Value before any ask, and the core idea of the app (judge decisions, not results) on screen one |
| Daily time | 5 to 20 minutes | A small, specific, chosen target |
| Find where you start | Placement quiz, or start from the basics (casual) or skip the quiz (regulars start at Foundations). Not shown to new players | Nobody repeats what they know |
| Plan | One card: the first lesson, what comes next, daily review. One button: Start my first lesson | No pledge ritual, no paywall in the way of the first win |
| First lesson | Starts right away | Activation: the first lesson is the product |
| First lesson done | A Day 1 moment with what they just did, then "Keep your progress" (a passkey account, skippable, once), then the Felt Pro offer once, then Today | Offers come after the first real value. The Pro offer stays on day one because most trials start on install day (82% in RevenueCat's 2025 report) |
| Today, after the first lesson | One card: "When will you do tomorrow's lesson?" with an optional calendar reminder | An if-then plan works best tied to a real moment (Gollwitzer and Sheeran 2006, d = 0.65 across 94 tests); asked when useful, not during setup |

Moved out of onboarding: the game charts should match (asked on the first visit to Ranges), who you play against and hands to import (regular players see an import card on Today), and the target tier (the level system on You shows the next tier and how close it is).

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
| Lessons | The whole basics track and the first module of every other track | All lessons |
| AI coach | No | Ask about any hand, with your rating and recent misses as context (needs a server with the coach turned on) |
| Weekly Pro challenge | No | Ten hard spots each ISO week, the same for every Pro player, scored like the daily |
| Priority support | No | Shown only when `SUPPORT_EMAIL` is set in `state/access.ts` |
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
4. Only what Pro adds, as a two column grid of perks from `proPerks()` in `state/access.ts`: more lessons, the AI coach, the weekly Pro challenge, solving your own spots and priority support. The perk that brought the player here comes first. A perk this build cannot deliver yet is labelled "Coming soon", and priority support is hidden until a support address is set. The skill to winnings estimate sits under the grid, labelled as a model.
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
