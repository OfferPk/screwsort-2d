/**
 * ScrewSort 2D engine — cover/free hit-test, dock match-3, fail-when-full.
 * Flat 2D bolts only (not TubeSort tubes, not HexPour hexes, not 3D).
 */
import type {
  DockItem,
  GameState,
  LevelDef,
  ScrewColor,
  ScrewState,
} from './types';

export function cloneState(state: GameState): GameState {
  return {
    levelId: state.levelId,
    dockSize: state.dockSize,
    matchSize: state.matchSize,
    screws: state.screws.map((s) => ({ ...s })),
    covers: state.covers.map((c) => [c[0], c[1]] as [string, string]),
    dock: state.dock.map((d) => ({ ...d })),
    status: state.status,
  };
}

export function loadLevel(level: LevelDef): GameState {
  return {
    levelId: level.id,
    dockSize: level.dockSize,
    matchSize: level.matchSize,
    screws: level.screws.map((s) => ({ ...s })),
    covers: level.covers.map((c) => [c[0], c[1]] as [string, string]),
    dock: [],
    status: 'playing',
  };
}

/** A screw is free if it is on the board and no remaining screw covers it. */
export function isFree(state: GameState, screwId: string): boolean {
  if (!state.screws.some((s) => s.id === screwId)) return false;
  const onBoard = new Set(state.screws.map((s) => s.id));
  for (const [coverer, covered] of state.covers) {
    if (covered === screwId && onBoard.has(coverer)) return false;
  }
  return true;
}

export function listFreeScrews(state: GameState): ScrewState[] {
  return state.screws.filter((s) => isFree(state, s.id));
}

export function hitTestScrew(
  state: GameState,
  x: number,
  y: number,
  radius: number,
): ScrewState | null {
  // Topmost free screw under point (highest z among hits that are free).
  const candidates = state.screws
    .filter((s) => {
      const dx = s.x - x;
      const dy = s.y - y;
      return dx * dx + dy * dy <= radius * radius;
    })
    .sort((a, b) => b.z - a.z);

  for (const s of candidates) {
    if (isFree(state, s.id)) return s;
  }
  return null;
}

function countColorInDock(dock: DockItem[], color: ScrewColor): number {
  return dock.filter((d) => d.color === color).length;
}

/** Clear matchSize of the same color from dock (first matching group). Returns cleared count. */
export function clearMatches(state: GameState): number {
  let cleared = 0;
  let changed = true;
  while (changed) {
    changed = false;
    const colors = new Map<ScrewColor, number>();
    for (const d of state.dock) {
      colors.set(d.color, (colors.get(d.color) ?? 0) + 1);
    }
    for (const [color, n] of colors) {
      if (n >= state.matchSize) {
        let left = state.matchSize;
        const next: DockItem[] = [];
        for (const d of state.dock) {
          if (d.color === color && left > 0) {
            left -= 1;
            cleared += 1;
          } else {
            next.push(d);
          }
        }
        state.dock = next;
        changed = true;
        break;
      }
    }
  }
  return cleared;
}

function hasTriple(state: GameState): boolean {
  const colors = new Map<ScrewColor, number>();
  for (const d of state.dock) {
    colors.set(d.color, (colors.get(d.color) ?? 0) + 1);
  }
  for (const n of colors.values()) {
    if (n >= state.matchSize) return true;
  }
  return false;
}

export function isWon(state: GameState): boolean {
  return state.screws.length === 0 && state.dock.length === 0;
}

export interface PickResult {
  ok: boolean;
  reason?: string;
  cleared: number;
}

/** Tap a free screw → move to dock → auto match-3 clear → win/fail checks. */
export function pickScrew(state: GameState, screwId: string): PickResult {
  if (state.status !== 'playing') {
    return { ok: false, reason: 'not-playing', cleared: 0 };
  }
  if (!isFree(state, screwId)) {
    return { ok: false, reason: 'covered', cleared: 0 };
  }
  const idx = state.screws.findIndex((s) => s.id === screwId);
  if (idx < 0) return { ok: false, reason: 'missing', cleared: 0 };

  if (state.dock.length >= state.dockSize) {
    return { ok: false, reason: 'dock-full', cleared: 0 };
  }

  const [screw] = state.screws.splice(idx, 1);
  state.dock.push({ id: screw!.id, color: screw!.color });

  const cleared = clearMatches(state);

  if (isWon(state)) {
    state.status = 'won';
    return { ok: true, cleared };
  }

  if (state.dock.length >= state.dockSize && !hasTriple(state)) {
    state.status = 'failed';
  }

  return { ok: true, cleared };
}

/**
 * Hint: prefer a free screw whose color already sits in the dock (helps match),
 * else any free screw. Returns screw id or null.
 */
export function hintScrew(state: GameState): string | null {
  if (state.status !== 'playing') return null;
  const free = listFreeScrews(state);
  if (free.length === 0) return null;

  const scored = free.map((s) => {
    const inDock = countColorInDock(state.dock, s.color);
    // Prefer colors with 1–2 already in dock; penalize if dock nearly full with unrelated.
    let score = inDock * 10;
    if (inDock === state.matchSize - 1) score += 50;
    score -= s.z; // slightly prefer lower layers once free
    return { id: s.id, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]!.id;
}

/** Validate level: each color count divisible by matchSize. */
export function validateLevel(level: LevelDef): string[] {
  const errors: string[] = [];
  const counts = new Map<ScrewColor, number>();
  const ids = new Set<string>();
  for (const s of level.screws) {
    if (ids.has(s.id)) errors.push(`duplicate id ${s.id}`);
    ids.add(s.id);
    counts.set(s.color, (counts.get(s.color) ?? 0) + 1);
  }
  for (const [c, n] of counts) {
    if (n % level.matchSize !== 0) {
      errors.push(`color ${c} count ${n} not divisible by ${level.matchSize}`);
    }
  }
  for (const [a, b] of level.covers) {
    if (!ids.has(a) || !ids.has(b)) errors.push(`cover refs missing: ${a}->${b}`);
  }
  return errors;
}
