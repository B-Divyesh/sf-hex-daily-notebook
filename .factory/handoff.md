# Hex Daily Notebook — repair handoff

- Work order: `hex-daily-notebook-repair-1`
- Repaired report: `b6a4765021b75c423284b65adad25b50679d1c92`
- Original candidate: `35ec57899f22b6778ecf59d7e6c900e9a19ecf2a`
- Repair commits: `df10427347d3d3d7b297e687ac66825a8d8ed7cf`,
  `547ad634264f601b771f640f3aff0d34389379fe`
- Verified and deployed: 2026-08-28 UTC
- Live URL: <https://hex-daily-notebook.sociobot.in>
- Artifact: static PWA, Vite + TypeScript, Azure Static Web Apps, `dist/`

## Outcome

All eight findings in `.factory/verification.md` are repaired without changing
the researched brief, artifact class, deployment class, local-only privacy
model, or behaviors that previously passed.

## Finding-by-finding repair

1. **VER-01, save failure and malformed state:** local writes now return an
   explicit result. A failed write leaves a persistent alert and retry action,
   and no later success message can replace it. Loaded JSON validates the
   object, marks, every stroke, every point coordinate, elapsed time, and
   completion flag. Damaged fields reset safely while valid fields are kept;
   unreadable storage receives recovery guidance. Covered in
   `tests/storage.test.ts` and desktop/mobile browser tests for quota denial and
   the verifier's exact `strokes: ["bad"]` case.
2. **VER-02, cache policy:** hashed main JS/CSS, the hashed Workbox window
   helper, and the hashed Workbox runtime receive
   `public, max-age=31536000, immutable`. HTML revalidates and `sw.js` is
   `no-cache`. Policy patterns have a config regression test and were confirmed
   on the live responses.
3. **VER-03, dependency audit:** Vite is `6.4.3` and Vitest is `3.2.7`; the
   Playwright runner is pinned to the supplied `1.58.2`. Both full and
   production-only audits report zero vulnerabilities.
4. **VER-04, target sizes:** the brand and both legal links have a measured
   minimum height of 44 CSS px on desktop and 390 px mobile.
5. **VER-05, pencil truncation:** the arbitrary 1,200-stroke slice was removed.
   Unit and browser regressions restore and render 1,201 valid strokes.
6. **VER-06, repeated puzzles:** deterministic retry seeds avoid a target mask
   already used in the same calendar year. The full 2026 regression proves 365
   distinct targets and complete puzzle signatures, with one solution each.
7. **VER-07, response policy:** Azure configuration now sends a self-only CSP
   with `frame-ancestors 'none'`, plus `X-Frame-Options: DENY`; the existing
   no-sniff, no-referrer, and permission policies remain.
8. **VER-08, six-neighbor keyboard movement:** arrows retain the four axial
   directions and Shift+Up/Down reaches the two direct diagonal neighbors. The
   rules and keyboard note explain the mapping, and browser coverage asserts all
   six moves from the center cell.

## Clean release evidence

Run from `/work/repo` against the locked dependency graph and a newly generated
production artifact:

```text
npm ci                  PASS (374 packages; audit summary 0 vulnerabilities)
npm audit               PASS (0 vulnerabilities)
npm audit --omit=dev    PASS (0 vulnerabilities)
npm test                PASS (13/13; 3 files)
npm run build           PASS (TypeScript --noEmit + Vite production build)
npm run test:e2e        PASS (22/22; desktop and 390x844 mobile)
```

No lint script or lint configuration exists, so lint is not an applicable
repository gate. Package/consumer testing is also not applicable: the product
is a private static web artifact, not a published package.

The production output contains `dist/index.html` at its root. Uncompressed
budgets are 31,574 bytes initial JS (app plus registration helper), 11,467 bytes
CSS, 0 bytes fonts, 21,743 bytes AVIF, and 45,184 bytes WebP; all are below the
factory limits.

## Browser, accessibility, privacy, and PWA evidence

Repository browser tests exercised the actual production preview in both
projects: first load, keyboard marking and all six neighbor moves, undo, pencil
drawing and restore, quota-denied saves, malformed-state repair, 1,201 strokes,
44 px targets, complete solve and reload, legal/archive dialogs, axe, and
service-worker offline reload.

Independent live desktop 1440x1000 and mobile 390x844 smoke checks found:

- one `h1`, one `main`, `lang="en"`, complete image alternatives, zero
  horizontal overflow, zero console/page errors, and zero axe WCAG A/AA
  violations;
- archive dialog keyboard entry, Escape close, and focus restoration working;
- reduced-motion transition duration `0.00001s`;
- only `https://hex-daily-notebook.sociobot.in` requested, zero cookies, and no
  local-storage key before play;
- active controlling service worker, successful `registration.update()`, no
  waiting worker, and successful 390 px offline reload with the offline banner.

`/opt/fleet/lib/verify-url.sh` passed the live URL with HTTP 200, title, English
language, one `h1`, a main landmark, zero missing image alternatives, zero
unlabelled buttons, and zero console/page errors. HTTP redirects to HTTPS with
301.

Lighthouse 12.8.2 simulated mobile results on the deployed URL:

```text
Performance      100
Accessibility    100
Best practices   100
SEO              100
FCP               1.0 s
LCP               1.1 s
TBT                40 ms
CLS                 0
Transfer           40 KiB
```

INP has no lab value because the audit has no field data; the interaction and
blocking-time evidence remains comfortably within the supplied budget.

## Deployment and identity

The factory static deployer uploaded the fresh `dist/` successfully as Azure
deployment `f0bafd6f-68c0-4483-afd7-a0ddbf127295`; the custom domain returned
HTTPS 200 immediately afterward. Live bytes match the local artifact for HTML,
main JS, CSS, Workbox helper/runtime, service worker, and manifest. Key SHA-256
values:

```text
index.html                          81f6dab87a3a56787912fd074a5cfbc3b5ff8d6658b05072c67cda2478d27784
assets/index-CCRsQkMx.js            ad188c807473120db04b3603dbf7f2e4f82d85565e46725402cac17f1cfd19ee
assets/index-BXirKdNG.css           2b52d5332e98dc65ddccf51fac96463838feaea8a5a0a0b2c7fc9dd5984fb50c
sw.js                               fc9a89ac92f2b0eddc08c017333f9220f4290b5bdb9b931d92bf3c5542e5cd4a
manifest.webmanifest                b578ecede8b4973c6c6baa40497a5ad824178db7202c7cfde28f22ad5d498bd0
```

Live policy evidence: `/` and `/index.html` use
`public, max-age=0, must-revalidate`; all four hashed code assets use one-year
immutable caching; `sw.js` uses `no-cache`; CSP is self-only with framing
denied, and `X-Frame-Options` is `DENY`.

## Known gaps and next steps

No release-blocking product gap is known. A fresh independent verification is
the remaining factory workflow step. If the repository later adopts a lint
tool, add it as an explicit script and gate rather than relying only on strict
TypeScript and browser coverage.
