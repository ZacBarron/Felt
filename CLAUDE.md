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
