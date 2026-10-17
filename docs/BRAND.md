# Aced Brand

## Idea

**Ace every spot.**

Aced is poker training for players who want to be the toughest player at their table. It fits their game, their stakes, their leaks and a few minutes a day. It is precise like a solver and calm like a good card room, and every answer says how sure it is. The name is the promise: you ace it. A spot is the poker word for a decision, so the line says exactly what the app trains.

Always write the brand as **Aced**. "Poker" is a descriptor ("Aced: Poker Trainer & GTO"), never part of the name, because "Aced Poker" was the name of a real money card room. The domain is acedpoker.app.

What Aced is not: a casino, a trading app, a crypto product. No neon, no chips raining down, no slot machine rewards. Progress is shown plainly and honestly.

## Name

The product was called Felt until October 2026. "Felt" conflicted with an existing poker app and a registered FELT mark for mobile apps, so it became **Suited**. Suited in turn clashed with suitedpoker.com and suited.app, so in October 2026 it became **Aced**, chosen by a simulated panel of 100 target players (see the Aced growth plan artifact). With the rename the mark changed too: it is now a range chart drawn as an arrow to the best hands. Internal identifiers (storage keys such as `felt.settings.v1`, the `felt` IndexedDB database, the `@felt/*` packages and the repository) keep the old name on purpose: renaming them would wipe players' saved progress.

## Voice

Aced sounds like a good coach sitting next to you: calm, direct and warm. The full guide, with sentence rules, accessibility, mechanics and the glossary, is [VOICE.md](VOICE.md).

## Logo

**The mark** is a 7x7 range chart drawn as an arrow to the top left corner, where the strongest hands live. As in every range chart, the top row holds the suited aces, the left column the offsuit aces and the diagonal the pairs. The filled corner holds the premium hands. The shape is mirror symmetric across the diagonal, so it reads as one clean form at 16px: an arrow pointing up and to the left. A player reads it as a range chart. Anyone else reads it as a confident arrow.

The arms and corner are brass `#E3B261` and the pairs on the diagonal are light brass `#F1CD86`, so the diagonal shows through the arrowhead. Empty cells are a whisper `#1E2A27`. The tile is night felt, a radial from `#18332C` at the top left to `#0C1614`, with a 10% cream rim. Night felt keeps the card room family while it stands apart from spruce grounds, so the mark is never green on green. A unit test (`apps/web/test/brandMark.test.ts`) holds the shape and its symmetry.

**The wordmark** is "Aced" drawn from Instrument Serif with tracking of -10 units per letter, kept as outlines (`apps/web/src/ui/wordmark.ts`) so it never depends on a font loading. Regenerate it from the font with opentype.js rather than editing the path by hand.

**The lockup** pairs the tile mark with the wordmark, spaced at 0.38 of the mark height. The full brand name is Aced Poker (store listings, legal pages and the first mention in copy). The lockup and the app icon say Aced.

Files: the master mark is `docs/brand/aced-mark.svg` (viewBox 120, tile `rx` 27, grid from 19 with 10 unit cells and 2 unit gaps). App icons in `apps/web/public` and `apps/site/public` come from `scripts/make-icons.mjs`: `favicon.svg`, rounded tiles for the favicon and the 192 and 512 icons, a full bleed square for the iPhone home screen, and a maskable icon with the grid inside the safe zone. In code: `BrandMark`, `MARK`, `MARK_COLORS`, `markCell` in `apps/web/src/ui/Brand.tsx`, with a copy in `apps/site/src/mark.ts`. The older 6x6 files in `docs/brand/suited-*` are history.

Usage:
- Clear space around the mark: 19 units of 120 on every side, built into the tile.
- Minimum size: 20px for the tile, 14px tall for the wordmark.
- Do not change which cells are lit (the test holds the shape), recolor the cells, rotate the grid, add effects, or redraw the wordmark in a live font.

## Color

The palette is called **Card room**: the felt of a table at night, lit by warm brass. It follows a 60/30/10 split.

| Role | Share | Color | Why |
| --- | --- | --- | --- |
| Neutrals | 60% | Paper `#F4F1EA` by day, green black `#080C0B` by night | Warm neutrals let the content lead and keep brass from feeling loud |
| Spruce | 30% | `#0B2421` to `#21604F` | The felt. Cool and low in saturation, so it recedes and gives depth |
| Brass | 10% | `#E3B261` (fills), `#8A5C14` (text on paper, 5:1 so it passes AA at small sizes), `#E9B866` (text at night) | Spruce's warm near complement. Warm hues advance, so brass marks what to do next |

Color theory notes:
- Spruce (blue green) and brass (orange yellow) sit roughly opposite on the color wheel. Opposites make each other look richer, which is why a little brass carries a lot of weight.
- The brand colors stay clear of the solver's semantic colors: raise is red, call and correct are green, fold is gray, 3bet is purple. Brass is never red or green, and spruce is far darker and grayer than call green, so a selected chip can never be mistaken for an action.
- Filled brass buttons use spruce black text, not white, for contrast.
- The felt gradient appears at most once per screen.

### The chip set (ancillary)

Card room alone made every secondary card look the same: a dark surface, a small brass icon and gray text. The chip set adds two colors from the chips on a card room table, for the few things worth a nudge and for marketing.

| Chip | Color | Use |
| --- | --- | --- |
| Cobalt | `#2F5FE0` to `#14296F` | Social and growth: invites, the league, the coach, scenarios |
| Gold | `#F8DC9B` to `#B47A24`, ink `#1D1505` | Pro and challenges: the weekly Pro challenge, the daily challenge |

Rules:
- **Feature cards** (`.feature-card.cobalt`, `.feature-card.gold` with `ChipArt` or `MedalArt`) are for at most two nudges per screen. Content stays on plain grouped surfaces.
- **Icon tiles** in lists take the color of what they open: gold for challenges and Pro, cobalt for social things and the coach, spruce for study, gray for account and settings.
- **Pro is always gold.** Every Pro badge (`ProBadge`, `.pill-pro`), the Pro row in Settings and You, the Pro card on You and the paywall's Pro column, checks and selected plan. A player learns one color for "this is Pro".
- **Empty state art** takes the same color as the row that leads to it (`.sc-art-tile.cobalt` for the coach and the league).
- **Share cards** come in felt, cobalt and paper. Felt leads; cobalt is the social card.
- **Never a poker meaning.** Red, green, purple and gray belong to the actions (raise, call, 3bet, fold). The chip set has no red, green or purple, so a decoration can never be read as an action.
- The chip colors are the same in light and dark, like a printed chip.
- **Marketing** uses Card room plus the chip set: spruce and brass lead, cobalt and gold for callouts, stickers and social cards.

### Personality and easter eggs

Aced's personality comes from the game itself: table talk, card counts and the craft of the mark. It is never a joke at the player's expense, never a reward for time spent, and never in the way of a question.

| Where | What |
| --- | --- |
| Footer on You and Settings | Tap the mark. It paints itself again and says it is a range chart. |
| Ranges and Play | Hands with table names show them: pocket rockets, cowboys, the hammer. Never on a quiz question. |
| Play | Win a pot with 7 2 offsuit, or show down a straight flush, and the banner turns brass with one glint. |
| Streaks | Milestones count in cards: 13 days is a suit, 52 a deck, 169 every starting hand. |
| Daily challenge | A perfect 5 of 5 says "You had the nuts today." The share card says it too. |
| Any dead link | The page folds: two card backs slide into the muck. |

Rules: one small touch per moment, motion under a second and off with reduced motion, and copy that still follows VOICE.md.

### Themes

Card room is the brand: night felt and brass go on the app icon, and Card room leads the splash screen and every marketing surface. People can pick an alternate theme in Settings for the app itself:

| Theme | Aced | Accent | Note |
| --- | --- | --- | --- |
| Card room (default) | Spruce | Brass | The brand |
| Ink | Navy | Brass | Quieter, more corporate |
| Burgundy | Wine | Cream | Warm and dramatic; the felt sits near the red used for raise, so it is not the default |
| Cobalt | Blue | Ice | The earlier blue direction |

Themes only change the felt and accent tokens (`--base-*`, `--felt-*`, `--accent`, `--tint*`). Poker semantic colors never change.

### Action colors

Solver colors are a convention players know: raise is red, call is green, fold is gray, 3bet is purple. They are the default. About 1 in 12 men has red-green color blindness: in a deuteranopia simulation, raise and call differ by only 21 points of CIELAB difference (110 with normal vision). So Settings, Appearance and feel has **Color blind friendly** action colors, which differ in lightness as well as hue (`data-colors="cvd"` on the root):

| Action | Light | Dark |
| --- | --- | --- |
| Raise and bets | Vermilion `#EE6A2A` | `#FF7A45` |
| Call and check | Deep teal `#0F7B6C` | `#20B39C` |
| Fold | Warm gray `#B5AFA4` | `#4A4843` |
| 3bet and 4bet | Purple (unchanged) | Purple (unchanged) |

With it on and deuteranopia, raise and call differ by 66 (light) and every action pair stays apart in both themes. Bet sizes are always shades of the raise color. The general red and green for right and wrong answers are separate tokens and always come with an icon or words.

Everything else uses the system palette so the app still feels native. Playing cards use a four color deck on white faces; card backs are spruce with a brass lattice.

## Type

- **Display:** Instrument Serif (SIL OFL), regular and italic, for large titles, hero numbers and brand moments. Bundled in `apps/web/src/assets/fonts`.
- **Interface:** the system font (San Francisco on Apple devices) for everything else.
- Serif is for headlines and numbers people should feel. Never for buttons, labels or body text.

## Iconography

A small set drawn for Aced on a 24pt grid in `apps/web/src/ui/icons.tsx`: 1.75 stroke, round caps, filled state for selection. Poker specific where it helps (fanned cards for Review, a range grid for Ranges). No third party icon libraries.

## Motion

Motion explains what happened; it never decorates.

- **Deal and flip:** drill cards are dealt face down and flip up. The answer clock starts after the flip.
- **The diagonal wave:** range grids draw in along the diagonal, echoing the mark.
- **Ink:** painted cells fill from the left like a brush stroke.
- **Liquid selection:** the tab pill stretches as it slides between tabs.
- **Count up:** headline numbers roll to their value; rings fill.
- **The mark assembles:** on the welcome screen and in moments, the grid pops in along the diagonal and the range lights in a brass sweep.
- **Verdicts land:** the badge pops, a soft ring leaves it, and the check draws itself. Mix bars grow from the left.
- **Moments:** a new tier or a streak milestone gets one short full screen moment on the felt, once, and only on a calm screen (never mid question). The title wipes in like ink. Nothing else earns a takeover.
- Springs for things you touch, ease out for things that appear. Everything respects Reduce Motion.

## Materials

Liquid Glass for what floats (tab bar, sidebar, nav bar, toolbars). Content sits on plain grouped surfaces. The felt hero carries a fine noise so it reads as cloth, not plastic, and shows the range you are learning as a faint brass texture.
