# Felt

Personal poker training app. Read docs/CONCEPT.md and docs/ROADMAP.md before starting a feature; tick roadmap boxes as work lands.

## Commands

- `pnpm install`
- `pnpm dev` runs the web app
- `pnpm check` runs typecheck and tests across all packages (run before every commit)
- `pnpm build` builds the web app

## Conventions

- `packages/core` is pure TypeScript: no browser APIs, no imports from content or web. Every function in it gets unit tests.
- Strategy data lives in `packages/content`, never inside components.
- Ranges are `Map<HandClass, number>` frequencies; charts are prioritized action ranges (see `core/src/charts.ts`).
- Mixed strategies are first class. Never collapse a GTO answer to one action.
- Every chart or node carries a `source`. Approximate data must be labelled as such in the UI.
- Amounts are in big blinds unless a field says otherwise.
- Writing style for UI copy and docs: plain language, no em dashes.

## UI conventions (apps/web)

- Brand rules (logo, color, type, motion, voice) live in docs/BRAND.md. Display serif is for titles and hero numbers only; the felt gradient appears at most once per screen.

- Design language is iOS 26 Liquid Glass: system font, the Card room palette (spruce felt, brass tint, warm neutrals; no neon), light and dark from the system or the Appearance setting, inset grouped lists, capsule controls, and the `.glass` material only for things that float (tab bar, sidebar, nav bar, toolbars). Content itself sits on plain grouped surfaces.
- Colors come from the CSS tokens in `styles.css` (`--tint` for text and icons, `--tint-fill` with `--on-tint` for filled buttons, `--green`, `--red`, `--label-2`, `--surface`, ...). Never hard code a color in a component unless it is a playing card or the felt.
- Icons come from `src/ui/icons.tsx`, drawn for this app on a 24pt grid. Do not add an icon library.
- Glass rims use box-shadow only. A masked pseudo element rim disables the backdrop blur in Chromium. When screenshotting with Playwright, launch with `--use-angle=swiftshader --enable-unsafe-swiftshader` or blur will not render.
- Phone first. Primary actions go in `<BottomBar>` (thumb zone, above the tab bar). Inputs stay at 16px so iOS does not zoom.
- Every `button` and link gets a press state from `styles.css` and a light haptic from the global listener in `haptics.ts`. Set `data-haptic="select"` for choices, or `data-haptic="off"` when the handler plays its own feedback (`haptic('success' | 'warning' | 'error')`).
- Never leave a transform on an ancestor of fixed elements: page and reveal animations use `backwards` fill, not `both`.
- Use the shared primitives in `src/ui/` (Segmented, Chips, Toggle, Stepper, ProgressRing, BottomBar) before writing new controls.
- Respect `prefers-reduced-motion` (handled globally in `styles.css`).
