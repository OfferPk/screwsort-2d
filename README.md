# ScrewSort 2D

Offline **2D screw-sort** puzzle PWA — tap free colored bolts into a limited holding dock; match-3 clears; clear board + dock to win.

**Not TubeSort:** no water tubes.  
**Not HexPour:** no hex pour stacks.  
**Not 3D / Screw Out:** original flat hardware / candy-bolt geometric art — no third-party assets or IP.

| | |
|--|--|
| **Project ID** | `proj_screwsort_2d_001` |
| **Slug** | `screwsort-2d` |
| **Pages base** | `/screwsort-2d/` |
| **Stack** | Vite + TypeScript + Canvas + PWA |
| **Levels** | 40 JSON (colors 3→6, density up) |

## Play

```bash
npm install
npm run dev
```

Production build (GitHub Pages path `/screwsort-2d/`):

```bash
npm test
npm run build
```

Serve `dist/` under `/screwsort-2d/`. Offline after first load via service worker.

## Controls

- **Tap** a free (uncovered) bolt → it moves to the **dock** (capacity **5**)
- When the dock has **3** of the same color → they auto-clear
- Clear all screws from board **and** dock → win
- Dock full with no triple → fail (undo / restart)

## Features (MVP)

1. Board + layers — z-order / covers list; hit-test topmost free
2. 40 JSON levels (colors 3→6; density up)
3. Dock capacity 5; match-3 clear; fail-when-full
4. Undo + Restart
5. Hint (1 free per level, then rewarded ad stub)
6. localStorage: unlock, mute, adsRemoved
7. Ads stubs: interstitial (fail/win/restart), rewarded hint, remove-ads
8. Docs: README, [GUIDE-roman-urdu.md](./GUIDE-roman-urdu.md), STATUS.md

## Roman Urdu guide

See **[GUIDE-roman-urdu.md](./GUIDE-roman-urdu.md)** for install, run, and feature walkthrough.

## Tests

```bash
npm test
```

Covers free/cover, dock match-3, overflow fail, fixture win path, ads stubs.

## License

Original factory MVP — not affiliated with Screw Out or other commercial titles.
