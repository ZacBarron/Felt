# Suited Brand

## Idea

**Poker, suited to you.**

Suited is poker training that fits the player: their game, their stakes, their leaks and a few minutes a day. It is precise like a solver and calm like a good card room, and every answer says how sure it is. The line plays on the name: suited cards, and a plan suited to you.

What Suited is not: a casino, a trading app, a crypto product. No neon, no chips raining down, no slot machine rewards. Progress is shown plainly and honestly.

## Name

The product was called Felt until October 2026. "Felt" conflicted with an existing poker app and a registered FELT mark for mobile apps, so it became **Suited**: suited cards, and a plan suited to your game. The brand review behind the change scored five names; see the Suited brand review artifact. Internal identifiers (storage keys such as `felt.settings.v1`, the `felt` IndexedDB database, the `@felt/*` packages and the repository) keep the old name on purpose: renaming them would wipe players' saved progress.

## Voice

Suited sounds like a good coach sitting next to you: calm, direct and warm. The full guide, with sentence rules, accessibility, mechanics and the glossary, is [VOICE.md](VOICE.md).

## Logo

**The mark** is a real 13x13 range chart with an S painted into it, the way a solver paints a range. Cells in the S are brass. Cells on its curves are mixed hands, drawn as split cells the way a range chart shows them, which also round the letter. The rest of the chart stays faintly visible. A player reads it as a range chart, anyone else as an S.

**The wordmark** is "Suited" drawn from Instrument Serif with tracking of -10 units per letter, kept as outlines (`apps/web/src/ui/wordmark.ts`) so it never depends on a font loading. Regenerate it from the font with opentype.js rather than editing the path by hand.

**The lockup** pairs the tile mark with the wordmark, spaced at 0.38 of the mark height.

Files: `docs/brand/suited-lockup.svg`, `suited-wordmark.svg`, `suited-mark.svg`, `suited-app-icon.svg`, and the overview `suited-brand-board.png`. App icons in `apps/web/public`: rounded tiles for the favicon and the 192 and 512 icons, a full bleed square for the iPhone home screen, and a maskable icon with the grid inside the safe zone. In code: `BrandMark`, `Wordmark`, `Lockup`, `markCell` in `apps/web/src/ui/Brand.tsx`.

Usage:
- Clear space around the mark: one grid cell on every side.
- Minimum size: 20px for the tile, 14px tall for the wordmark.
- Do not change which cells are lit, recolor the S, rotate or mirror the grid, add effects, or redraw the wordmark in a live font.

## Color

The palette is called **Card room**: the felt of a table at night, lit by warm brass. It follows a 60/30/10 split.

| Role | Share | Color | Why |
| --- | --- | --- | --- |
| Neutrals | 60% | Paper `#F4F1EA` by day, green black `#080C0B` by night | Warm neutrals let the content lead and keep brass from feeling loud |
| Spruce | 30% | `#0B2421` to `#21604F` | The felt. Cool and low in saturation, so it recedes and gives depth |
| Brass | 10% | `#E3B261` (fills), `#9A6A1E` (text on paper), `#E9B866` (text at night) | Spruce's warm near complement. Warm hues advance, so brass marks what to do next |

Color theory notes:
- Spruce (blue green) and brass (orange yellow) sit roughly opposite on the color wheel. Opposites make each other look richer, which is why a little brass carries a lot of weight.
- The brand colors stay clear of the solver's semantic colors: raise is red, call and correct are green, fold is gray, 3bet is purple. Brass is never red or green, and spruce is far darker and grayer than call green, so a selected chip can never be mistaken for an action.
- Filled brass buttons use spruce black text, not white, for contrast.
- The felt gradient appears at most once per screen.

### Themes

Card room is the brand: it is what goes on the app icon, the splash screen and every marketing surface. People can pick an alternate theme in Settings for the app itself:

| Theme | Suited | Accent | Note |
| --- | --- | --- | --- |
| Card room (default) | Spruce | Brass | The brand |
| Ink | Navy | Brass | Quieter, more corporate |
| Oxblood | Wine | Cream | Warm and dramatic; the felt sits near the red used for raise, so it is not the default |
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

A small set drawn for Suited on a 24pt grid in `apps/web/src/ui/icons.tsx`: 1.75 stroke, round caps, filled state for selection. Poker specific where it helps (fanned cards for Review, a range grid for Ranges). No third party icon libraries.

## Motion

Motion explains what happened; it never decorates.

- **Deal and flip:** drill cards are dealt face down and flip up. The answer clock starts after the flip.
- **The diagonal wave:** range grids draw in along the diagonal, echoing the mark.
- **Ink:** painted cells fill from the left like a brush stroke.
- **Liquid selection:** the tab pill stretches as it slides between tabs.
- **Count up:** headline numbers roll to their value; rings fill.
- **The mark assembles:** on the welcome screen and in moments, the grid pops in along the diagonal and the S lights in a brass sweep.
- **Verdicts land:** the badge pops, a soft ring leaves it, and the check draws itself. Mix bars grow from the left.
- **Moments:** a new tier or a streak milestone gets one short full screen moment on the felt, once, and only on a calm screen (never mid question). The title wipes in like ink. Nothing else earns a takeover.
- Springs for things you touch, ease out for things that appear. Everything respects Reduce Motion.

## Materials

Liquid Glass for what floats (tab bar, sidebar, nav bar, toolbars). Content sits on plain grouped surfaces. The felt hero carries a fine noise so it reads as cloth, not plastic, and shows the range you are learning as a faint brass texture.
