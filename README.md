# Hex Daily Notebook

A calm, free daily spatial-deduction puzzle for people who would rather reason
with a hex grid and pencil marks than play another word game. Each date creates
the same original 19-cell puzzle, verifies that it has one solution, and asks
the player to find a connected seven-cell trace from numbered neighbor clues.

The app includes freehand pencil/eraser tools, explicit × notes, keyboard and
touch play, a seven-day-delayed archive, a local timer, spoiler-free result
copying, and an offline PWA shell. There is no account, analytics, or network
storage: progress and scratch marks remain in browser local storage.

Live: <https://hex-daily-notebook.sociobot.in>

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Vite prints the local development address. Daily puzzles use the visitor's
local calendar date. An archived date can be opened with
`/?day=YYYY-MM-DD` once it is at least seven days old.

## Test and build

```sh
npm test
npm run build
npm run test:e2e
```

`npm test` verifies deterministic generation, connected traces, strict date
handling, and unique solutions across a sample month. The browser suite uses
Playwright 1.58.2 for desktop and 390px mobile interaction, persistence,
completion, console, and axe accessibility checks.

The exact production build command is `npm run build`. Static output lands in
`dist/` with `dist/index.html` at its root. Preview it with `npm run preview`.
`public/staticwebapp.config.json` supplies Azure Static Web Apps navigation
fallback and security headers.

## Product notes

- Puzzle generation and solving logic: `src/puzzle.ts`
- Interface and local persistence: `src/main.ts`
- Visual system and asset provenance: `.factory/design.md`
- Build verification and known gaps: `.factory/handoff.md`
- Privacy policy: `/privacy`; terms: `/terms`

The generated editorial image is original to this product; source and prompt
provenance are kept in `assets/src/`. The repository is MIT licensed.
