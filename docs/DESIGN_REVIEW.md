# Design review: hierarchy and text diet

October 2026. A pass over every main screen at phone size (390 by 844), light and dark.

## What we found

1. **Too much small grey text.** Footnotes, section footers and two or three line row subtitles sat on almost every screen. Grey 13px paragraphs read as noise and make screens look the same.
2. **Flat hierarchy.** Section headers were tiny grey capitals, row titles and their subtitles were close in weight, and cards often opened with a paragraph. The eye had nowhere to land.
3. **Menus were long lists.** More had 14 rows in three groups. Settings was one long scroll of every option.
4. **Serif in the wrong place.** The display serif set status words like "Not rated" at hero size.
5. **Explanations always on.** How a feature works was printed under it every time, even after the hundredth visit.

## Rules from now on

- **One idea per screen header.** A large serif title. A subtitle only when it says something the title does not, in one line.
- **One visible paragraph per screen at most.** Everything else goes behind an info button (`Section` with `info`) or a disclosure.
- **Rows are labels, not sentences.** A title and at most one short second line. Rows never carry full explanations.
- **Show, do not tell.** Prefer an icon tile, a number, a pill, a chart or lesson art over a sentence.
- **Prominent section headers.** Sentence case, 20px, bold, in the label color (`.section-title` or `Section`).
- **Footers only for honesty and consequences.** Approximate data labels, model assumptions and what an action will change stay visible. Everything else moves to info.
- **Empty states** use `EmptyState`: one picture, one line, one action.
- **Serif** is for large titles, hero numbers and empty state titles only.
- **Type scale** (rem is 17px): large title 2.75 serif, title 1.35, section 1.18 bold, headline 1 semibold, body 1, subhead 0.88, footnote 0.8, caption 0.72.

Honesty labels from CLAUDE.md never move behind an info button: Approximate, Exploit, Player tendency, and which win rate parts are model assumptions.
