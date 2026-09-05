# Review 1 — solve a daily hex deduction puzzle

**Verdict: FAIL**

- Work order: `hex-daily-notebook-review-1`
- Live URL: <https://hex-daily-notebook.sociobot.in>
- Reviewed: 2026-09-05 UTC
- Implementation candidate: `547ad634264f601b771f640f3aff0d34389379fe`
- Documentation base: `90cab2f913bed8fef80a54d8f424e7311f9a1264`
- Findings: **7** — 2 high, 3 medium, 2 low
- Untested public claim families: **16**

The live product matches the last implementation candidate byte for byte. Later
commits only changed reports and handoff text, so a newer product image is not
expected. The normal puzzle path works well, but this review cannot pass while
any finding or untested claim remains.

## First screen before scrolling

- Job: solve one daily hex deduction puzzle by shading seven connected cells
  from numbered neighbor clues.
- Audience: the first screen does not name the intended player. The brief names
  people who prefer pen-like marks and spatial grids to word games.
- First action: no primary sample action is offered. Fill is selected, but a
  player must infer that they should move to the grid and mark a cell. On the
  390 px phone screen, the first grid cell is below the initial viewport.

The visible heading is “Find the hidden ink trace.” This describes the task
indirectly, but “ink trace” is metaphorical and does not meet the supplied
plain-words contract. The supporting sentence explains the rules and local
storage, not who the product is for. There are no three separate facts for
privacy, offline use, and price.

## Findings

### R1 — High — The required one-click demo sandbox does not exist

There is no “Try it with sample data” action on the first screen. `/demo`
returns the app shell with HTTP 200 but renders the product's error screen:
“That sheet is not on the desk.” The repository has no `.factory/demo.md` and
the code has no demo storage namespace.

No realistic populated sample, persistent “Demo — sample data, nothing is
saved” label, **Reset demo**, or **Start for real** action exists. Therefore the
required sample journey and its separation from real data cannot be exercised.
All review actions ran in new, empty browser contexts and did not touch a real
user's storage.

Required fix: add `/demo` or `?demo=1`, seed a realistic solved-in-progress
sheet in a separate `demo:` namespace, keep the demo label visible, and provide
reset and exit actions.

### R2 — High — The claims registry and claim tests are absent

`.factory/claims.json` does not exist and the repository contains no
`@claim:<id>` test tags. There were therefore no declared claim commands to
run. Existing tests and this review's manual checks do not replace the required
one-command-per-claim demo tests.

Sixteen public claim families are unlisted and untested under the claims
contract:

| # | Public claim family | Public source |
| --- | --- | --- |
| 1 | The puzzle is free and needs no purchase | README, Terms |
| 2 | Each date creates the same deterministic puzzle | README |
| 3 | Each puzzle is original, fresh, and has one solution | README, `UNIQUE ✓` stamp |
| 4 | Exactly seven connected cells and the pins define the answer | Live rules |
| 5 | The pencil layer draws and erases freehand notes | README, live tool copy |
| 6 | × notes do not count as filled answers | README, live rules |
| 7 | Keyboard play reaches all six neighbors and supports shortcuts | README, live instructions |
| 8 | Touch play works | README |
| 9 | The archive releases puzzles after seven days | README, live archive copy |
| 10 | The timer and progress persist locally | README, Privacy |
| 11 | Result copying is spoiler-free | README, Terms |
| 12 | The app works offline after it is cached | README, Privacy, offline banner |
| 13 | No account is needed | README, Privacy, Terms |
| 14 | There are no ads, analytics, cookies, or tracking pixels | Privacy |
| 15 | No third-party scripts, fonts, or services are embedded | Privacy |
| 16 | Marks and play history never leave the device | Live footer, README, Privacy |

Some of these behaviors passed independent checks, but all 16 remain untested
claims because none has the required manifest entry and isolated demo test.

Required fix: add `.factory/claims.json`; give every retained claim exactly one
tagged observable test that starts from the demo; split or remove any claim
that cannot be proved.

### R3 — Medium — Impossible saved states still lock or corrupt a puzzle

Earlier finding `VER3-01` remains open on the live deployment.

Two fresh contexts loaded type-valid but logically impossible state for
`2026-08-14`:

1. Nineteen blank marks with `completed: true` displayed the completion panel,
   disabled **Check trace**, and announced that the drawing was complete.
   The storage warning stayed hidden.
2. A filled mark on clue cell 3 rendered that fixed clue as filled. It counted
   as `1 / 7`, could not be cycled away, had no undo record, and produced no
   warning.

The app validates field types but never reconciles loaded marks and completion
with the selected puzzle. Recovery still requires clearing site data outside
the product.

Required fix: clear marks on clue cells, accept `completed: true` only when the
stored filled mask solves the current puzzle, announce repairs, and add live
browser regressions for both cases.

### R4 — Medium — The first screen and copy do not meet the plain-words contract

The first screen lacks the named audience, the required one-click sample
action, the next-step explanation, and the three short privacy/offline/price
facts. Its heading uses the metaphor “hidden ink trace.” Other copy also uses
metaphorical or mood headings, including “Think on the sheet,” “Read the
drawing,” and “That sheet is not on the desk.” The last phrase makes invalid
date and route recovery less direct than needed.

The live home title is `Today’s puzzle — Hex Daily Notebook`, not the required
`Product name — what it does` order. `.factory/copy-audit.md` is also missing,
so the required word-count and banned-word audit has not been supplied.

Required fix: name the job in the heading, state the audience, present the demo
as the primary action, add the three facts, replace metaphorical interface
copy, use the required title form, and add the copy audit.

### R5 — Medium — Required site structure and metadata are incomplete

The landing page has the live product but no three-step **How it works**
section and no clear “what it does not do / privacy” section. The header has no
Demo or Privacy link. The footer omits “Built by Param Factory” and a build ID.
Navigation performs full page loads and has no route-change heading focus or
announcement implementation.

`index.html` lacks a canonical link, Open Graph fields, Twitter card fields, a
1200×630 social image, and a 180 px Apple touch icon. The sitemap lists only
home, Privacy, and Terms. These gaps are required by the supplied site
structure contract.

Required fix: complete the standard information order, route navigation and
focus behavior, footer details, metadata, icons, social image, and sitemap.

### R6 — Low — Unknown routes render an error page with HTTP 200

`/not-a-real-route` renders a styled recovery page with one heading, one main
landmark, and a link home, but the server response is HTTP 200. There is no
real `/404` page or `responseOverrides.404` entry. A deliberate HTTP 404 is
expected here and would not itself be a defect.

Required fix: add the designed 404 file/route and configure Azure Static Web
Apps to return status 404 for unknown paths.

### R7 — Low — The AVIF response still has the wrong media type

Earlier finding `VER3-02` remains open. The live
`/assets/blueprint-still-life.avif` returns `Content-Type:
application/octet-stream` instead of `image/avif`. Chromium displays it and the
WebP fallback works, so the tested journey is not blocked.

Required fix: add `.avif: image/avif` to the static host MIME map.

## Claim-command result

`.factory/claims.json` is missing, so the repository declares zero claim
commands. This is not a pass or a claim-free product: the live pages and README
make the 16 claim families listed in R2. All 16 are recorded as untested.

## Clean checkout commands

Tests ran in a separate detached checkout at documentation SHA
`90cab2f913bed8fef80a54d8f424e7311f9a1264`. No product files were changed.
Node was 22.23.2 and npm was 10.9.8.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm install` | PASS | Lockfile install completed; 0 vulnerabilities |
| `npm ci` | PASS | 374 packages installed; 0 vulnerabilities |
| `npm test` | PASS | 13/13 tests across 3 files |
| `npm run build` | PASS | TypeScript check and Vite build; `dist/index.html` produced |
| `npm run test:e2e` | PASS | 22/22 tests across desktop and 390×844 phone projects |
| `npm audit` | PASS | 0 vulnerabilities |
| `npm audit --omit=dev` | PASS | 0 vulnerabilities |
| `npm run dev -- --host 127.0.0.1` | PASS | Server started; root returned HTTP 200 |
| Claim commands | FAIL | Claims file absent; 16 public claim families untested |

No lint command or lint configuration is declared.

## Live normal, boundary, invalid, and recovery paths

Fresh Chromium contexts were used at 1440×1000 and phone-sized 390×844.

- Both viewports loaded 19 cells with no console, page, or request errors.
- Blank → filled → × marking, undo, all six neighbor moves, mode shortcuts,
  pencil drawing, erasing, and storage persistence worked.
- A zero/one-filled check reported the exact required count and stayed editable.
- The exact seven-cell solution for `2026-08-14` completed and remained complete
  after reload on desktop and phone.
- Archive opened with 21 dates. Dialog focus entered the close button; Escape
  closed it and returned focus to **Archive**.
- The 2026-09-05 boundary was correct: 2026-08-29 opened, while 2026-08-30 was
  still sealed. Future, invalid leap-day, malformed-date, and unknown-route
  screens all provided a way home without browser errors.
- Quota-denied writes displayed a persistent save warning and did not claim the
  mark was saved. Malformed stroke data was repaired and announced.
- The impossible cross-field states in R3 did not recover.

## Accessibility, keyboard, and mobile

- `/opt/fleet/lib/verify-url.sh` passed title, language, one heading, main
  landmark, image alternatives, labelled buttons, and console checks.
- `npx @axe-core/cli` with a matching Chromium/driver found 0 violations.
- Independent live axe scans found 0 WCAG A/AA violations in both viewports.
- The first Tab focused **Skip to puzzle** with a visible 3 px brass outline.
- Live keyboard checks reached all six direct hex neighbors. Space, shortcuts,
  undo, dialog Escape, and focus restoration worked with no trap.
- Every visible interactive target measured at least 44×44 CSS px. Neither
  viewport had horizontal overflow.
- Reduced-motion emulation matched the media query, reduced transitions to
  `0.00001s`, and changed scrolling to `auto`.
- The single dark treatment is intentional in `.factory/design.md`; non-color
  hatching, × shapes, labels, and clue numbers carry state.

Automated accessibility tools cannot prove the whole experience. The copy and
structure issues in R4 and R5 remain manual accessibility/usability findings.

## Privacy, offline, update, links, and response policy

- A cold load and complete solve journey requested only
  `https://hex-daily-notebook.sociobot.in`; no cookie was set.
- Fresh storage began empty. Normal play created only
  `hex-notebook:v1:2026-08-14` in its isolated review context.
- The worker installed, activated, controlled the page, and completed
  `registration.update()` with no waiting worker.
- A dedicated phone context reloaded offline with 19 cells, saved progress, and
  the visible offline banner. It had no console or page error.
- Home, Privacy, Terms, an archived date, robots, sitemap, manifest, worker,
  favicon, icon, AVIF, and WebP links all returned 200. The Privacy contact is
  an explicit `mailto:` link.
- Live headers include HSTS, no-referrer, nosniff, denied sensitive permissions,
  `X-Frame-Options: DENY`, and a self-only CSP with `frame-ancestors 'none'`.
- Hashed JS/CSS/Workbox assets receive one-year immutable caching; `sw.js`
  receives `no-cache`.

The no-tracking and local-only observations do not close R2 because those
public promises still lack declared demo-based claim tests.

## Performance and build size

Lighthouse 13.4.1, live simulated mobile:

| Measure | Result |
| --- | --- |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| First contentful paint | 1.0 s |
| Largest contentful paint | 1.1 s |
| Total blocking time | 40 ms |
| Cumulative layout shift | 0 |
| Transfer | 40 KiB |

Uncompressed production sizes remain within the supplied budgets: initial app
JS plus registration helper is 31,574 bytes, CSS is 11,467 bytes, fonts are 0
bytes, AVIF is 21,743 bytes, and WebP is 45,184 bytes.

## Deployment identity

The clean build and live deployment match:

| File | SHA-256 |
| --- | --- |
| `index.html` | `81f6dab87a3a56787912fd074a5cfbc3b5ff8d6658b05072c67cda2478d27784` |
| app JavaScript | `ad188c807473120db04b3603dbf7f2e4f82d85565e46725402cac17f1cfd19ee` |
| app CSS | `2b52d5332e98dc65ddccf51fac96463838feaea8a5a0a0b2c7fc9dd5984fb50c` |
| service worker | `fc9a89ac92f2b0eddc08c017333f9220f4290b5bdb9b931d92bf3c5542e5cd4a` |
| AVIF | `a6e753b0f20f6166afff7c4de885cf2fe9ac29c5fde0e5728ab7ba9ac7d70166` |

`git diff 547ad634..90cab2f -- . ':(exclude).factory/**'` is empty.
Therefore `547ad634…` is the implementation candidate and `90cab2f9…` is the
documentation state reviewed.

## Earlier finding disposition

| Earlier finding | Current disposition | Current evidence |
| --- | --- | --- |
| VER-01 save failures and malformed fields | RESOLVED | Live quota warning; malformed stroke repair; regression suite passes |
| VER-02 hashed assets not immutable | RESOLVED | Live one-year immutable headers on hashed code assets |
| VER-03 dependency audit | RESOLVED | Both audits report 0 vulnerabilities |
| VER-04 targets below 44 px | RESOLVED | No undersized visible target in either live viewport |
| VER-05 1,200-stroke truncation | RESOLVED | Repository browser regression loads 1,201 strokes in both projects |
| VER-06 repeated daily puzzles | RESOLVED | 2026 test proves 365 target masks and 365 signatures |
| VER-07 missing CSP/frame policy | RESOLVED | Live CSP, `frame-ancestors`, and `X-Frame-Options` present |
| VER-08 four-neighbor keyboard map | RESOLVED | Six direct moves pass live and in both local projects |
| VER3-01 impossible saved states | **OPEN** | Reproduced twice on live; see R3 |
| VER3-02 AVIF media type | **OPEN** | Live response remains `application/octet-stream`; see R7 |

## Product-scope and AI check

This is a static, local-first PWA. Backend tenant, SQLite restart, health, rate
limit, CLI, package-consumer, and desktop-install checks do not apply. A normal
player does not need an AI, import, export, or sync step to solve this brief's
deterministic daily puzzle. No missed AI leverage finding is raised.

## Release decision

**FAIL. Do not approve this product.** Resolve all seven findings and add tests
for all 16 retained public claim families. A later review must begin from the
demo sandbox, run every claim command, reproduce both saved-state repairs, and
confirm a real HTTP 404 before it can declare PASS.
