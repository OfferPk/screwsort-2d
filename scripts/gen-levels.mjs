/**
 * Generate 40 ScrewSort 2D levels: colors 3→6, density up.
 * Each color count divisible by matchSize (3). Explicit covers list.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../src/levels');
fs.mkdirSync(outDir, { recursive: true });

const COLORS = ['R', 'B', 'G', 'Y', 'P', 'O'];
const DOCK = 5;
const MATCH = 3;
const BOARD_W = 360;
const BOARD_H = 400;
const R = 22;

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Build color bag: numColors colors, totalScrews divisible by 3, each color % 3 === 0. */
function buildBag(rng, numColors, totalScrews) {
  const colors = COLORS.slice(0, numColors);
  const triples = Math.max(numColors, Math.floor(totalScrews / MATCH));
  // Distribute triples across colors
  const counts = Object.fromEntries(colors.map((c) => [c, 0]));
  for (let i = 0; i < triples; i++) {
    counts[colors[i % colors.length]] += MATCH;
  }
  // Trim if somehow over — shouldn't happen
  let bag = [];
  for (const c of colors) {
    for (let i = 0; i < counts[c]; i++) bag.push(c);
  }
  // Shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function placeScrews(rng, bag, layers) {
  const screws = [];
  const margin = R + 8;
  const cols = Math.max(3, Math.ceil(Math.sqrt(bag.length * 1.2)));
  const rows = Math.ceil(bag.length / cols);
  const cellW = (BOARD_W - margin * 2) / Math.max(1, cols - 0.2);
  const cellH = (BOARD_H - margin * 2 - 40) / Math.max(1, rows - 0.2);

  let i = 0;
  for (let row = 0; row < rows && i < bag.length; row++) {
    for (let col = 0; col < cols && i < bag.length; col++) {
      const jitterX = (rng() - 0.5) * cellW * 0.35;
      const jitterY = (rng() - 0.5) * cellH * 0.35;
      const x = Math.round(margin + col * cellW + jitterX);
      const y = Math.round(margin + 20 + row * cellH + jitterY);
      const z = Math.floor(rng() * layers);
      screws.push({
        id: `s${i + 1}`,
        x: Math.min(BOARD_W - margin, Math.max(margin, x)),
        y: Math.min(BOARD_H - margin, Math.max(margin, y)),
        z,
        color: bag[i],
      });
      i++;
    }
  }
  return screws;
}

function buildCovers(screws) {
  const covers = [];
  for (let i = 0; i < screws.length; i++) {
    for (let j = 0; j < screws.length; j++) {
      if (i === j) continue;
      const a = screws[i];
      const b = screws[j];
      // a covers b if a.z > b.z and circles overlap
      if (a.z > b.z && dist(a, b) < R * 1.85) {
        covers.push([a.id, b.id]);
      }
    }
  }
  // Deduplicate
  const seen = new Set();
  return covers.filter(([a, b]) => {
    const k = `${a}>${b}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function levelSpec(id) {
  // Progression: colors 3→6, density up
  let numColors, total, layers;
  if (id <= 5) {
    numColors = 3;
    total = 6 + (id - 1) * 3; // 6,9,12,15,18
    layers = 2;
  } else if (id <= 12) {
    numColors = 3;
    total = 12 + (id - 6) * 3; // 12..30
    layers = 2 + (id > 9 ? 1 : 0);
  } else if (id <= 20) {
    numColors = 4;
    total = 15 + (id - 13) * 3;
    layers = 3;
  } else if (id <= 30) {
    numColors = 5;
    total = 18 + (id - 21) * 3;
    layers = 3 + (id > 25 ? 1 : 0);
  } else {
    numColors = 6;
    total = 24 + (id - 31) * 3;
    layers = 4;
  }
  // Cap reasonable
  total = Math.min(total, 48);
  // Ensure total divisible by 3 and enough for colors
  if (total < numColors * 3) total = numColors * 3;
  if (total % 3 !== 0) total += 3 - (total % 3);
  return { numColors, total, layers };
}

const indexLines = [];
const levelIds = [];

for (let id = 1; id <= 40; id++) {
  const rng = mulberry32(id * 9973 + 42);
  const { numColors, total, layers } = levelSpec(id);
  const bag = buildBag(rng, numColors, total);
  const screws = placeScrews(rng, bag, layers);
  // Ensure z spread: force at least some layering on denser levels
  if (layers >= 2 && screws.length >= 6) {
    for (let k = 0; k < Math.min(4, screws.length); k++) {
      screws[k].z = Math.min(layers - 1, screws[k].z + 1);
    }
  }
  // Nudge some higher-z screws onto lower ones for covers
  if (layers >= 2) {
    const byZ = [...screws].sort((a, b) => a.z - b.z);
    const lows = byZ.filter((s) => s.z === 0);
    const highs = byZ.filter((s) => s.z > 0);
    for (let k = 0; k < Math.min(highs.length, lows.length); k++) {
      if (rng() < 0.7) {
        highs[k].x = lows[k].x + Math.round((rng() - 0.5) * 14);
        highs[k].y = lows[k].y + Math.round((rng() - 0.5) * 14);
      }
    }
  }
  const covers = buildCovers(screws);

  // Early levels: fewer covers for fairness
  let finalCovers = covers;
  if (id <= 3) {
    finalCovers = covers.slice(0, Math.min(2, covers.length));
  } else if (id <= 8) {
    finalCovers = covers.slice(0, Math.ceil(covers.length * 0.5));
  }

  const level = {
    id,
    dockSize: DOCK,
    matchSize: MATCH,
    screws,
    covers: finalCovers,
  };

  // Validate color multiples
  const counts = {};
  for (const s of screws) counts[s.color] = (counts[s.color] || 0) + 1;
  for (const [c, n] of Object.entries(counts)) {
    if (n % MATCH !== 0) {
      console.error(`Level ${id} color ${c} = ${n}`);
      process.exit(1);
    }
  }

  const name = `level-${String(id).padStart(2, '0')}.json`;
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(level, null, 2) + '\n');
  indexLines.push(`import l${id} from './${name}';`);
  levelIds.push(`l${id}`);
  console.log(
    `L${id}: colors=${numColors} screws=${screws.length} covers=${finalCovers.length} layers=${layers}`,
  );
}

const indexSrc = `${indexLines.join('\n')}

import type { LevelDef } from '../game/types';

export const LEVELS: LevelDef[] = [${levelIds.join(', ')}] as unknown as LevelDef[];

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export const LEVEL_COUNT = LEVELS.length;
`;
fs.writeFileSync(path.join(outDir, 'index.ts'), indexSrc);
console.log('Wrote 40 levels + index.ts');
