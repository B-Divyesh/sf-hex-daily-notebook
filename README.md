# Hex Daily Notebook

Solve one free hex deduction puzzle each day. It is for people who prefer
spatial grids and pencil marks to another word game.

Each date creates the same 19-cell puzzle with one solution. Fill
seven connected cells that satisfy every numbered neighbor clue. Crosses do
not count as filled answers. Pencil mode draws and erases freehand notes.

Keyboard controls reach all six neighboring cells and operate every puzzle
tool. Touch input also works. Archive puzzles become available after seven
days. Puzzle marks and elapsed time persist in browser storage. A completed
result can be copied without including the answer.

No account or purchase is required. The app has no ads, analytics, cookies,
tracking pixels, third-party scripts, fonts, or services. Puzzle marks do not
leave the browser. The app works offline after the first visit.

- Live product: <https://hex-daily-notebook.sociobot.in>
- Isolated sample: <https://hex-daily-notebook.sociobot.in/demo>

## Try the sample

Open `/demo` or select **Try it with sample data** on the home page. It starts
with three filled cells, two crosses, one pencil line, and an active timer.

Demo state uses session storage keys beginning with
`demo:hex-notebook:v1:`. Daily puzzle state uses local storage keys beginning
with `hex-notebook:v1:`. **Reset demo** restores the sample. **Start for real**
removes demo state and opens today’s puzzle. Demo actions do not read or change
daily puzzle data.

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Vite prints the local address. Daily puzzles use the visitor’s local calendar
date. An archived date opens at `/?day=YYYY-MM-DD` after seven days.

## Test and build

```sh
npm test
npm run build
npm run test:e2e
npm run test:claims
```

`.factory/claims.json` lists every public claim and its clean demo command.
The claim suite checks observable browser outcomes. It covers demo isolation,
solving, drawing, input methods, persistence, offline reloads, and network
privacy.

The production build command is `npm run build`. Static output is written to
`dist/`, with `dist/index.html` at its root. Preview it with `npm run preview`.

## Project files

- Puzzle generation and solving: `src/puzzle.ts`
- Interface, routing, and browser storage: `src/main.ts`
- State validation and repair: `src/storage.ts`
- Visual system and asset provenance: `.factory/design.md`
- Demo contract: `.factory/demo.md`
- Verification handoff: `.factory/handoff.md`
- Privacy: `/privacy`
- Terms: `/terms`

The generated editorial image is original to this product. Its source and
prompt are in `assets/src/`. The repository uses the MIT License.
