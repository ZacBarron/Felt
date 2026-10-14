# Onboarding, retention and Felt Pro

How Felt turns a first open into a daily habit and a paid subscription, and why each piece is built the way it is. Code lives in `apps/web/src/pages/OnboardingPage.tsx`, `CheckPage.tsx` (placement and test outs), `ProPage.tsx` (paywall) and `state/access.ts` (plans, prices and gating).

## Principles

1. **Value before the ask.** The paywall appears after the player has a personal plan, never before.
2. **Every question earns its place.** Each onboarding answer changes something the player can see: the plan, the order of lessons, the stakes in examples.
3. **No dark patterns.** The price, the trial length and the charge date are on screen before any tap. Closing is one tap. No fake reviews, no fake countdowns, no fake discounts. Trust is the product for a player who cares about accuracy.

## Onboarding flow

| Screen | What it does | Why it works |
| --- | --- | --- |
| Welcome | Two aces dealt on the felt, "From your first hand to Elite", the rating ladder climbing, and real counts of lessons, questions and charts. "I have an account" appears only when a server answers and opens sign in (passkey first, email code as the fallback). Signing in there skips onboarding and shows "Welcome back" with the Felt Rating, lessons and streak that came back | Names the whole journey for a beginner and a regular alike. The proof is depth that can be checked, not claims |
| Level | New to pro, with a one line reply to the answer | Each answer is heard (the reply), and it decides basics first or placement |
| Target | Pick a tier to aim for: Solid, Regular, Expert or Elite, with what each means and its rating | A specific, hard goal beats "do your best" (Locke and Latham 2002); Elite is the cap because higher tiers could not be measured honestly |
| Goal | Beginners (new, or play for fun) see goals in their words: learn the game, home games, a casino, get really good, tournaments. Regular and pro players see win live, move up, go pro, master GTO, tournaments | The goal is quoted back in the plan and on Today. Changing level drops goals the new level does not offer |
| Game | Beginners: home games, a casino or card room, online, tournaments, not sure yet. Players: live 1/3, live 2/5+, online, tournaments, each with what the label means | Sets the game preset, so the first hand and every chart match |
| Focus | Asked only of people who can answer it. New players skip it: they cannot name a leak yet. People who play for fun get an optional "What feels hardest right now?" in plain words. Regular and pro players get "What costs you the most money?" with a note on each area, including bankroll and swings | Moves those modules up the path |
| Opponents | Regular and pro players only: loose and casual, a mix, or strong regulars | Brings exploits or theory forward, and moves the pool rating assumption one tier (150 points) down or up from the game default. The player sees and can change it with the other win rate assumptions |
| Hands to import | Regular and pro players only: hand histories, a session log, or not yet | Real hands beat guesses about leaks. Today then shows one card that leads to the import, until something is imported or the card is closed |
| First hand | New players pick the better of two starting hands; people who know the rules answer a hand ranking question from the rankings lesson; players get a real button open from their game, untimed, graded with its mix | Value before the ask. It is winnable on purpose: an early success is the strongest source of self efficacy (Bandura 1977). Letting people try before signing up is how Duolingo onboards (secondary reports of a large lift) |
| Why it works | Sources on every answer, recall over rereading (61% vs 40% a week later), a rating built on Elo and Glicko | Real, cited reasons in place of invented social proof |
| Daily goal | 5, 10, 15 or 20 minutes | A specific, small, chosen target |
| Study cue | When they will study | Implementation intention (Gollwitzer 1999) |
| Find where you start | Placement or start from the basics. Skipped for new players | Nobody repeats what they know |
| Plan | Pledge, the climb to their target, and the first week starting with a done "Set up your plan" row, then hold to commit | The labor of building is shown (Buell and Norton 2011). A step already done is honest endowed progress (Nunes and Drèze 2006) |
| Day 1 | A short moment: "Your plan is set" | Marks the commitment the player just made |
| Save your progress | Only when the server offers accounts and the player is a guest. A calm screen: what an account gives (no password, your plan, rating and streak on any device, safe if the phone is lost), "Create a passkey", "Skip for now" at the same size, and "Use email instead". Asked once. Events: `account_prompt_viewed`, `account_created`, `account_skipped` | Deferred sign up: the ask comes after the player has a plan worth keeping, not before any value. Duolingo lets people finish a lesson before asking for an account and reports more daily users from moving sign up later (secondary source, see research/sources.md). Passkeys make it one tap with nothing to remember. Skipping costs nothing, so the choice stays honest |
| Paywall | Felt Pro, personalized headline | Shown at peak intent, right after commitment |

New players always start with the basics, whatever their goals; so does a casual player who skips placement (`pathPrefs` in `state/goals.ts`). After onboarding, review deals chart cards only once the lesson that introduces charts is done (or any preflop lesson), and math cards only after the odds or a math lesson (`chartsTaught` and `mathTaught` in `state/decks.ts`). Today hides the daily challenge until then, so a beginner is never sent to a range chart they have not learned.

**Social proof.** Felt shows only proof that is true: counts read from the content, cited research and, once real players give them, quotes in `TESTIMONIALS` (`packages/content/src/onboarding.ts`). Social proof persuades most when it describes people like the reader (Goldstein, Cialdini and Griskevicius 2008), and invented numbers or reviews would break the trust the product depends on. The section stays hidden while the list is empty.

The progress bar at the top of every step keeps the end in sight.

**Later, for guests.** When accounts exist, Today shows one card after real progress worth protecting (3 lessons done or a 3 day streak): "Save your progress to an account. Use Felt on any device." It shows for a day at most once a week, waits 3 days after the onboarding ask, and never returns after two dismissals. No loss framing beyond the plain fact. Rules in `state/accountPrompt.ts` (unit tested).

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
