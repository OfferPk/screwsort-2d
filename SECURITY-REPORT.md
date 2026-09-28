# ScrewSort 2D — Security Review Report

**Date:** 2026-09-28 18:40 PKT (Asia/Karachi, UTC+05:00)  
**Project:** `/workspace/factory/projects/screwsort-2d`  
**HEAD reviewed:** `5b81833` (`5b81833f9ec724c5b2c1daf53690f111a064f767`) — STATUS pin to tip (MVP code `10f68f4`)  
**Version:** 0.1.0  
**Reviewer:** Security Reviewer (executor)  
**Gate:** `/workspace/factory/shared/security/RELEASE_GATE.md`  
**Verdict:** **PASS_WITH_NOTES**  
**Sign-off:** **CLEAR** (no ship blockers)

**Statement:** No product code was edited. No git push was performed. Commit `5b81833` was not amended.

---

## Ship blockers

**None.**

No secrets/API keys/tokens in source or build, no exploitable XSS from untrusted input into HTML, no unexpected network/telemetry/live AdMob SDKs, no privileged auth surface, production dependency audit clean (`npm audit --omit=dev` → 0 vulnerabilities). Offline Vite/TS Canvas screw-sort PWA only.

---

## Master focus summary

| Focus | Result |
|-------|--------|
| 1. XSS / storage / UI | **PASS** — ad stubs use `esc()` + `innerHTML`; win interpolates numeric `levelId` only; home hero static; toast/buttons `textContent`; canvas board — no DOM XSS from level JSON |
| 2. localStorage hygiene | **PASS_WITH_NOTES** — key `screwsort2d_v1`; unlocked floored ≥1; adsRemoved/mute `=== true`; no upper clamp to `LEVEL_COUNT` (F1) |
| 3. Deps audit | **PASS** — prod audit 0; vitest-only moderate in full audit (F3) |
| 4. Secrets | **PASS** — none; ads stubs only (`src/ads/stubs.ts`); no live AdMob/network |
| 5. CSP / headers | **Info** — no CSP meta in `index.html` (Pages host can add headers) (F4) |
| 6. Offline | **PASS** — no app fetch/beacon/analytics; Workbox precache only |
| 7. `.gitignore` | **Note** — missing `.env*` (F2), same pattern as peer factory PWAs |

---

## Findings

### F1 — `unlocked` not upper-clamped to `LEVEL_COUNT` on read (Low / note)

- **File:** `src/game/persist.ts:22–25` (`readRaw`)
- **Evidence:** `unlocked` coerced with `typeof === 'number' && >= 1 ? Math.floor(...) : 1` — no `Math.min(..., LEVEL_COUNT)`. UI soft-caps via `Math.min(persist.unlocked, LEVEL_COUNT)` on Play (`src/ui/app.ts:159`) and level grid loops only `1..LEVEL_COUNT` (`201–209`).
- **Risk:** Client-side localStorage tampering only (offline game; no server trust). A huge `unlocked` value does not unlock past 40 in the UI and cannot inject HTML.
- **Remediation (non-blocking):** On read, `unlocked = Math.min(LEVEL_COUNT, Math.max(1, Math.floor(parsed.unlocked)))` (import `LEVEL_COUNT` or pass max), matching ArrowPath-style clamp.
- **Severity:** Low / note — not a RELEASE_GATE ship blocker.

### F2 — `.gitignore` omits `.env*` patterns (Info / note)

- **File:** `.gitignore` (lines: `node_modules`, `dist`, `.DS_Store`, `*.local`, `.dev-dist`)
- **Evidence:** No `.env`, `.env.*`, or `!.env.example`. No `.env` files present in tree; no secret-like paths tracked.
- **Risk:** Accidental commit of future AdMob/IAP env files when live ads land.
- **Remediation (non-blocking):** Add `.env`, `.env.*`, `!.env.example` before introducing real keys.

### F3 — Full `npm audit` moderate findings are Vitest-only (Info / note)

- **Evidence:** `npm audit --omit=dev` → **0 vulnerabilities** (zero production `dependencies` in `package.json`). Full audit: 2 moderate in `@vitest/mocker` / `vitest` (GHSA-82fw-gwwq-j7x9) — **dev/test tree only**, not shipped in `dist/`.
- **Risk:** Local/CI Vitest misuse only; not a runtime ship risk for the offline PWA.
- **Remediation (non-blocking):** Plan Vitest upgrade when convenient; do not expose Vitest tooling to untrusted networks.

### F4 — CSP meta absent in `index.html` (Info)

- **File:** `index.html` (no `Content-Security-Policy` meta)
- **Evidence:** Typical for factory offline PWAs hosted on GitHub Pages; headers belong on the host. No third-party scripts in the document.
- **Risk:** None material for this client-only MVP with no remote script/connect surface.
- **Remediation (optional):** When Pages (or other host) supports custom headers, prefer CSP restricting `script-src` / `connect-src` to same-origin; keep Workbox/SW registration compatible.

---

## Checklist (RELEASE_GATE)

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Authn / sessions / tokens | N/A → PASS | No accounts, cookies, or tokens |
| 2 | Authz / IDOR / roles | N/A → PASS | Client-only game; no privileged routes |
| 3 | Secrets & config | PASS | No keys; ads are stubs (`src/ads/stubs.ts`) |
| 4 | API surface & rate limits | N/A → PASS | No app API |
| 5 | Injection (XSS / eval / HTML) | PASS | See XSS detail; no `eval` / `document.write` / `outerHTML` / `insertAdjacentHTML` |
| 6 | Uploads & file access | N/A → PASS | None |
| 7 | Dependencies & supply chain | PASS | Prod audit clean; F3 notes vitest-only |
| 8 | Logging / error leakage | PASS | Ad stub in-memory `log` only; no remote logging |
| 9 | Transport (TLS / cookies / HSTS) | N/A → PASS | Static Pages host; no cookie auth; CSP note F4 |
| 10 | Admin / debug surfaces | PASS | No debug endpoints |

### Focus detail

**XSS / UI (`src/ui/app.ts`)**  
- Ad stub modals (`84–99`, `101–130`): `modal.innerHTML` interpolates `esc(title)` and `esc(body)` then `.replace(/\n/g, '<br/>')` — HTML-escaped before injection. Reasons are app-controlled (`'restart'`, `'win'`, `'fail'`, `'hint'`).  
- Overlay clears via `innerHTML = ''` (safe). Screen re-renders clear with `innerHTML = ''` then rebuild via `createElement` / `textContent` / `button()` helper (label → `textContent`).  
- Home hero (`151–155`): **static** markup only (logo div, fixed title/tagline) — no user/persist strings.  
- Win screen (`369`): `box.innerHTML = \`...\${levelId}...\`` — **`levelId` is always a number**: initialized `1`; set only in `startLevel(id: number)` from `Math.min(persist.unlocked, LEVEL_COUNT)`, loop index `1..LEVEL_COUNT`, or `levelId + 1` / restart. Never from free-text level JSON or storage strings. Coercion in template yields decimal digits only → no XSS. Play title uses `textContent` (`238`). Fail template (`387`) is fully static.  
- Toast (`78–81`): `textContent` only.  
- Level select buttons (`203`): `button(String(i), ...)` → `textContent` — numeric only.  
- No `eval`, `new Function`, `document.write`, `outerHTML`, or `insertAdjacentHTML` in `src/`.

**Canvas / level JSON (`src/render/board.ts`, `src/game/engine.ts`, `src/levels/`)**  
- Levels are static bundled JSON (`id` number, coords, color tokens `R|B|G|Y|P|O`, screw string ids, covers pairs) — no free-text narrative fields rendered as HTML.  
- `loadLevel` maps numeric geometry + color tokens into `GameState`; renderer draws via Canvas 2D.  
- Sole `fillText` (`board.ts:201–205`) draws dock status counts (`Dock n/m · match k`) — never level/screw string ids as DOM/HTML.  
- **No DOM XSS path from level JSON.**

**localStorage (`src/game/persist.ts`)**  
- Key: `screwsort2d_v1`  
- Fields: `unlocked` (number), `adsRemoved` (boolean), `mute` (boolean) — progress/flags only; **no credentials**  
- Hardening: try/catch on read/write; `unlocked` floor ≥1; `adsRemoved` / `mute` require `=== true`; F1 notes missing upper clamp  
- Consumed via numeric compares / boolean gates / `textContent` — not HTML-interpolated as untrusted strings

**Ads stubs (`src/ads/stubs.ts`)**  
- `showInterstitial` / `showRewarded` / `purchaseRemoveAds` / `isAdsRemoved`  
- UI presenters in `app.ts` (`62–76`) are overlay stubs (“Ad stub — Interstitial/Rewarded”; “No real ad SDK in MVP”); no AdMob SDK, no `ca-app-pub`, no network ads  
- `purchaseRemoveAds` only sets `adsRemoved: true` in localStorage; `isAdsRemoved()` requires `=== true`

**PWA / base / offline**  
- `vite.config.ts`: `base: '/screwsort-2d/'`; Workbox `globPatterns` for static assets; `manifest: false` (uses `public/manifest.webmanifest`)  
- `src/main.ts`: `registerSW({ immediate: true })` from `virtual:pwa-register`  
- Build evidence: `dist/sw.js` precaches app assets + `NavigationRoute` → `index.html` only — no unexpected remote app URLs  
- Grep: no app `fetch(`, `sendBeacon`, `XMLHttpRequest`, `gtag`, `analytics`, `admob` in `src/` / `public/` / `index.html`

**Secrets**  
- No API keys, tokens, passwords, or `.env` files in source/public/dist. Package has **zero** production dependencies (devDeps only: typescript, vite, vite-plugin-pwa, vitest, @types/node).

---

## Commands run (evidence)

| Command | Result |
|---------|--------|
| `git rev-parse HEAD` | `5b81833f9ec724c5b2c1daf53690f111a064f767` |
| `npm test` | **13/13 passed** (ads 3 + engine 10) |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` (full) | 2 moderate (vitest / @vitest/mocker only) |
| Grep sinks / network / secrets | `innerHTML` only in `app.ts` (esc'd ad stubs + static home/win/fail + safe clears); localStorage in persist only; no committed secrets |

**Not done (per brief):** no product code edits; no git push; SHA `5b81833` not amended.

---

## Notes

- Client-controlled `localStorage` progress (unlock, adsRemoved stub, mute) is tamperable by design for an offline game — not a ship blocker with no server trust boundary.
- CSP/headers for GitHub Pages remain a hosting concern (F4); MVP ships without inline CSP meta consistently with peer factory PWAs (e.g. SlideJam, HexPour).
- STATUS.md may lag tip; review tip HEAD is `5b81833` as instructed (MVP payload `10f68f4`).

---

## Sign-off

**Verdict:** PASS_WITH_NOTES  
**Ship blockers:** none  
**Sign-off:** **CLEAR** — eligible for QA / Master dual-clear publish path once Product/QA gates pass. Address F1–F4 as polish, not blockers.

Report path: `/workspace/factory/projects/screwsort-2d/SECURITY-REPORT.md`
