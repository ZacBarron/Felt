# Felt promo

A 20 second motion promo for Felt, made with [Remotion](https://www.remotion.dev) (video written in React). It follows docs/BRAND.md and docs/VOICE.md.

This folder is separate from the pnpm workspace (`apps/*` and `packages/*`), so it never affects the app install or build. It copies the brand pieces it needs (mark cells, wordmark outline, colors, Instrument Serif) instead of importing from the app.

| Composition | Size | Length |
| --- | --- | --- |
| `FeltPromoVertical` | 1080x1920 | 20 s at 30 fps |
| `FeltPromoLandscape` | 1920x1080 | 20 s at 30 fps |

The storyboard:

1. The mark assembles along the diagonal and the F lights in brass. The wordmark and "Instinct, trained." resolve.
2. A 13x13 chart (CO open, 100bb, labelled approximate) draws in and gets painted like ink. A mixed hand (QTo, raise 75%) is called out.
3. A drill: A5s is dealt and flipped. The player taps 3bet. "Correct" and the mix bar (3bet 70%, call 30%) appear.
4. The Felt Rating counts from 1180 to 1438 in a brass ring. The tier "Sharp" wipes in like ink.
5. A phone shows the Today screen and checks off Today's plan.
6. The lockup and tagline.

The numbers come from the app. The chart and the drill mix are from `packages/content/src/charts.ts`. The tier and "62 points to Regular" follow the tier table in `packages/core/src/rating.ts`.

## Set up

```sh
cd promo
npm install
```

Use npm here, not pnpm at the root.

## Preview in Remotion Studio

```sh
npm run studio
```

This opens the Studio in your browser. Pick a composition on the left and scrub the timeline.

## Render

```sh
npm run render              # both videos into out/
npm run render:vertical     # out/felt-promo-vertical.mp4
npm run render:landscape    # out/felt-promo-landscape.mp4
npm run stills              # one PNG per scene, vertical
npm run stills:landscape    # one PNG per scene, landscape
```

Remotion needs a headless Chrome. `remotion.config.ts` uses the preinstalled Playwright Chromium under `/opt/pw-browsers` when it exists. To use another browser, set `REMOTION_BROWSER=/path/to/chrome`. Without either, Remotion downloads its own.

## Change the copy

All on screen text follows docs/VOICE.md. Use short sentences with one idea each and at most one comma per sentence. Avoid em dashes and semicolons. Use the glossary terms ("chart" for the grid, "Felt Rating", "tier").

| What | Where |
| --- | --- |
| Tagline | `TAGLINE` in `src/brand.ts` |
| Scene captions | the `<Caption title=... sub=...>` at the bottom of each file in `src/scenes/` |
| Chart and callout | `src/range.ts` (range) and `src/scenes/Chart.tsx` (title, focus hand) |
| Drill spot and mix | `MIX`, `BUTTONS` and the header in `src/scenes/Drill.tsx` |
| Rating numbers | `FROM`, `TO`, `TIER`, `NEXT` in `src/scenes/Rating.tsx` |
| Today screen | `TASKS` and the hero in `src/scenes/Phone.tsx` |

If you change a number, keep it honest. It should match what the app would show.

## Change the timing

Every scene start, beat and sound cue lives in `src/timeline.ts`. Sound cues are built from the scene beats, so they move with the animation.

## Sound

The sound is synthesized from sine waves and filtered noise. No outside samples are used. It has a soft pad, a tap, a card deal, a card flip and gentle chimes. To rebuild the WAV files in `public/audio`, run:

```sh
npm run audio   # needs python3 with numpy
```

Volumes are set in `Sound()` in `src/Promo.tsx`. To render without sound, set the `audio` prop to `false` in `src/Root.tsx`.

## Files

- `src/Promo.tsx`: the sequence of scenes and the sound
- `src/scenes/`: one file per scene
- `src/ui/`: felt background, layout, captions, mark and wordmark, playing card
- `src/brand.ts`: colors and fonts copied from `apps/web/src/styles.css`
- `src/wordmark.ts`: copied from `apps/web/src/ui/wordmark.ts`
- `public/fonts/`: Instrument Serif (SIL OFL, see `OFL.txt`)
- `out/`: renders (git ignored)
