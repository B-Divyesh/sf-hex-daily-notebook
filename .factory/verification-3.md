# Independent product verification — FAIL

- Work order: `hex-daily-notebook-verify-3`
- Candidate: `2fca18535f82dc0ae45b75079e487b14e1c4d745`
- Deployment: <https://hex-daily-notebook.sociobot.in>
- Verified: 2026-08-28 UTC
- Artifact: static PWA
- Result: **FAIL**

The live deployment matches the candidate and the normal product journey is
strong. All repository gates, accessibility checks, performance budgets,
privacy checks, service-worker checks, and desktop/mobile solve journeys pass.
The candidate nevertheless misses the required invalid-state recovery path:
stored values are type-checked but not checked against puzzle invariants. A
plausibly damaged local save can therefore permanently lock one daily sheet
until the player knows to clear site data.

## Severity summary

- Critical: 0
- High: 0
- Medium: 1
- Low: 1

## Defects

### VER3-01 — Medium — Logically impossible saves are accepted and can lock a sheet

`decodeState` validates the shapes and primitive types of `marks` and
`completed`, but the loaded state is not reconciled with the selected puzzle.
Two fresh live reproductions on `2026-08-14` demonstrate the failure:

1. Preload the local key `hex-notebook:v1:2026-08-14` with 19 zero marks,
   empty strokes, zero elapsed time, and `completed: true`. The page announces
   `This drawing is complete`, displays the completion panel, disables
   **Check trace**, and ignores editable-cell activation. It shows no storage
   warning even though zero cells are filled.
2. Preload the same key with valid primitive types but mark clue cell 3 as
   filled. The UI reports `1 / 7`; the clue is rendered filled, but selecting
   it correctly says a pin cannot be filled. Undo is disabled, checking fails,
   and no warning or in-product repair can remove that impossible mark.

The only recovery is clearing browser site data, which is not offered or
explained in either state. This is the same core local-save/recovery boundary
that the researched brief makes part of the product, and it contradicts the
handoff claim that every mark and completion flag is validated. A load-time
repair should clear marks on clue cells and accept `completed: true` only when
the filled mask is the current puzzle solution; it should announce any repair
and add browser regression coverage for both cases.

### VER3-02 — Low — The deployed AVIF has a generic response MIME type

`/assets/blueprint-still-life.avif` returns `Content-Type:
application/octet-stream` rather than `image/avif`. Chromium 145 decoded and
displayed the image, and the WebP fallback is present, so this did not break
the tested journey. Add an `.avif` MIME mapping to the static host
configuration for correct cross-browser/content-policy behavior.

## Clean checkout and repository gates

Testing ran from a detached, clean worktree at the exact candidate after a
fresh fetch. Both `HEAD` and `origin/main` resolved to the candidate. The
worktree remained clean after testing.

Environment: Node 22.23.2, npm 10.9.8, Playwright 1.58.2, Chromium 145.

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 374 packages installed from the lockfile; audit summary 0 vulnerabilities |
| `npm test` | PASS | 13/13 Vitest tests across 3 files |
| `npm run build` | PASS | Exact TypeScript `--noEmit` plus Vite production build |
| `npm run test:e2e` | PASS | 22/22 Playwright tests across desktop and 390×844 mobile |
| `npm audit` | PASS | 0 vulnerabilities |
| `npm audit --omit=dev` | PASS | 0 vulnerabilities |
| Lint | N/A | No lint script or lint configuration is present |

The production build generated `dist/` and a Workbox precache containing 11
entries (109.96 KiB). Package-consumer and backend concurrency checks are not
applicable to this private static-web product.

## Deployment identity and response policy

Fresh live downloads matched the clean local build byte-for-byte:

| File | SHA-256 |
| --- | --- |
| `index.html` | `81f6dab87a3a56787912fd074a5cfbc3b5ff8d6658b05072c67cda2478d27784` |
| app JS | `ad188c807473120db04b3603dbf7f2e4f82d85565e46725402cac17f1cfd19ee` |
| app CSS | `2b52d5332e98dc65ddccf51fac96463838feaea8a5a0a0b2c7fc9dd5984fb50c` |
| Workbox window helper | `cadd21be4a88598a4dec91a26a025df0a5790ff6baec54a884e401c3f5c95557` |
| `sw.js` | `fc9a89ac92f2b0eddc08c017333f9220f4290b5bdb9b931d92bf3c5542e5cd4a` |
| Workbox runtime | `04b086f1b2f4215ee4b659a7bc9c76162894abdb43fa876247bc7c0bd6fd1c37` |
| manifest | `b578ecede8b4973c6c6baa40497a5ad824178db7202c7cfde28f22ad5d498bd0` |

The live root returned HTTP/2 200 and HTTP redirected to HTTPS with 301.
`index.html` uses `max-age=0, must-revalidate`; all four hashed code assets use
one-year immutable caching; `sw.js` uses `no-cache`; compressed JS uses Brotli.
Responses include HSTS, `no-referrer`, `nosniff`, denied camera/microphone/
geolocation, `X-Frame-Options: DENY`, and a self-only CSP with
`frame-ancestors 'none'`. See VER3-02 for the AVIF MIME exception.

## End-to-end product exercise

Fresh live contexts at 1440×1000 and 390×844 covered the same complete flow:

- loaded a deterministic 19-cell archived puzzle with five clues and one
  independently enumerated connected seven-cell solution;
- cycled blank → filled → × by keyboard, undid, used all six hex-neighbor key
  movements, opened rules with `?`, drew and erased a pencil stroke, and
  restored ordinary progress after reload;
- rejected zero filled cells with the exact count, rejected an intentionally
  wrong seven-cell trace while keeping it editable, accepted the correct
  trace, persisted completion, and copied a three-line spoiler-free result;
- opened the 21-item archive, Privacy, and Terms; the native dialog moved focus
  inside, closed with Escape, restored focus to its opener, and trapped no
  keyboard focus;
- accepted the seven-day boundary `2026-08-21`, sealed `2026-08-22`, and gave
  useful recovery pages for a future date, invalid leap day, invalid format,
  and unknown path;
- recovered visibly from quota-denied writes after **Retry save**, repaired the
  earlier `strokes: ["bad"]` case without a page error, rendered 1,201 valid
  strokes, and showed guidance when storage reads were denied.

The last bullet confirms the earlier repair for malformed field shapes, but
VER3-01 demonstrates the unhandled cross-field/puzzle invariants.

## Accessibility, responsive behavior, and visual review

- Independent axe WCAG A/AA scans on live desktop and 390 px mobile found 0
  total violations and therefore 0 serious/critical findings.
- The factory `verify-url.sh` passed: title, `lang="en"`, one `h1`, one main
  landmark, complete image alternatives, labelled buttons, and no browser
  errors.
- Keyboard-only checks passed skip-link visibility, 3 px focus treatment,
  all six neighbor moves, Space marking, shortcuts, dialog focus management,
  undo, and absence of traps.
- Every visible link, button, summary, and grid button measured at least 44×44
  CSS px in both viewports. Mobile had zero horizontal overflow.
- At a 200% root text size on 390 px, the page retained the heading and primary
  action with zero horizontal overflow. Zoom is not disabled.
- Reduced-motion emulation matched the media query, changed transitions to
  `0.00001s`, and changed root scroll behavior to `auto`.
- Screenshots show the product-specific blueprint drafting system intact on
  both layouts, with non-color hatching/× states and the original generated
  illustration. No generic framework or layout regression was observed.

## Privacy, networking, and PWA

Cold live loads and the complete journeys requested only
`https://hex-daily-notebook.sociobot.in`. No CDN font, analytics, ad, tracker,
or other third-party request occurred; no cookie was set. Local storage was
empty before play and only the date-scoped puzzle key appeared after action.

The manifest is valid and declares standalone display, scope/start URL,
language, colors, and an icon. The live worker installed and controlled both
viewports; `registration.update()` completed with no waiting worker. With the
browser forced offline, reload restored the full puzzle and displayed the
Offline copy banner without a console or page error. The generated worker uses
`skipWaiting`, `clientsClaim`, versioned precache revisions, old-cache cleanup,
and a navigation fallback.

## Performance and budgets

Lighthouse 12.8.2 on the live URL with simulated mobile throttling:

| Metric | Result |
| --- | --- |
| Performance | 99 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1.0 s |
| LCP | 1.3 s |
| Total blocking time | 140 ms |
| CLS | 0 |
| Transfer | 38 KiB / 5 requests |

Lighthouse has no lab INP value. A separate Event Timing measurement for a
cell mark under 4× CPU throttling recorded a 96 ms interaction and a 104 ms
maximum observed event duration, below the 200 ms interaction budget.

Uncompressed build sizes pass every supplied budget:

- initial app JS plus registration helper: 31,574 bytes (budget 200 KB);
- CSS: 11,467 bytes (budget 50 KB);
- fonts: 0 bytes (budget 120 KB);
- AVIF illustration: 21,743 bytes; WebP fallback: 45,184 bytes (budget 300 KB).

## Release recommendation

Do not approve candidate `2fca18535f82dc0ae45b75079e487b14e1c4d745`.
Repair VER3-01 and add both browser regressions before rerunning verification.
VER3-02 is not release-blocking by itself but should be fixed in the same
follow-up.
