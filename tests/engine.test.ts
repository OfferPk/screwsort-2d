import { describe, expect, it } from 'vitest';
import {
  clearMatches,
  cloneState,
  hintScrew,
  isFree,
  isWon,
  listFreeScrews,
  loadLevel,
  pickScrew,
  validateLevel,
} from '../src/game/engine';
import type { LevelDef } from '../src/game/types';
import { getLevel, LEVEL_COUNT } from '../src/levels/index';

/** Fixture: s2 covers s1; three R free eventually for match. */
const fixture: LevelDef = {
  id: 99,
  dockSize: 5,
  matchSize: 3,
  screws: [
    { id: 's1', x: 40, y: 60, z: 0, color: 'R' },
    { id: 's2', x: 48, y: 60, z: 1, color: 'B' },
    { id: 's3', x: 120, y: 60, z: 0, color: 'R' },
    { id: 's4', x: 200, y: 60, z: 0, color: 'R' },
    { id: 's5', x: 120, y: 140, z: 0, color: 'B' },
    { id: 's6', x: 200, y: 140, z: 0, color: 'B' },
  ],
  covers: [['s2', 's1']],
};

describe('cover / free', () => {
  it('marks covered screw as not free', () => {
    const state = loadLevel(fixture);
    expect(isFree(state, 's1')).toBe(false);
    expect(isFree(state, 's2')).toBe(true);
    expect(listFreeScrews(state).map((s) => s.id).sort()).toEqual(
      ['s2', 's3', 's4', 's5', 's6'].sort(),
    );
  });

  it('frees lower screw after coverer removed', () => {
    const state = loadLevel(fixture);
    const r = pickScrew(state, 's2');
    expect(r.ok).toBe(true);
    expect(isFree(state, 's1')).toBe(true);
  });
});

describe('dock match-3', () => {
  it('clears three matching colors from dock', () => {
    const state = loadLevel(fixture);
    pickScrew(state, 's3');
    pickScrew(state, 's4');
    // s1 still covered — pick blues first then free s1
    pickScrew(state, 's2');
    pickScrew(state, 's1');
    expect(state.dock.filter((d) => d.color === 'R').length).toBe(0);
    expect(state.dock.length).toBe(1); // s2 blue remains (others not yet)
  });

  it('clearMatches removes a triple', () => {
    const state = loadLevel(fixture);
    state.dock = [
      { id: 'a', color: 'R' },
      { id: 'b', color: 'R' },
      { id: 'c', color: 'R' },
      { id: 'd', color: 'B' },
    ];
    const n = clearMatches(state);
    expect(n).toBe(3);
    expect(state.dock).toEqual([{ id: 'd', color: 'B' }]);
  });
});

describe('overflow fail', () => {
  it('fails when dock full with no triple', () => {
    const level: LevelDef = {
      id: 98,
      dockSize: 5,
      matchSize: 3,
      screws: [
        { id: 'a', x: 10, y: 10, z: 0, color: 'R' },
        { id: 'b', x: 50, y: 10, z: 0, color: 'B' },
        { id: 'c', x: 90, y: 10, z: 0, color: 'G' },
        { id: 'd', x: 130, y: 10, z: 0, color: 'Y' },
        { id: 'e', x: 170, y: 10, z: 0, color: 'P' },
        { id: 'f', x: 210, y: 10, z: 0, color: 'R' },
        { id: 'g', x: 250, y: 10, z: 0, color: 'B' },
        { id: 'h', x: 290, y: 10, z: 0, color: 'G' },
        { id: 'i', x: 50, y: 80, z: 0, color: 'Y' },
        { id: 'j', x: 90, y: 80, z: 0, color: 'P' },
        { id: 'k', x: 130, y: 80, z: 0, color: 'R' },
        { id: 'l', x: 170, y: 80, z: 0, color: 'B' },
        { id: 'm', x: 210, y: 80, z: 0, color: 'G' },
        { id: 'n', x: 250, y: 80, z: 0, color: 'Y' },
        { id: 'o', x: 290, y: 80, z: 0, color: 'P' },
      ],
      covers: [],
    };
    const state = loadLevel(level);
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      const r = pickScrew(state, id);
      expect(r.ok).toBe(true);
    }
    expect(state.dock.length).toBe(5);
    expect(state.status).toBe('failed');
  });
});

describe('fixture win path', () => {
  it('clears board + dock to win', () => {
    const state = loadLevel(fixture);
    // Order: free blues and reds carefully
    pickScrew(state, 's3');
    pickScrew(state, 's4');
    pickScrew(state, 's2'); // frees s1; dock has R,R,B — then pick s1 → RRR clear, B left
    pickScrew(state, 's1');
    pickScrew(state, 's5');
    pickScrew(state, 's6'); // BBB clear
    expect(isWon(state)).toBe(true);
    expect(state.status).toBe('won');
  });

  it('cloneState is deep enough for undo', () => {
    const state = loadLevel(fixture);
    const snap = cloneState(state);
    pickScrew(state, 's2');
    expect(snap.screws.length).toBe(6);
    expect(state.screws.length).toBe(5);
  });

  it('hint returns a free screw id', () => {
    const state = loadLevel(fixture);
    const id = hintScrew(state);
    expect(id).not.toBeNull();
    expect(isFree(state, id!)).toBe(true);
  });
});

describe('authored levels', () => {
  it('has 40 levels', () => {
    expect(LEVEL_COUNT).toBe(40);
  });

  it('level 1 validates color multiples', () => {
    const l = getLevel(1)!;
    expect(validateLevel(l)).toEqual([]);
  });
});
