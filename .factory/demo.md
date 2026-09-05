# Demo sandbox

## Entry point

- Live: <https://hex-daily-notebook.sociobot.in/demo>
- Local after `npm run dev`: <http://localhost:5173/demo>
- Home action: **Try it with sample data**

The demo opens in one click and needs no account or setup.

## Sample data

The fixed 14 August 2026 puzzle starts in progress with:

- three correct filled cells;
- two × notes on excluded cells;
- one freehand pencil line;
- 2 minutes and 52 seconds on the timer.

The board, checks, completion, copied result, keyboard controls, touch controls,
pencil tool, and eraser are the real product paths.

## Isolation and reset

Demo state uses `sessionStorage` under `demo:hex-notebook:v1:2026-08-14`.
Daily puzzles use `localStorage` under `hex-notebook:v1:<date>`. Demo mode never
reads or writes the daily namespace.

**Reset demo** removes the demo key and seeds the original sample again.
**Start for real** removes every `demo:hex-notebook:v1:` key and opens today’s
puzzle. Reloading the demo in the same tab restores demo progress. Closing the
tab lets the browser discard that session state.

## Claim verification

Each command in `.factory/claims.json` starts from `/demo` in a fresh browser
context. The isolation check plants sentinel daily data, changes and resets the
sample, then proves the sentinel stayed unchanged and no data request occurred.
