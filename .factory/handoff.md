# Hex Daily Notebook — verification 4 handoff

- Work order: `hex-daily-notebook-verify-4`
- Live URL: <https://hex-daily-notebook.sociobot.in>
- Demo URL: <https://hex-daily-notebook.sociobot.in/demo>
- Implementation reviewed: `f6987b189112fa72f5d6a6711c41625bbedf3420`
- Documentation reviewed: `4476685f56d517d2b540dea75be21a4546e35719`
- Result: **FAIL — 1 low finding; 0 untested public claims**

## Outcome

The home page now names the job and audience before scrolling. Its primary
action opens a populated sample in one click. The sample uses a separate
`demo:` session-storage namespace, keeps a visible demo label, resets to a
known state, and leaves daily puzzle data unchanged.

Saved state is now reconciled with the selected puzzle. Marks on fixed clue
cells are cleared. A completion flag is accepted only when the filled mask is
the puzzle’s actual solution. Both repairs are announced and written back.

The product now has the standard Home, Demo, Privacy, and Terms structure,
client-side route titles and focus, three-step instructions, a clear privacy
section, complete social metadata, a 1200×630 social image, a 180px touch icon,
and a designed HTTP 404. Azure now serves AVIF as `image/avif`.

## Review finding disposition

| Finding | Disposition | Evidence |
| --- | --- | --- |
| R1 missing demo sandbox | Resolved | One-click `/demo`; 3 filled cells, 2 crosses, 1 pencil line; persistent label; reset and exit; isolated session key |
| R2 missing claim registry | Resolved | 18 entries in `.factory/claims.json`; every declared command passed from a clean checkout |
| R3 impossible saved states | Resolved | Unit and browser regressions repair false completion and clue-cell marks |
| R4 first screen and copy | Resolved | Job, audience, action, next step, and three facts appear before scrolling; `.factory/copy-audit.md` passes |
| R5 structure and metadata | Resolved | Required sections, SPA focus, route titles, footer, canonical, social fields, sitemap, and icons are present |
| R6 unknown routes return 200 | Resolved | Live unknown route returns HTTP 404 with the designed recovery page |
| R7 AVIF media type | Resolved | Live AVIF response is `image/avif` |

Earlier findings remain resolved: failed saves stay visible, malformed strokes
recover, 1,201 strokes load, 2026 puzzles do not repeat, six-neighbor keyboard
movement works, dependencies audit cleanly, hashed code assets are immutable,
and CSP plus frame denial remain active. Verification 4 found the mobile brand
home link is 28×44 px; see the current known gap below.

## Clean verification

Final clean checkout: `f6987b189112fa72f5d6a6711c41625bbedf3420`.

| Check | Result |
| --- | --- |
| `npm ci` | Pass — 374 packages, 0 vulnerabilities |
| `npm test` | Pass — 18/18 unit, storage, config, and registry tests |
| `npm run build` | Pass — `dist/index.html`, 14 precache entries |
| Every command in `.factory/claims.json` | Pass — 18/18 from separate fresh browser runs |
| `npm run test:e2e` | Pass — 56 passed, 2 intentional cross-project skips |
| `npm audit` and `npm audit --omit=dev` | Pass — 0 vulnerabilities |
| Playwright axe integration | Pass — 0 serious or critical issues on Home, Demo, Privacy, and Terms in both viewports |
| Factory `verify-url.sh` | Pass on live Home and Demo; no console or page errors |

Production output is 32.54 KB JavaScript and 13.46 KB CSS before compression.
It uses no web fonts. The largest image used in the page is 45.18 KB WebP;
the AVIF is 21.74 KB.

Live Lighthouse 13.0.1, simulated mobile:

- Performance 100
- Accessibility 100
- Best practices 100
- SEO 100
- FCP 1.0 s
- LCP 1.1 s
- Total blocking time 80 ms
- CLS 0

Lighthouse does not provide a lab INP value. Interactive browser tests complete
cell marking without a timeout or blocked main-thread symptom.

## Live verification

Fresh desktop and 390×844 phone contexts both showed the job, audience, and
sample action before scrolling. Each entered the demo with 3 filled cells,
2 crosses, 1 pencil line, the sample label, and no daily storage keys. The
label stayed at the top after scrolling, and reset restored the original
sample.

The live sample solved and copied a three-line result without answer data. A
fresh corrupted save repaired to zero filled clue cells with **Check puzzle**
enabled. The seven-day archive boundary opened correctly; the six-day date was
unavailable. The service worker installed, controlled a fresh phone context,
and reloaded the populated demo offline. All recorded requests stayed on the
product origin, and no cookies or browser errors appeared.

Live response checks:

- `/`, `/demo`, `/privacy`, and `/terms`: HTTP 200
- `/not-a-real-route`: HTTP 404 with title, one `<h1>`, `<main>`, and home link
- AVIF: HTTP 200, `Content-Type: image/avif`
- Hashed JS and CSS: one-year immutable cache policy
- HTML: revalidate policy
- CSP, frame denial, no-referrer, nosniff, and denied device permissions: present
- Local and live hashes match for HTML, JS, CSS, and service worker

## Current verification 4 result and next step

Verification 4 independently reran all 18 claim commands from a clean checkout
and they all passed. `npm test`, `npm run build`, both audits, and the full
browser suite also passed (56 passed, 2 intentional skips). Fresh desktop and
phone live checks confirmed the demo, reset, storage isolation, recovery,
privacy, offline, routing, headers, and AVIF behavior. The deployed files match
the reviewed implementation byte-for-byte.

**One low finding remains.** At a 390 px phone viewport the mobile header home
link is only 28×44 CSS px because its text label is hidden. The test currently
asserts only target height, so it misses this width failure. Make the link at
least 44 px wide, assert both dimensions in the mobile test, then rerun the
focused target test, all claim commands, and the complete browser suite.

Full evidence and the disposition of every earlier review and verification
finding are in `.factory/verification-4.md`. Do not declare PASS until the
mobile target defect is repaired and the finding count is zero.
