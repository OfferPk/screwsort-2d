# ScrewSort 2D — STATUS

**Status:** SHIPPED  
**Updated:** 2026-09-28T18:43:00+05:00 (PKT)  
**Version:** 0.1.0  
**Project ID:** `proj_screwsort_2d_001`  
**Path:** `/workspace/factory/projects/screwsort-2d`  
**Release source SHA:** `5b81833f9ec724c5b2c1daf53690f111a064f767` (`5b81833`, not amended)  
**Release tip:** release-prep commit stacked on `5b81833`  
**Pages base:** `/screwsort-2d/`

## Gates

| Gate | Result |
|------|--------|
| QA | **PASS** — report: `QA-REPORT.md` |
| Security | **PASS_WITH_NOTES** — clear to ship; no blockers; report: `SECURITY-REPORT.md` |
| `npm test` | **13/13 passed** |
| `npm run build` | **green** (Vite + TypeScript + PWA; base `/screwsort-2d/`) |

## v0.1.0 release

ScrewSort 2D MVP: layered 2D screws with cover/free hit-testing, dock capacity 5 / match-3 clear, fail-on-full, win-on-empty, 40 JSON levels, undo, hint, level select, progress persistence, ads stubs, Canvas PWA offline shell, README, and Roman Urdu guide.

Dual-clear: QA PASS + Security PASS_WITH_NOTES. Security findings are non-blocking notes (local progress range hardening, `.env*` ignore hygiene, dev-only Vitest audit findings, and host CSP guidance). **No security code edits were made.**

## Deployment

- Repository: https://github.com/OfferPk/screwsort-2d
- Release: https://github.com/OfferPk/screwsort-2d/releases/tag/v0.1.0
- GitHub Pages: https://offerpk.github.io/screwsort-2d/
- GitHub Pages base: `/screwsort-2d/`
- Deployment branch: `gh-pages`
- `.nojekyll`: included for Pages

## Notes

- Original flat hardware / candy-bolt theme; not TubeSort, HexPour, or 3D Screw Out.
- No real AdMob or IAP keys; ads and remove-ads are stubs.
- Keep `base: '/screwsort-2d/'` in `vite.config.ts`.
