# QA Report — ScrewSort 2D MVP v0.1.0

**Date:** 2026-09-28 18:41 PKT (Asia/Karachi)  
**Project:** `/workspace/factory/projects/screwsort-2d`  
**Version:** 0.1.0  
**HEAD audited:** `5b81833f9ec724c5b2c1daf53690f111a064f767` (`5b81833` — STATUS: pin Source SHA to tip) — **not amended**  
**Feature / MVP tip lineage:** `10f68f4` (MVP 0.1.0) → `0ea5167` (READY_FOR_QA) → `5b81833` (STATUS pin)  
**PRD:** `/workspace/factory/research/PRD-screwsort-2d.md`  
**BUILD:** `/workspace/factory/inbox/BUILD-screwsort-2d.md`  
**STATUS claim:** `READY_FOR_QA` (listed Source SHA `5b1468c` — **does not match HEAD**; see residual)  
**QA:** Independent pass (report only — no product code changes; no GitHub push; no agent messages)  
**Overall:** **PASS**

---

## Summary

MVP scope holds against Master checklist + PRD §5 / §8. Layered **2D screw-sort** (NOT TubeSort tubes; NOT HexPour hexes; NOT 3D / Screw Out): cover/free hit-test, dock capacity **5** / match-3 clear, fail-when-full, win when board + dock empty. **40** JSON levels (colors 3→6; density up; all color counts ÷3; dockSize=5 / matchSize=3). Undo + hint (1 free/level → rewarded stub), ads stubs, Home / levels / play / win / fail, `localStorage` key `screwsort2d_v1`, Canvas PWA `base: '/screwsort-2d/'`, README + GUIDE-roman-urdu.md + STATUS + CHANGELOG 0.1.0. Automation: **`npm test` 13/13**, **`npm run build` green**. Extra QA DFS: **40/40** levels solvable. Preview smoke `http://127.0.0.1:4195/screwsort-2d/` — shell/manifest/SW/assets/icons **200**. No P0/P1 ship blockers.

| Severity | Count |
|----------|------:|
| Critical / P0 | 0 |
| High / P1     | 0 |
| Medium / P2   | 0 |
| Low / P3 (residual) | 4 |

**CLEAR for publish from QA:** **YES** (host under `base: /screwsort-2d/`).

---

## Environment

| Item | Detail |
|------|--------|
| Runtime | `npm run preview -- --host 127.0.0.1 --port 4192` → bound **4195** (4192–4194 busy) → `http://127.0.0.1:4195/screwsort-2d/` |
| Methods | PRD/BUILD/STATUS/README/GUIDE/CHANGELOG; source review (`engine`, `types`, `persist`, `ads/stubs`, `ui/app`, `render/board`, levels, PWA); vitest; production build; QA-only DFS solvability of 40 levels (temp probe under `/tmp`, deleted; not committed); HTTP smoke of `dist/` |
| Zone | Asia/Karachi (UTC+5); times PKT |
| Git | Local `main` at `5b81833`; SHA **not amended**; no push this QA; report-only (`QA-REPORT.md` untracked + inbox note) |

---

## Automation

| Check | Result |
|-------|--------|
| `npm test` | **13/13 passed** — `tests/engine.test.ts` (10) + `tests/ads.test.ts` (3); vitest 3.2.7; exit 0 |
| `npm run build` | **green** — `tsc && vite build`; vite 6.4.3; PWA v1.3.0 `generateSW`; **11 precache entries** (78.23 KiB); `dist/sw.js` + `workbox-*.js`; asset hrefs under `/screwsort-2d/`; exit 0 |
| Extra DFS solvability | **40/40** solvable (QA plain-JS probe mirroring pick/cover/match/fail; heuristic DFS; depths = screw counts on most levels; max nodes observed ~553 on L37) |

---

## Master scope verification

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Layered bolts + dock capacity 5 / match-3 clear (**NOT tubes, NOT HexPour, NOT 3D**) | **PASS** | `src/game/engine.ts`: `isFree` / covers list; `pickScrew` → dock → `clearMatches` (matchSize); fail when `dock.length >= dockSize && !hasTriple`; win `screws.length===0 && dock.length===0`. Canvas bolts in `render/board.ts` (washer + hex head geometry — flat 2D). Docs/code comments explicitly exclude TubeSort / HexPour / 3D. No tube or hex-pour UI in `src/`. |
| 2 | 40 levels | **PASS** | `src/levels/level-01.json`…`level-40.json` + `LEVEL_COUNT === 40`; ids 1–40 continuous. All `dockSize: 5`, `matchSize: 3`. Colors **3→6** (L1–12: 3; L13–20: 4; L21–30: 5; L31–40: 6). Screw counts 9→48; covers present. Validate: no dup ids; all color counts ÷3; cover refs valid. DFS **40/40** solvable. |
| 3 | Undo / hint | **PASS** | Unlimited `undoStack` via `cloneState` on successful pick; Undo on play bar + fail “Undo last”. Hint: `freeHintsLeft = 1` per `startLevel`; then `showRewarded('hint')`; `hintScrew` highlights free screw. |
| 4 | Ads stubs | **PASS** | `src/ads/stubs.ts`: interstitial, rewarded, `purchaseRemoveAds`, `isAdsRemoved`. UI presenters (modal stubs); win/fail/restart interstitial; Home remove-ads. Ads tests 3/3. No AdMob SDK/keys in bundle. |
| 5 | Canvas PWA base `/screwsort-2d/` | **PASS** | `vite.config.ts` `base: '/screwsort-2d/'`; `public/manifest.webmanifest` start_url/scope `/screwsort-2d/`; dist assets prefixed `/screwsort-2d/`; SW + NavigationRoute. |
| 6 | README + GUIDE-roman-urdu.md + STATUS + CHANGELOG 0.1.0 | **PASS** | All four at project root. CHANGELOG `## 0.1.0 — 2026-09-28`. GUIDE Roman Urdu §§1–9. STATUS `READY_FOR_QA`. (STATUS Source SHA field inaccurate — residual, not scope miss.) |

### Also verified

| Item | Verdict | Evidence |
|------|---------|----------|
| Screens | **PASS** | `home \| levels \| play \| win \| fail`; mute + remove-ads on Home; sequential unlock `unlockLevel(levelId+1)` on win |
| localStorage | **PASS** | Key `screwsort2d_v1`: `unlocked`, `adsRemoved`, `mute` |
| Cover / free hit-test | **PASS** | Unit tests; `hitTestScrew` topmost free by z among radius hits |
| Offline after first load (structural) | **PASS** | SW `precacheAndRoute` + NavigationRoute → `index.html`; no gameplay network fetch required. No live airplane-mode toggle this pass. |
| Original theme / IP | **PASS** | Flat candy-bolt / hardware geometric canvas; README/STATUS/CHANGELOG disclaim TubeSort / HexPour / Screw Out |
| No git push / SHA intact | **PASS** | HEAD remains `5b81833`; report-only; instructed not to amend |

---

## Preview smoke (HTTP)

Base: `http://127.0.0.1:4195/screwsort-2d`

| URL | Result |
|-----|--------|
| `/` | **200** HTML — ScrewSort 2D title, `#app`, assets under `/screwsort-2d/` |
| `/manifest.webmanifest` | **200** — name ScrewSort 2D, display standalone, scope `/screwsort-2d/` |
| `/sw.js` | **200** — precache + NavigationRoute |
| `/assets/index-*.js`, `*.css` | **200** |
| `/icons/icon-192.png`, `512.png`, `icon.svg` | **200** |

---

## PRD acceptance mapping (§8)

| Criterion | Result |
|-----------|--------|
| Free/cover + dock triple-clear + fail-on-full | **PASS** |
| 40 playable levels; sequential unlock | **PASS** (+ DFS 40/40) |
| Undo/hint stubs work | **PASS** |
| PWA offline; `/screwsort-2d/` base OK | **PASS** (structural + smoke) |
| Ads/remove-ads stubs wired | **PASS** |
| `npm test` + `npm run build` | **PASS** |
| README + GUIDE-roman-urdu; original 2D art | **PASS** |
| No 3D / TubeSort / HexPour drift | **PASS** |

---

## Residuals (non-blocking)

1. **P3 — STATUS Source SHA pin miss:** Commit `5b81833` message is “pin Source SHA to tip”, but STATUS still lists `5b1468c…` (`5b1468c`), which is **not** in this repo’s `git log` and **≠** HEAD `5b81833`. Classic pre-commit chicken-egg. Product/gates OK; follow-up STATUS commit (do **not** amend `5b81833`) should set Source SHA to the new tip after that docs commit.  
2. **P3 — Mute is preference-only:** Mute toggles persist to `localStorage` but MVP has no SFX/audio path that reads `mute` (toast juice only).  
3. **P3 — Resize listener accumulate:** `renderPlayShell` adds `window.addEventListener('resize', …)` each play entry without remove — minor leak across level transitions.  
4. **P3 — No live offline-network toggle:** Airplane-mode browser check not performed; SW precache + NavigationRoute satisfy structural offline gate.

---

## Blockers

**None (P0/P1).**

---

## Verdict

**PASS** — **CLEAR for publish from QA** under `/screwsort-2d/`. Security gate still pending per STATUS.
