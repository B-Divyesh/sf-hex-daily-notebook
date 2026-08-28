# Independent product verification — FAIL

- Work order: `hex-daily-notebook-verify-2`
- Tested candidate: `35ec57899f22b6778ecf59d7e6c900e9a19ecf2a`
- Tested deployment: <https://hex-daily-notebook.sociobot.in>
- Verification date: 2026-08-28 UTC
- Artifact: static PWA
- Result: **FAIL**

The core puzzle is usable and the deployed files exactly match the candidate,
but the candidate does not meet the complete acceptance contract. In
particular, failure of the browser's local store is reported as a successful
mark and work is then lost on reload. Malformed stored strokes also raise an
uncaught page error. This is a release-blocking gap for a product whose core
privacy promise and progress model are local-first.

## Severity summary

- Critical: 0
- High: 0
- Medium: 3
- Low: 5

## Defects

### VER-01 — Medium — Local-save failures are hidden and malformed saves are not recovered

The UI catches `localStorage.setItem`, but the caller immediately replaces the
error announcement with a success announcement. With `Storage.setItem`
throwing `QuotaExceededError`, clicking an editable cell displayed `Cell 1
filled.`. Reloading returned the puzzle to 0 filled cells. The player is told
the action succeeded even though their work is not durable.

A saved state with valid JSON and `strokes: ["bad"]` produced the uncaught live
page error `l.map is not a function`. Stored marks are validated, but stroke and
point shapes are only cast. The pencil/eraser path remains broken until the
user manually clears site data, and no recovery guidance appears.

This violates the error/recovery and local-first acceptance requirements and
contradicts the handoff's claim of explicit storage-error feedback.

### VER-02 — Medium — Hashed production assets are not cached immutably

The live HTML, hashed JS, hashed CSS, and service worker all return:

```text
cache-control: public, must-revalidate, max-age=30
```

For example, `/assets/index-BYASEmP2.js` is content-hashed but revalidates after
30 seconds instead of receiving a long-lived `immutable` policy. The PWA cache
reduces the practical repeat-load cost after installation, but the deployment
still fails the explicit static-product cache policy.

### VER-03 — Medium — The development/test dependency audit fails

`npm audit` exits 1 with 3 affected packages: 1 moderate, 1 high, and 1
critical. Direct dependencies include Vite 6.1.0 (multiple development-server
file-read/path traversal advisories) and Vitest 3.0.7 (critical arbitrary file
read/execution advisory when its UI server is exposed). Non-major fixes are
available. `npm audit --omit=dev` passes with 0 vulnerabilities, so these do not
ship in the static runtime, but they remain a build/developer safety defect.

### VER-04 — Low — Several interactive targets are below 44 px

At 390 px, the brand link measured 153×35 px and the Privacy and Terms links
measured 47×20 and 38×20 px. Desktop has the same 28 px-high brand and 20
px-high legal links. Primary controls and grid cells meet the target size, but
these links do not meet the supplied 44×44 CSS pixel baseline.

### VER-05 — Low — The pencil layer silently truncates above 1,200 strokes

Loading a valid state with 1,201 one-point strokes loaded and rendered only
1,200 because `readState` slices the stored array. There is no warning. This is
a remote boundary for ordinary play, but it contradicts the brief's
"unlimited local pencil layer" requirement.

### VER-06 — Low — Some dates repeat an earlier daily puzzle exactly

A deterministic sweep of all 365 dates in 2026 found 361 distinct complete
puzzles. Exact repeats were:

- 2026-07-29 / 2026-10-04
- 2026-05-09 / 2026-10-07
- 2026-02-21 / 2026-11-12
- 2026-11-10 / 2026-12-12

Every repeated puzzle is still uniquely solvable. The defect is limited to the
"fresh daily challenge" expectation, not solution correctness.

### VER-07 — Low — Clickjacking/content-injection response policies are absent

HTTPS redirects correctly and live responses include HSTS,
`Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and a narrow
Permissions Policy. They do not include a Content Security Policy or either
`frame-ancestors`/`X-Frame-Options`. The static, account-free product has low
exposure, but local puzzle data and interactive controls can be framed and the
app lacks a useful defense-in-depth policy.

### VER-08 — Low — Arrow navigation exposes only four of six direct neighbors

The visual thesis says arrow keys follow six-neighbor hex geometry. The key map
implements only axial left/right/up/down; the two diagonal neighbors require
multiple key presses. Every cell remains keyboard reachable and marking works,
so this is a specification discrepancy rather than a keyboard blocker.

## Clean checkout and local gates

The checkout was clean before testing. `HEAD` and freshly fetched
`origin/main` both resolved to the candidate hash.

Environment: Node 22.23.2, npm 10.9.8, Chromium 145 from the supplied
Playwright browser set.

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 372 packages installed from the lockfile |
| `npm test` | PASS | 3/3 Vitest tests |
| `npm run build` | PASS | TypeScript `--noEmit` and Vite production build |
| `npm run test:e2e` | PASS | 12/12 Playwright tests, desktop and 390×844 mobile |
| Lint | N/A | No lint script/configuration exists |
| `npm audit --omit=dev` | PASS | 0 production vulnerabilities |
| `npm audit` | FAIL | 1 moderate, 1 high, 1 critical development dependency |

The exact production build created `dist/` and a Workbox precache with 11
entries (106.11 KiB).

## Deployment identity

Fresh live downloads matched the local candidate build byte-for-byte:

| File | SHA-256 |
| --- | --- |
| `index.html` | `3b927c05bd5332e05a68bf4f28eae0d657f03761c539ec9b4f60f0b9ba4f4d06` |
| app JS | `13bc640074eb87d6f3bb57742c2c64cb2d3ad734b977fa74a9195b824bc68b49` |
| app CSS | `1c79af78d723091e94c42b8d728fdc474b733bf8b7d2e2fd9234278d206c507b` |
| `sw.js` | `e96722232240171f68b58ddbfbca626b5cb72093c77787e2b1c93660cd16b9be` |
| manifest | `b578ecede8b4973c6c6baa40497a5ad824178db7202c7cfde28f22ad5d498bd0` |

The root served HTTP 200 over HTTP/2; HTTP redirected to HTTPS with 301. The
live `last-modified` value was `Fri, 28 Aug 2026 02:49:35 GMT`, immediately
after the candidate commit time.

## Product exercise

Fresh live contexts were used for desktop 1440 px and mobile 390×844 checks.

- A 19-cell puzzle loaded with one `<h1>`, one `<main>`, valid title/lang, no
  horizontal overflow, and no console, page, or request errors.
- A full correct solution completed on desktop and mobile, persisted across
  reload, and copied a spoiler-free result containing only date, time, and URL.
- Pencil drawing, persistence, erasing, blank → filled → × cycling, undo, tool
  shortcuts, and clue-cell rejection worked. A viewport-visible mobile pencil
  gesture was separately verified after scrolling the board into view.
- Checking 0 filled cells reported the exact required count. Checking seven
  wrong cells produced a useful clue/connection error and remained editable.
- Empty clear-pencil and fixed-clue interactions gave immediate feedback.
- The 7-day boundary was correct on 2026-08-28: 2026-08-21 loaded; 2026-08-22
  was sealed. Future, invalid leap-day, invalid-format, and unknown-path cases
  all rendered recoverable error screens without page errors.
- The Archive dialog exposed 21 released dates; Privacy and Terms were
  reachable.
- A 365-day solver sweep confirmed 365/365 connected seven-cell targets with
  exactly one solution, 5–7 clues, and 323 distinct target masks.

## Accessibility and responsive behavior

- Repository axe checks passed locally in both configured viewports.
- Independent axe WCAG A/AA analysis of the live desktop and 390 px pages found
  0 violations, including 0 serious/critical findings.
- Lighthouse accessibility scored 100.
- Keyboard-only smoke test confirmed the visible skip link, designed 3 px
  focus outline, native dialog focus entry/escape/restoration, arrow movement,
  Space marking, mode shortcuts, undo, and no trap.
- Reduced-motion emulation changed relevant transition/animation durations to
  0.01 ms; completion code also switches smooth scrolling to `auto`.
- The mobile layout had zero horizontal overflow. A 640 px reflow proxy for
  200% zoom retained visible headings and controls with zero overflow. Zoom is
  not disabled.
- Non-color marks (hatching and ×), numeric clues, meaningful image alt text,
  landmarks, headings, and control names were present.
- See VER-04 for the target-size exception.

## Privacy, networking, and response policy

A cold live load with service workers blocked requested only the deployment
origin: HTML, app JS, app CSS, Workbox registration helper, and the generated
AVIF. No CDN font, analytics, tracking pixel, advertising, or third-party
request occurred. No cookie was set. Before play, local storage was empty;
after play, the only key was `hex-notebook:v1:2026-08-14`.

Live headers included Brotli content encoding for JS, HTTPS/HSTS,
`no-referrer`, `nosniff`, and denied camera/microphone/geolocation. See VER-07
for missing CSP/frame protections and VER-02 for cache policy.

## PWA and offline behavior

- The manifest was valid and linked; its name, colors, standalone display,
  scope, start URL, language, and SVG icon were present.
- The live service worker installed and activated, controlled the page after a
  reload, and `registration.update()` completed.
- The generated worker uses `skipWaiting()`, `clientsClaim()`, versioned
  precache revisions, outdated-cache cleanup, and a navigation fallback.
- With the browser forced offline, a 390 px reload restored the complete
  19-cell puzzle from `workbox-precache-v2-*`, displayed the Offline copy
  banner, and produced no console/page errors.

## Performance and budgets

Lighthouse 12.2.1, live URL, simulated mobile throttling:

| Metric | Result |
| --- | --- |
| Performance | 95 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1.1 s |
| LCP | 1.4 s |
| Total blocking time | 270 ms |
| CLS | 0 |
| Transfer | 38 KiB / 8 requests |

INP has no lab value in this no-field-data audit. A separate cell-mark
interaction measured through the Event Timing API under 4× CPU throttling took
80 ms, below the 200 ms interaction budget.

Built, uncompressed asset sizes all pass their budgets:

- Initial app JS + registration helper: 29,145 bytes (budget 200 KB)
- CSS: 10,903 bytes (budget 50 KB)
- Fonts: 0 bytes (budget 120 KB)
- AVIF illustration: 21,743 bytes; WebP fallback: 45,184 bytes (budget 300 KB)

## Release recommendation

Do not approve this candidate. Fix VER-01 first and add regression coverage for
quota-denied storage and malformed stored-state shapes. Update the deployment
cache policy and non-production dependency versions, then rerun the complete
verification suite. The low-severity items should be resolved in the same
follow-up where practical.
