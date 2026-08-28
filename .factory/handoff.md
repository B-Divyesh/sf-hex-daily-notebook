# Hex Daily Notebook — build handoff

Work order: `hex-daily-notebook-build-1`

Completed: 2026-08-28

Artifact: static PWA, Vite + vanilla TypeScript, output `dist/`

## What shipped

- A deterministic daily 19-cell hex deduction puzzle with an original rule set:
  shade seven connected cells while brass clue pins count adjacent shaded cells.
- A generator that enumerates the connected seven-cell solution space and adds
  clues until the target is provably unique. It is deterministic by local date
  and requires no server or daily content download.
- Complete touch/mouse play with blank → filled → × cell states, freehand pencil
  strokes across the whole sheet, drag erasing, clear-pencil, and reversible undo.
- Complete keyboard play: Tab/arrow navigation, Space/Enter marking, F/P/E tool
  shortcuts, U undo, and ? instructions.
- Local progress, strokes, completion, and timer persistence with explicit
  storage-error feedback. No account, analytics, cookies, external scripts,
  external fonts, or network data storage.
- A 21-puzzle archive released after a seven-day delay, future/recent/invalid-date
  error states, an offline state, spoiler-free result copying, and `/privacy`
  and `/terms` routes.
- Installable offline PWA with a versioned Workbox shell cache, navigation
  fallback, update behavior, web manifest, SVG app icon, and Azure Static Web
  Apps routing/security configuration.
- Product-specific blueprint visual system in `.factory/design.md`, including
  palette, typography, spacing, interaction, motion/reduced-motion, and asset
  provenance.
- Original generated blueprint still-life: reviewed source and prompt in
  `assets/src/`; 900×600 AVIF (22 KB) and WebP fallback (45 KB) in
  `public/assets/`.

## Run and verify

```sh
npm install
npm test
npm run build
npm run test:e2e
npm run preview
```

- `npm test`: 3/3 unit tests pass, including deterministic generation,
  uniqueness across a 31-day sample, connected traces, and date validation.
- `npm run build`: passes TypeScript and creates `dist/index.html`.
- `npm run test:e2e`: 12/12 Playwright checks pass across desktop Chromium and
  a 390×844 mobile Chromium viewport. Coverage includes console errors, keyboard
  and pointer pencil input, local restore, complete solve/reload, axe WCAG A/AA,
  archive/legal routes, and an actual service-worker offline reload.
- `npm audit --omit=dev`: 0 production dependency vulnerabilities.
- Production asset budget: app JS 23.40 KB + Workbox helper 5.71 KB; CSS
  10.90 KB; largest shipped image 45 KB. All are well under the static-product
  budgets (200 KB JS, 50 KB CSS, 300 KB hero).

## Lighthouse-class verification

Lighthouse 12.2.1, mobile simulated throttling, production preview,
`/?day=2026-08-14`:

- Performance: 100
- Accessibility: 100
- Best practices: 100
- SEO: 100
- FCP: 1.0 s
- LCP: 1.4 s
- Total blocking time: 40 ms
- CLS: 0

Automated axe checks found no serious or critical WCAG A/AA violations. Manual
visual review covered 1440px desktop and 390px mobile, visible focus, pointer
targets, non-color clues/states, and reduced-motion CSS.

## Known gaps and next steps

- Progress is intentionally device-local and can be lost if browser site data is
  cleared; there is no cross-device sync.
- The success metric cannot be measured automatically because the product ships
  without analytics or identifiers. Any validation should use opt-in research,
  not covert telemetry.
- Offline play begins after one successful online visit has cached the shell.
- The archive currently exposes the latest 21 eligible dates. Puzzle generation
  supports any valid earlier date, so expanding the visible range is a small UI
  change if players ask for it.
