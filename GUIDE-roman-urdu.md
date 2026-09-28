# ScrewSort 2D — Istemaal Guide (Roman Urdu)

> Factory rule: har published project mein yeh file `GUIDE-roman-urdu.md` ke naam se zaroori hai.

## 1. Yeh project kya hai?

ScrewSort 2D ek **offline 2D screw-sort puzzle** hai. Board par rang-birangi bolts / screws hote hain (kuch upar wale neeche walon ko cover karte hain). Free screw tap karo → limited **dock** mein chala jata hai. Dock mein **3 same color** ho jayein to clear. Board + dock khali = jeet.

Yeh TubeSort (paani ki tubes) ya HexPour (hex pour) nahi hai — sirf flat hardware / candy-bolt art.

## 2. Kahan se download karein?

- GitHub / Pages: project path `/screwsort-2d/` (deploy ke baad)
- Local ZIP / repo: `/workspace/factory/projects/screwsort-2d`

## 3. Pehle kya chahiye? (requirements)

- **Node.js** 20+ (dev / build ke liye)
- Modern browser (Chrome / Edge / Firefox / Safari) — phone ya desktop
- Internet sirf pehli load / `npm install` ke liye; baad mein PWA offline chal sakta hai

## 4. Install + Run (step-by-step)

1. Folder kholo: `cd /workspace/factory/projects/screwsort-2d`
2. Dependencies: `npm install`
3. Dev server: `npm run dev` — browser mein dikhaya URL kholo
4. Production build: `npm test && npm run build`
5. `dist/` ko `/screwsort-2d/` path ke under serve karo (GitHub Pages base)

## 5. Demo login (agar ho)

Koi login nahi — bilkul offline / local game.

| Role | Email | Password |
|------|-------|----------|
| — | — | — |

## 6. Features — har ek kya karta hai

### Play / Levels
- **Kahan milega:** Home → Play ya Levels
- **Kaise use karein:** Level select grid se unlocked level choose karo
- **Result:** Board + dock load; sequential unlock (jeet ke baad next)

### Free screw tap
- **Kahan:** Play screen, canvas board
- **Kaise:** Uncovered (free) bolt par tap / click
- **Result:** Screw dock mein jata hai; covered bolts pehle free nahi hote

### Dock match-3
- **Kahan:** Board ke neeche dock (5 slots)
- **Kaise:** Automatic — jab 3 same color dock mein hon
- **Result:** Woh 3 clear; space free

### Fail (dock full)
- **Kahan:** Jab 5 slots bhar jayein aur koi triple na ho
- **Kaise:** Game fail screen dikhata hai
- **Result:** Undo last ya Restart

### Undo
- **Kahan:** Play bar → Undo
- **Kaise:** Last pick wapas
- **Result:** Board / dock previous state

### Hint
- **Kahan:** Play → Hint
- **Kaise:** Pehli hint free; baad mein rewarded ad stub
- **Result:** Ek safe free screw highlight

### Mute / Remove ads
- **Kahan:** Home
- **Kaise:** Sound toggle; Remove ads (stub) button
- **Result:** localStorage mein mute / adsRemoved save

### Ads stubs
- Fail / win / restart par interstitial stub; hint par rewarded stub
- Real AdMob nahi — sirf factory hooks

## 7. Common masail (troubleshooting)

- **Tap kaam nahi:** Covered screw hai — pehle upar wala hatao; ya dock full hai
- **Level locked:** Pehle wale levels clear karo
- **Build fail:** `npm install` phir `npm test && npm run build`
- **Blank page on Pages:** Confirm base path `/screwsort-2d/` aur assets usi under serve ho rahe hain
- **Progress gayab:** Browser localStorage clear / private mode

## 8. Security / privacy tips

- Koi account / password nahi
- Progress sirf device localStorage mein (`screwsort2d_v1`)
- Ads stubs — koi real billing / third-party ad SDK MVP mein nahi
- Sirf trusted Sources se build / ZIP lo

## 9. Agla update

- Zyada juice / animations, balanced hand-tuned late levels, real ads (jab factory allow kare)
- Abhi status: READY_FOR_QA — git push gates ke baad
