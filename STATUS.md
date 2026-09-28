# ScrewSort 2D — STATUS

**Status:** READY_FOR_QA  
**Updated:** 2026-09-28T18:39:07+05:00 (PKT)  
**Version:** 0.1.0  
**Project ID:** `proj_screwsort_2d_001`  
**Path:** `/workspace/factory/projects/screwsort-2d`  
**Source SHA:** `2d4e61fe92f7f73bd9d2f22006696fde2132d6ca` (`2d4e61f`)  
**Pages base:** `/screwsort-2d/`

## Gates

| Gate | Result |
|------|--------|
| QA | pending |
| Security | pending |
| `npm test` | **13/13 passed** |
| `npm run build` | **green** (Vite + TypeScript + PWA; base `/screwsort-2d/`) |

## Scope shipped (MVP)

- Layered 2D screw-sort engine (NOT TubeSort tubes; NOT HexPour hexes; NOT 3D)
- Cover/free hit-test via covers list + z-order paint
- Dock capacity 5; match-3 clear; fail when dock full with no triple
- Win: clear all screws from board + dock
- 40 JSON levels (colors 3→6; density up)
- Undo, hint (1 free then rewarded stub), level select
- localStorage unlock / mute / adsRemoved
- Ads stubs: interstitial (fail/win/restart), rewarded hint, remove-ads
- Canvas flat hardware / candy-bolt geometric art (original)
- PWA offline shell
- README + GUIDE-roman-urdu.md + CHANGELOG 0.1.0

## Notes

- No git push until QA/Security gates
- Standby FAIL-only for follow-ups
