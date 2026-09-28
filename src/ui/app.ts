/**
 * ScrewSort 2D UI — Home, level select, play, win/fail; mute; ads wired.
 * Tap free bolts → dock match-3 (NOT TubeSort / HexPour / 3D).
 */
import {
  cloneState,
  hintScrew,
  hitTestScrew,
  loadLevel,
  pickScrew,
} from '../game/engine';
import {
  loadPersist,
  savePersist,
  unlockLevel,
  type PersistData,
} from '../game/persist';
import { SCREW_RADIUS, type GameState } from '../game/types';
import { LEVEL_COUNT, getLevel } from '../levels/index';
import {
  computeLayout,
  drawBoard,
  screenToBoard,
  type BoardLayout,
} from '../render/board';
import {
  isAdsRemoved,
  purchaseRemoveAds,
  setInterstitialPresenter,
  setRewardedPresenter,
  showInterstitial,
  showRewarded,
} from '../ads/stubs';

type Screen = 'home' | 'levels' | 'play' | 'win' | 'fail';

export function mountApp(root: HTMLElement): void {
  let persist: PersistData = loadPersist();
  let screen: Screen = 'home';
  let levelId = 1;
  let state: GameState | null = null;
  let undoStack: GameState[] = [];
  let hintId: string | null = null;
  let freeHintsLeft = 1;
  let layout: BoardLayout | null = null;
  let raf = 0;
  let canvas: HTMLCanvasElement | null = null;
  let shakeUntil = 0;

  const el = {
    home: div('screen', 'home'),
    levels: div('screen', 'levels'),
    play: div('screen', 'play'),
    win: div('screen', 'win'),
    fail: div('screen', 'fail'),
    overlay: div('overlay'),
    toast: div('toast'),
  };

  root.append(el.home, el.levels, el.play, el.win, el.fail, el.overlay, el.toast);

  setInterstitialPresenter(async (reason) => {
    await showModalStub(
      'Ad stub — Interstitial',
      `Reason: ${reason}\n(No real ad SDK in MVP)`,
      'Continue',
    );
  });
  setRewardedPresenter(async (reason) => {
    return showModalStubConfirm(
      'Ad stub — Rewarded',
      `Watch stub for: ${reason}\nGrant reward?`,
      'Earn reward',
      'Cancel',
    );
  });

  function showToast(msg: string): void {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    setTimeout(() => el.toast.classList.remove('show'), 1600);
  }

  function showModalStub(title: string, body: string, okLabel: string): Promise<void> {
    return new Promise((resolve) => {
      el.overlay.className = 'overlay open';
      el.overlay.innerHTML = '';
      const modal = div('modal');
      modal.innerHTML = `<div class="ad-stub"><strong>${esc(title)}</strong>${esc(body).replace(/\n/g, '<br/>')}</div>`;
      modal.append(
        button(okLabel, 'btn block', () => {
          el.overlay.className = 'overlay';
          el.overlay.innerHTML = '';
          resolve();
        }),
      );
      el.overlay.append(modal);
    });
  }

  function showModalStubConfirm(
    title: string,
    body: string,
    yes: string,
    no: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      el.overlay.className = 'overlay open';
      el.overlay.innerHTML = '';
      const modal = div('modal');
      modal.innerHTML = `<div class="ad-stub"><strong>${esc(title)}</strong>${esc(body).replace(/\n/g, '<br/>')}</div>`;
      const row = div('');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.append(
        button(no, 'btn secondary', () => {
          el.overlay.className = 'overlay';
          el.overlay.innerHTML = '';
          resolve(false);
        }),
        button(yes, 'btn', () => {
          el.overlay.className = 'overlay';
          el.overlay.innerHTML = '';
          resolve(true);
        }),
      );
      modal.append(row);
      el.overlay.append(modal);
    });
  }

  function setScreen(s: Screen): void {
    screen = s;
    for (const k of ['home', 'levels', 'play', 'win', 'fail'] as const) {
      el[k].classList.toggle('active', k === s);
    }
    cancelAnimationFrame(raf);
    if (s === 'home') renderHome();
    else if (s === 'levels') renderLevels();
    else if (s === 'play') {
      renderPlayShell();
      startLoop();
    } else if (s === 'win') renderWin();
    else if (s === 'fail') renderFail();
  }

  function renderHome(): void {
    persist = loadPersist();
    el.home.innerHTML = '';
    const hero = div('hero');
    hero.innerHTML = `
      <div class="logo-bolt" aria-hidden="true"></div>
      <h1>ScrewSort 2D</h1>
      <p class="tagline">Pull matching bolts into the dock. Clear the board. Offline puzzle — original flat hardware art.</p>
    `;
    const actions = div('stack');
    actions.append(
      button('Play', 'btn block', () => {
        startLevel(Math.min(persist.unlocked, LEVEL_COUNT));
      }),
      button('Levels', 'btn secondary block', () => setScreen('levels')),
      button(
        persist.mute ? 'Sound: Off' : 'Sound: On',
        'btn ghost block',
        () => {
          persist = savePersist({ mute: !persist.mute });
          renderHome();
        },
      ),
      button(
        isAdsRemoved() ? 'Ads removed ✓' : 'Remove ads (stub)',
        'btn ghost block',
        async () => {
          if (isAdsRemoved()) {
            showToast('Ads already removed');
            return;
          }
          await purchaseRemoveAds();
          persist = loadPersist();
          showToast('Ads removed (stub)');
          renderHome();
        },
      ),
    );
    el.home.append(hero, actions);
  }

  function renderLevels(): void {
    persist = loadPersist();
    el.levels.innerHTML = '';
    const head = div('bar');
    head.append(
      button('← Back', 'btn ghost', () => setScreen('home')),
      (() => {
        const t = document.createElement('h2');
        t.textContent = 'Levels';
        return t;
      })(),
    );
    const grid = div('level-grid');
    for (let i = 1; i <= LEVEL_COUNT; i++) {
      const locked = i > persist.unlocked;
      const b = button(String(i), locked ? 'lvl locked' : 'lvl', () => {
        if (locked) {
          showToast('Locked');
          return;
        }
        startLevel(i);
      });
      if (locked) b.setAttribute('aria-disabled', 'true');
      grid.append(b);
    }
    el.levels.append(head, grid);
  }

  function startLevel(id: number): void {
    const level = getLevel(id);
    if (!level) {
      showToast('Missing level');
      return;
    }
    levelId = id;
    state = loadLevel(level);
    undoStack = [];
    hintId = null;
    freeHintsLeft = 1;
    setScreen('play');
  }

  function renderPlayShell(): void {
    el.play.innerHTML = '';
    const bar = div('bar');
    bar.append(
      button('←', 'btn ghost icon', () => setScreen('levels')),
      (() => {
        const t = document.createElement('h2');
        t.id = 'level-title';
        t.textContent = `Level ${levelId}`;
        return t;
      })(),
      button('Undo', 'btn ghost', () => doUndo()),
    );
    const wrap = div('canvas-wrap');
    canvas = document.createElement('canvas');
    canvas.className = 'game-canvas';
    wrap.append(canvas);
    const tools = div('tools');
    tools.append(
      button('Hint', 'btn secondary', () => void doHint()),
      button('Restart', 'btn ghost', () => void doRestart()),
    );
    el.play.append(bar, wrap, tools);

    const resize = (): void => {
      if (!canvas) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(280, rect.width);
      const cssH = Math.max(360, rect.height);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout = computeLayout(cssW, cssH);
    };
    resize();
    window.addEventListener('resize', resize);

    canvas.addEventListener('pointerdown', (ev) => {
      if (!state || !layout || !canvas || state.status !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const { x, y } = screenToBoard(layout, sx, sy);
      const hit = hitTestScrew(state, x, y, SCREW_RADIUS * 1.15);
      if (!hit) return;
      undoStack.push(cloneState(state));
      const result = pickScrew(state, hit.id);
      if (!result.ok) {
        undoStack.pop();
        shakeUntil = performance.now() + 280;
        showToast(result.reason === 'covered' ? 'Blocked!' : 'Cannot pick');
        return;
      }
      hintId = null;
      if (!persist.mute && result.cleared > 0) {
        /* juice via toast */
        showToast('Match!');
      }
      // pickScrew mutates status; re-read without the earlier 'playing' narrow
      const nextStatus = state.status as typeof state.status | 'won' | 'failed';
      if (nextStatus === 'won') {
        unlockLevel(levelId + 1);
        void afterWin();
      } else if (nextStatus === 'failed') {
        shakeUntil = performance.now() + 400;
        void afterFail();
      }
    });
  }

  async function afterWin(): Promise<void> {
    await showInterstitial('win');
    setScreen('win');
  }

  async function afterFail(): Promise<void> {
    await showInterstitial('fail');
    setScreen('fail');
  }

  function doUndo(): void {
    if (!state || undoStack.length === 0) {
      showToast('Nothing to undo');
      return;
    }
    state = undoStack.pop()!;
    hintId = null;
  }

  async function doHint(): Promise<void> {
    if (!state || state.status !== 'playing') return;
    if (freeHintsLeft <= 0) {
      const ok = await showRewarded('hint');
      if (!ok) {
        showToast('Hint cancelled');
        return;
      }
    } else {
      freeHintsLeft -= 1;
    }
    const id = hintScrew(state);
    if (!id) {
      showToast('No free screw');
      return;
    }
    hintId = id;
    showToast('Hint highlighted');
  }

  async function doRestart(): Promise<void> {
    await showInterstitial('restart');
    startLevel(levelId);
  }

  function startLoop(): void {
    const tick = (): void => {
      if (screen !== 'play' || !canvas || !state || !layout) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        if (performance.now() < shakeUntil) {
          const mag = 3;
          ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
        }
        drawBoard(ctx, state, layout, hintId);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function renderWin(): void {
    el.win.innerHTML = '';
    const box = div('end-card');
    box.innerHTML = `<h1>Cleared!</h1><p class="tagline">Level ${levelId} complete. Board + dock empty.</p>`;
    const actions = div('stack');
    const next = levelId + 1;
    if (next <= LEVEL_COUNT) {
      actions.append(
        button(`Next — Level ${next}`, 'btn block', () => startLevel(next)),
      );
    }
    actions.append(
      button('Levels', 'btn secondary block', () => setScreen('levels')),
      button('Home', 'btn ghost block', () => setScreen('home')),
    );
    el.win.append(box, actions);
  }

  function renderFail(): void {
    el.fail.innerHTML = '';
    const box = div('end-card fail');
    box.innerHTML = `<h1>Dock full</h1><p class="tagline">No triple match — undo or restart.</p>`;
    const actions = div('stack');
    actions.append(
      button('Undo last', 'btn block', () => {
        if (undoStack.length) {
          state = undoStack.pop()!;
          hintId = null;
          setScreen('play');
        } else {
          showToast('No undo');
        }
      }),
      button('Restart', 'btn secondary block', () => void doRestart()),
      button('Levels', 'btn ghost block', () => setScreen('levels')),
    );
    el.fail.append(box, actions);
  }

  setScreen('home');
}

function div(className: string, id?: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = className;
  if (id) d.dataset.screen = id;
  return d;
}

function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
