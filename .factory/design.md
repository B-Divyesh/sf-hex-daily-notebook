# Hex Daily Notebook — visual thesis

## Direction: blueprint drafting sheet

The puzzle is treated as a working drawing rather than a game board: deep cyan
paper, pale construction lines, numbered brass registration pins, handwritten
graphite marks, and a compact title block. This fits a spatial deduction ritual
because the interface feels made for trying, crossing out, and revising. The
board is the hero; illustration and chrome stay subordinate.

This is an intentionally single-mode environment, like a sheet viewed under one
task lamp. Privacy and legal pages use the same ink-and-paper treatment.

## Tokens

- Blueprint field `#073b4c`; deep field `#052d3a`; raised sheet `#0b4a5e`.
- Primary paper ink `#f4efd9`; secondary ink `#b9d7d3`.
- Cyan construction line `#76d7d1`; active cyan `#9ef0e8`.
- Brass clue `#f4c95d` with dark stamp `#17333a`.
- Vermilion correction `#ff8c70`; success mint `#9ce2b2`.
- Focus is a 3px brass outline with a pale offset halo. All text pairs meet
  4.5:1; shape, label, and pattern always accompany color.

## Typography

- UI and headings: system geometric sans (`Avenir Next`, `Segoe UI`, sans-serif)
  with wide drafting-label tracking. No network font request.
- Numbers and annotations: system monospace (`IBM Plex Mono` when installed,
  `SFMono-Regular`, `Consolas`, monospace), tabular figures.
- Scale: 14 / 16 / 20 / 28 / clamp(36–56) px; body stays at least 16px.

## Spacing and layout

An 8px base rhythm, with 4px only for tight drafting labels. Content caps at
1180px. On desktop, rules/tools form a narrow left rail and the board owns the
remaining drafting sheet. At 760px the rail stacks above the board. At 390px,
secondary explanatory copy collapses into `<details>`, while tools remain in a
two-row reachable belt. Touch targets are at least 44px with 8px separation.

## Interaction grammar

- Fill mode stamps a cell with dense diagonal hatching; a second press adds an
  explicit × exclusion, then returns it to blank. Clue pins cannot be changed.
- Pencil mode draws pale freehand strokes across the entire sheet. Eraser mode
  removes any stroke it touches. Tool labels and cursors reinforce mode.
- Arrow keys follow the six-neighbor hex geometry; Space cycles the focused
  cell. P/E/F switch tools, U undoes, and ? opens rules.
- The status strip reads like a drawing revision block: trace count, elapsed
  time, date, and verification result.

## Motion

State transitions use 160–220ms opacity/transform changes: stamped hatching
settles from 0.98 scale and completion draws a short border sweep. Nothing
loops. Under `prefers-reduced-motion`, transforms and smooth scrolling are
removed and feedback becomes an immediate opacity/state change.

## Original asset plan and provenance

One generated still-life illustration supports the rules/ritual without
pretending to be the playable board. Art direction: top-down editorial still
life of a worn cyan blueprint, an unlabeled hand-drawn hex lattice, brass
drafting compass, graphite pencil, paper grain, warm raking task light, deep
teal/cyan/brass/ivory palette, generous negative space; no people, text,
letters, logos, watermark, UI, brands, or recognizable copyrighted material.

Generation prompt (use case `stylized-concept`, website editorial
illustration): “Top-down editorial still life on a dark cyan architect’s
blueprint sheet. An unlabeled hand-drawn honeycomb of nineteen hexagons, a
small brass drafting compass and graphite pencil, subtle eraser crumbs and
paper fibers, warm raking task-lamp light, quiet contemplative evening mood,
screen-print-meets-photographic texture, deep teal, blueprint cyan, aged ivory
and brass palette, landscape framing with uncluttered negative space. No text,
no letters, no numbers, no hands or people, no logos, no watermark, no branded
objects, no interface screenshot.”

Generated with the factory Azure image deployment on 2026-08-28. The selected
output is original AI-generated artwork for this product; its source PNG and
prompt sidecar live in `assets/src/`, with optimized WebP/AVIF derivatives in
`public/assets/`. All interface icons and board geometry are original inline
SVG/CSS authored for this repository.

