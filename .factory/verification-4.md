# Independent verification 4 — solve a daily hex deduction puzzle

- Work order: `hex-daily-notebook-verify-4`
- Live URL: <https://hex-daily-notebook.sociobot.in>
- Implementation candidate reviewed: `f6987b189112fa72f5d6a6711c41625bbedf3420`
- Documentation SHA: `4476685f56d517d2b540dea75be21a4546e35719`
- Verified: 5 September 2026 UTC
- Product type: static, local-first PWA
- Verdict: **FAIL — 1 low finding, 0 untested public claims**

## First screen, before scrolling

- Job: **Solve a daily hex deduction puzzle.**
- Audience: people who prefer spatial grids and pencil marks to another word game.
- First action: **Try it with sample data**. It opens a partly solved sample and leaves today’s puzzle unchanged.

Fresh 1440×1000 desktop and 390×844 touch-phone browser contexts both showed the heading, audience, primary action, and the three facts before scrolling. There were no console or page errors and no horizontal overflow.

## Finding

### V4-01 — Low — The mobile wordmark home link is too narrow to meet the 44 px touch-target requirement

At the 390 px phone viewport, the header home link (`.brand`) measures **28×44 CSS px**. The mobile rule hides its text (`.brand span { display: none; }`), leaving only the 28 px icon as the link hit area. It remains keyboard reachable and the other checked controls work, but this is below the supplied 44×44 px baseline.

The full browser suite missed the defect because its target-size regression asserts only `box.height >= 44`; it does not assert width. A direct run of that existing mobile test passes despite the measured 28 px width.

Repair: make the mobile brand link at least 44 px wide (for example, retain a 44 px inline minimum or horizontal padding) and assert both width and height in the mobile regression test.

## Clean implementation checkout

A new detached clone at `f6987b1` was used. It remained clean after testing.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ci` | Pass | 374 packages installed; audit reported 0 vulnerabilities |
| `npm test` | Pass | 18/18 tests |
| `npm run build` | Pass | `dist/index.html`; 14-item PWA precache |
| `npm audit` | Pass | 0 vulnerabilities |
| `npm audit --omit=dev` | Pass | 0 vulnerabilities |
| `npm run test:e2e` | Pass | 56 passed, 2 intentional project skips |
| Target-size test in mobile project | Pass, but incomplete | Checks height only; independent measurement found V4-01 |

The build emitted 32.54 KB uncompressed application JavaScript and 13.46 KB CSS. No network fonts are used.

## Public-claim commands

All 18 commands declared in `.factory/claims.json` were run individually from that clean checkout. Every command passed; **untested public claims: 0**.

| Claim ID | Result |
| --- | --- |
| `demo-sandbox` | Pass |
| `free-access` | Pass |
| `deterministic-date` | Pass |
| `unique-solution` | Pass |
| `fresh-daily` | Pass |
| `seven-connected-clues` | Pass |
| `pencil-layer` | Pass |
| `cross-not-answer` | Pass |
| `keyboard-six` | Pass |
| `touch-play` | Pass |
| `archive-delay` | Pass |
| `local-progress` | Pass |
| `spoiler-free-copy` | Pass |
| `offline-reload` | Pass |
| `no-account` | Pass |
| `no-tracking` | Pass |
| `first-party-only` | Pass |
| `local-only-data` | Pass |

## Live product exercise

Fresh desktop and phone contexts entered the sample in one click. It showed three filled cells, two × notes, and one pencil line. The brass demo label remained sticky after scrolling. **Reset demo** restored three filled cells. A preloaded real-data sentinel remained unchanged while sample data used only the `demo:` session-storage namespace; leaving demo removed that demo key. The same journey made requests only to the product origin and set no cookies.

The live puzzle accepted normal cell marking, touch input, pencil/eraser, keyboard diagonal movement, and the released seven-day archive boundary (21 links; the first was exactly today minus seven days). A forced storage write failure stayed visible, did not announce a successful mark, and reloaded with zero saved fills.

Recovery checks on live `2026-08-14` passed:

- A false `completed: true` save was repaired, enabled **Check puzzle**, and persisted `completed: false`.
- A filled fixed-clue cell was cleared and announced as repaired.
- Malformed pencil data repaired without a page error while retaining a valid fill.
- 1,201 valid pencil strokes rendered without truncation.

Invalid leap-day and future-date requests showed the designed unavailable screen. Direct HTTP `/not-a-real-route` returned **404**, `text/html`, a route title, one `<h1>`, one `<main>`, and a home link. `/privacy` and `/terms` each returned 200 with their own expected title and heading. The AVIF asset returned `image/avif`.

## Accessibility, privacy, offline, and deployment identity

`/opt/fleet/lib/verify-url.sh` passed on live Home and Demo: each had a title, `lang="en"`, one `<h1>`, a main landmark, no missing image alternatives, no unlabelled buttons, and no browser errors. The repository’s Playwright axe integration reported zero serious or critical WCAG A/AA issues on Home, Demo, Privacy, and Terms in both configured viewports. A direct live axe scan also found zero serious or critical issues on Home and Demo in both fresh viewports. V4-01 is the manual touch-target exception.

The service worker controlled a fresh phone context after caching. With the context offline, `/demo` reloaded its populated 19-cell sample and displayed the offline banner without console or page errors. Reduced-motion emulation set scrolling to `auto`; keyboard focus reached the diagonal hex neighbor and the skip link.

Live headers include a self-only CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `no-referrer`, `nosniff`, a restrictive permissions policy, and one-year immutable caching for the hashed JS and CSS. Local and live SHA-256 hashes match for `index.html`, app JS, app CSS, `sw.js`, Workbox, the manifest, and the AVIF. This proves the live runtime is the reviewed implementation rather than the later documentation-only commit.

## Earlier finding disposition

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| VER-01 save failures / malformed state | Resolved | Live quota warning and malformed-state repair |
| VER-02 immutable hashed assets | Resolved | Live one-year immutable JS/CSS headers |
| VER-03 dependency audit | Resolved | Both clean audits report 0 vulnerabilities |
| VER-04 undersized interactive controls | **Regressed in part — V4-01 open** | Phone brand link is 28×44 px |
| VER-05 1,200-stroke truncation | Resolved | Live rendered 1,201 strokes |
| VER-06 repeated daily puzzles | Resolved | Clean fresh-year claim test passed |
| VER-07 missing CSP/frame defense | Resolved | Live CSP and frame denial headers |
| VER-08 only four hex neighbors | Resolved | Live diagonal keyboard move worked |
| VER3-01 impossible saved state | Resolved | Both false completion and clue mark repair live |
| VER3-02 AVIF MIME type | Resolved | Live `image/avif` response |
| R1 demo sandbox | Resolved | One-click populated, isolated, resettable demo |
| R2 claim registry | Resolved | 18/18 declared commands passed |
| R3 invalid saved states | Resolved | Live recovery checks passed |
| R4 first-screen plain words | Resolved | Job, audience, first action, facts, and copy audit present |
| R5 site structure / metadata | Resolved | Routes, titles, focus, legal pages, metadata, sitemap, footer |
| R6 HTTP 404 | Resolved | Direct unknown route returned HTTP 404 |
| R7 AVIF MIME type | Resolved | Live `image/avif` response |

## Decision

**FAIL. Do not approve the current product image.** The single remaining low-severity target-size defect must be repaired and verified with a width and height assertion before a PASS can be declared. No backend, tenant isolation, SQLite persistence, health endpoint, rate limit, CLI, library, desktop, or AI feature check applies to this static local-first web product.
