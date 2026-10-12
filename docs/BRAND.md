# Felt Brand

## Idea

**Instinct, trained.**

Great players do not calculate every decision at the table. They studied until the right play became instinct. Felt is where that studying happens: precise like a solver, calm like a good card room. The brand sits between the two worlds it serves, rigorous data and the feel of the game.

What Felt is not: a casino, a trading app, a crypto product. No neon, no chips raining down, no slot machine rewards. Progress is shown plainly and honestly.

## Voice

- Short, confident, plain. "Start review", not "Let's crush it!"
- Talks like a sharp coach: specific, never hype. "Not quite" instead of "WRONG".
- Numbers are stated without spin. Approximate data always says so.
- No em dashes in copy.

## Logo

**The mark** is a 4x4 range grid with the diagonal lit. Every solver chart in poker shares one shape: the pairs run down the diagonal. The mark reduces that to its essentials, so it reads as a clean grid to anyone and as a range chart to a player.

**The wordmark** is "Felt" drawn from Instrument Serif with tightened tracking, kept as outlines (`apps/web/src/ui/wordmark.ts`) so it never depends on a font loading.

**The lockup** pairs the tile mark with the wordmark, spaced at 0.38 of the mark height.

Files: `docs/brand/felt-lockup.svg`, `felt-wordmark.svg`, `felt-mark.svg`, `felt-app-icon.svg`. In code: `BrandMark`, `Wordmark`, `Lockup` in `apps/web/src/ui/Brand.tsx`.

Usage:
- Clear space around the mark: one grid cell on every side.
- Minimum size: 20px for the tile, 14px tall for the wordmark.
- Do not recolor the lit diagonal, rotate the grid, add effects, or redraw the wordmark in a live font.

## Color

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#0B1426` | Wordmark, dark brand surfaces, splash screen |
| Cobalt | `#2D5BFF` (dark mode `#5B82FF`) | The tint: buttons, selection, links, progress |
| Brand gradient | `#3F6BFF` to `#0A1A4A`, 135 degrees | App icon and the one hero surface per screen. Never on controls. |

Everything else uses iOS system colors so the app feels native: green for correct, red for wrong and raise, orange for warnings and streaks, gray for fold. Playing cards use a four color deck on white faces.

## Type

- **Display:** Instrument Serif (SIL OFL), regular and italic, for large titles, hero numbers and brand moments. Bundled in `apps/web/src/assets/fonts`.
- **Interface:** the system font (San Francisco on Apple devices) for everything else.
- Serif is for headlines and numbers people should feel. Never for buttons, labels or body text.

## Iconography

A small set drawn for Felt on a 24pt grid in `apps/web/src/ui/icons.tsx`: 1.75 stroke, round caps, filled state for selection. Poker specific where it helps (fanned cards for Review, a range grid for Ranges). No third party icon libraries.

## Motion

Motion explains what happened; it never decorates.

- **Deal and flip:** drill cards are dealt face down and flip up. The answer clock starts after the flip.
- **The diagonal wave:** range grids draw in along the diagonal, echoing the mark.
- **Ink:** painted cells fill from the left like a brush stroke.
- **Liquid selection:** the tab pill stretches as it slides between tabs.
- **Count up:** headline numbers roll to their value; rings fill.
- Springs for things you touch, ease out for things that appear. Everything respects Reduce Motion.

## Materials

Liquid Glass for what floats (tab bar, sidebar, nav bar, toolbars). Content sits on plain grouped surfaces. The brand gradient appears at most once per screen.
