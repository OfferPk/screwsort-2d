# Changelog

## 0.1.0 — 2026-09-28

### Added
- ScrewSort 2D MVP: layered bolts, cover/free hit-test, dock capacity 5 / match-3 clear
- Fail when dock full with no triple; win when board + dock empty
- 40 JSON levels (colors 3→6; density up)
- Undo stack; hint (1 free/level then rewarded stub)
- Ads stubs: interstitial, rewarded, remove-ads, isAdsRemoved
- Screens: Home, level select, play, win, fail; mute/settings
- Progress persistence (unlock, adsRemoved, mute) via localStorage
- Canvas flat hardware / candy-bolt theme (original — not TubeSort / HexPour / 3D Screw Out)
- PWA with `base: '/screwsort-2d/'`
- Vitest: cover/free, dock match, overflow fail, fixture, ads
- README, GUIDE-roman-urdu.md, STATUS.md
