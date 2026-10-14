import {
  cloneState,
  hintScrew,
  hitTestScrew,
  listFreeScrews,
  loadLevel,
  pickScrew,
} from '../game/engine';
import {
  loadPersist,
  savePersist,
  unlockLevel,
  type PersistData,
} from '../game/persist';
import {
  SCREW_RADIUS,
  type GameState,
  type ScrewColor,
} from '../game/types';
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
type DirectionKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

const COLOR_NAME: Record<ScrewColor, string> = {
  R: 'red',
  B: 'blue',
  G: 'green',
  Y: 'yellow',
  P: 'purple',
  O: 'orange',
};

export function mountApp(root: HTMLElement): void {
  let persist: PersistData = loadPersist();
  let screen: Screen = 'home';
  let levelId = 1;
  let state: GameState | null = null;
  let undoStack: GameState[] = [];
  let hintId: string | null = null;
  let focusedScrewId: string | null = null;
  let freeHintsLeft = 1;
  let layout: BoardLayout | null = null;
  let raf = 0;
  let canvas: HTMLCanvasElement | null = null;
  let resizeHandler: (() => void) | null = null;
  let shakeUntil = 0;
  let initialized = false;
  let dialogReturnFocus: HTMLElement | null = null;
  let remainingStat: HTMLElement | null = null;
  let dockStat: HTMLElement | null = null;
  let freeStat: HTMLElement | null = null;
  let undoButton: HTMLButtonElement | null = null;
  let hintButton: HTMLButtonElement | null = null;

  const el = {
    home: div('screen home', 'home'),
    levels: div('screen levels', 'levels'),
    play: div('screen play', 'play'),
    win: div('screen end-screen win-screen', 'win'),
    fail: div('screen end-screen fail-screen', 'fail'),
    overlay: div('overlay'),
    toast: div('toast'),
    status: document.createElement('div'),
  };
  el.status.className = 'sr-only';
  el.status.setAttribute('role', 'status');
  el.status.setAttribute('aria-live', 'polite');
  el.status.setAttribute('aria-atomic', 'true');
  el.overlay.setAttribute('aria-hidden', 'true');
  el.overlay.inert = true;

  root.append(el.home, el.levels, el.play, el.win, el.fail, el.overlay, el.toast, el.status);

  setInterstitialPresenter(async (reason) => {
    await showModalStub(
      'Ad preview',
      `This is a demo ad screen for ${reason}. No advertisement will play.`,
      'Continue',
    );
  });
  setRewardedPresenter(async (reason) => {
    return showModalStubConfirm(
      'Optional hint',
      `This demo can simulate a rewarded hint for ${reason}. No advertisement will play.`,
      'Use hint',
      'Not now',
    );
  });

  el.overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      const cancel = el.overlay.querySelector<HTMLButtonElement>('[data-dialog-cancel="true"]');
      const fallback = el.overlay.querySelector<HTMLButtonElement>('button');
      (cancel ?? fallback)?.click();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      el.overlay.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'),
    );
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function announce(message: string): void {
    el.status.textContent = '';
    window.setTimeout(() => {
      el.status.textContent = message;
    }, 25);
  }

  function showToast(message: string): void {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    announce(message);
    window.setTimeout(() => el.toast.classList.remove('show'), 1800);
  }

  function openModal(title: string, body: string): HTMLDivElement {
    dialogReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    el.overlay.innerHTML = '';
    el.overlay.classList.add('open');
    el.overlay.removeAttribute('aria-hidden');
    el.overlay.inert = false;

    const modal = div('modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'dialog-title');
    modal.setAttribute('aria-describedby', 'dialog-description');
    const heading = document.createElement('h2');
    heading.id = 'dialog-title';
    heading.textContent = title;
    const copy = document.createElement('p');
    copy.id = 'dialog-description';
    copy.className = 'ad-stub';
    copy.textContent = body;
    modal.append(heading, copy);
    el.overlay.append(modal);
    return modal;
  }

  function closeModal(): void {
    el.overlay.classList.remove('open');
    el.overlay.setAttribute('aria-hidden', 'true');
    el.overlay.inert = true;
    el.overlay.innerHTML = '';
    const returnTarget = dialogReturnFocus;
    dialogReturnFocus = null;
    if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
  }

  function showModalStub(title: string, body: string, okLabel: string): Promise<void> {
    return new Promise((resolve) => {
      const modal = openModal(title, body);
      const ok = button(okLabel, 'btn block', () => {
        closeModal();
        resolve();
      });
      modal.append(ok);
      requestAnimationFrame(() => ok.focus({ preventScroll: true }));
    });
  }

  function showModalStubConfirm(
    title: string,
    body: string,
    yes: string,
    no: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = openModal(title, body);
      const row = div('dialog-actions');
      const cancel = button(no, 'btn secondary', () => {
        closeModal();
        resolve(false);
      });
      cancel.dataset.dialogCancel = 'true';
      const confirm = button(yes, 'btn', () => {
        closeModal();
        resolve(true);
      });
      row.append(cancel, confirm);
      modal.append(row);
      requestAnimationFrame(() => cancel.focus({ preventScroll: true }));
    });
  }

  function setScreen(nextScreen: Screen): void {
    if (screen === 'play' && nextScreen !== 'play' && resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
    screen = nextScreen;
    for (const key of ['home', 'levels', 'play', 'win', 'fail'] as const) {
      el[key].classList.toggle('active', key === nextScreen);
    }
    cancelAnimationFrame(raf);
    if (nextScreen === 'home') renderHome();
    else if (nextScreen === 'levels') renderLevels();
    else if (nextScreen === 'play') {
      renderPlayShell();
      startLoop();
    } else if (nextScreen === 'win') renderWin();
    else renderFail();

    if (initialized) {
      requestAnimationFrame(() => {
        const target = nextScreen === 'play'
          ? canvas
          : nextScreen === 'levels'
            ? el.levels.querySelector<HTMLElement>('[aria-current="step"]')
              ?? el.levels.querySelector<HTMLElement>('button')
            : el[nextScreen].querySelector<HTMLElement>('button');
        target?.focus({ preventScroll: true });
      });
    }

    if (nextScreen === 'home') announce('Home screen. Start a puzzle or choose a level.');
    else if (nextScreen === 'levels') announce(`Level selection. ${persist.unlocked} of ${LEVEL_COUNT} levels unlocked.`);
    else if (nextScreen === 'play') announce(`Level ${levelId}. ${state?.screws.length ?? 0} bolts remain on the board.`);
    else if (nextScreen === 'win') announce(`Level ${levelId} complete. Choose the next level or return home.`);
    else announce(`Level ${levelId} ended. Undo a move or restart the puzzle.`);
    initialized = true;
  }

  function renderHome(): void {
    persist = loadPersist();
    el.home.innerHTML = '';
    const hero = div('hero');
    hero.innerHTML = `
      <div class="hero-kicker"><span class="kicker-dot" aria-hidden="true"></span> OFFLINE PUZZLE · 40 LEVELS</div>
      <div class="logo-bolt" aria-hidden="true"></div>
      <h1>ScrewSort <span>2D</span></h1>
      <p class="tagline">A calm little sorting challenge. Lift uncovered bolts, make color matches, and clear the board at your own pace.</p>
      <div class="hero-chips" aria-label="Game features">
        <span class="hero-chip">40 handcrafted levels</span>
        <span class="hero-chip">Play offline</span>
        <span class="hero-chip">Match three to clear</span>
      </div>
    `;
    const actions = div('stack home-actions');
    actions.append(
      button('Start playing', 'btn block', () => {
        startLevel(Math.min(persist.unlocked, LEVEL_COUNT));
      }),
      button('Browse levels', 'btn secondary block', () => setScreen('levels')),
    );
    const settings = div('home-settings');
    const soundButton = button(
      persist.mute ? 'Sound off' : 'Sound on',
      'btn ghost block',
      () => {
        persist = savePersist({ mute: !persist.mute });
        renderHome();
      },
    );
    soundButton.setAttribute('aria-pressed', String(!persist.mute));
    soundButton.setAttribute('aria-label', `Sound ${persist.mute ? 'off' : 'on'}. Toggle sound preference.`);
    const adsButton = button(
      isAdsRemoved() ? 'Demo ads disabled' : 'Remove ads · demo',
      'btn ghost block',
      async () => {
        if (isAdsRemoved()) {
          showToast('Demo ads are already disabled');
          return;
        }
        await purchaseRemoveAds();
        persist = loadPersist();
        showToast('Demo ads disabled');
        renderHome();
      },
    );
    settings.append(soundButton, adsButton);
    el.home.append(hero, actions, settings);
  }

  function renderLevels(): void {
    persist = loadPersist();
    el.levels.innerHTML = '';
    const head = div('bar level-bar');
    const back = button('←', 'btn ghost icon', () => setScreen('home'));
    back.setAttribute('aria-label', 'Back to home');
    const title = document.createElement('h2');
    title.textContent = 'Choose a level';
    const count = document.createElement('span');
    count.className = 'level-count-pill';
    count.textContent = `${persist.unlocked} / ${LEVEL_COUNT} open`;
    head.append(back, title, count);

    const intro = document.createElement('p');
    intro.className = 'level-intro';
    intro.textContent = 'Each puzzle adds a new layer. Finish the current set to unlock the next.';
    const grid = div('level-grid');
    grid.setAttribute('aria-label', 'Puzzle levels');
    for (let i = 1; i <= LEVEL_COUNT; i++) {
      const locked = i > persist.unlocked;
      const levelButton = button(String(i).padStart(2, '0'), locked ? 'lvl locked' : 'lvl', () => {
        if (locked) return;
        startLevel(i);
      });
      levelButton.setAttribute('aria-label', `Level ${i}${locked ? ', locked' : ''}`);
      if (locked) {
        levelButton.disabled = true;
        levelButton.title = 'Complete earlier levels to unlock';
      } else if (i === persist.unlocked) {
        levelButton.setAttribute('aria-current', 'step');
      }
      grid.append(levelButton);
    }
    el.levels.append(head, intro, grid);
  }

  function startLevel(id: number): void {
    const level = getLevel(id);
    if (!level) {
      showToast('That level is not available');
      return;
    }
    levelId = id;
    state = loadLevel(level);
    undoStack = [];
    hintId = null;
    freeHintsLeft = 1;
    focusedScrewId = listFreeScrews(state)[0]?.id ?? null;
    setScreen('play');
  }

  function renderPlayShell(): void {
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
    remainingStat = null;
    dockStat = null;
    freeStat = null;
    undoButton = null;
    hintButton = null;
    el.play.innerHTML = '';

    const bar = div('bar game-bar');
    const back = button('←', 'btn ghost icon', () => setScreen('levels'));
    back.setAttribute('aria-label', 'Back to levels');
    const levelInfo = div('level-info');
    const eyebrow = document.createElement('span');
    eyebrow.className = 'level-eyebrow';
    eyebrow.textContent = `PUZZLE ${String(levelId).padStart(2, '0')} / ${LEVEL_COUNT}`;
    const title = document.createElement('h2');
    title.id = 'level-title';
    title.textContent = `Level ${levelId}`;
    levelInfo.append(eyebrow, title);
    undoButton = button('Undo', 'btn ghost undo-button', doUndo);
    undoButton.setAttribute('aria-label', 'Undo previous move');
    undoButton.setAttribute('aria-keyshortcuts', 'Control+Z Meta+Z');
    bar.append(back, levelInfo, undoButton);

    const playLayout = div('play-layout');
    const wrap = div('canvas-wrap');
    wrap.setAttribute('aria-label', 'Puzzle board');
    canvas = document.createElement('canvas');
    canvas.className = 'game-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-describedby', 'game-instructions');
    canvas.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight Enter Space Escape Control+Z Meta+Z');
    wrap.append(canvas);

    const sidebar = div('play-sidebar');
    const mission = div('play-card mission-card');
    mission.innerHTML = `
      <span class="sidebar-eyebrow">THE GAMEPLAN</span>
      <h3>Sort by color</h3>
      <p>Choose an uncovered bolt and move it into the dock. Match three bolts of one color to clear them.</p>
      <ol class="rule-list">
        <li><span class="rule-number">1</span><span>Only uncovered bolts can move.</span></li>
        <li><span class="rule-number">2</span><span>Make a triple before the dock fills.</span></li>
      </ol>
    `;

    const statusCard = div('play-card status-card');
    statusCard.innerHTML = `
      <span class="sidebar-eyebrow">PUZZLE STATUS</span>
      <div class="sidebar-stats" aria-label="Current puzzle progress">
        <div class="stat-card"><span>Bolts left</span><strong data-stat="remaining">0</strong></div>
        <div class="stat-card"><span>In dock</span><strong data-stat="dock">0/5</strong></div>
        <div class="stat-card"><span>Free now</span><strong data-stat="free">0</strong></div>
      </div>
      <div class="level-progress" aria-hidden="true"><span data-progress></span></div>
      <p class="sidebar-footnote">Dock capacity ${state?.dockSize ?? 5} · Match ${state?.matchSize ?? 3}</p>
    `;
    remainingStat = statusCard.querySelector('[data-stat="remaining"]');
    dockStat = statusCard.querySelector('[data-stat="dock"]');
    freeStat = statusCard.querySelector('[data-stat="free"]');

    const tools = div('tools');
    hintButton = button('Hint · 1 free', 'btn secondary', () => void doHint());
    hintButton.setAttribute('aria-label', 'Highlight a useful bolt');
    const restartButton = button('Restart', 'btn ghost', () => void doRestart());
    restartButton.setAttribute('aria-label', 'Restart this level');
    tools.append(hintButton, restartButton);
    sidebar.append(mission, statusCard, tools);
    playLayout.append(wrap, sidebar);

    const instructions = div('sr-only');
    instructions.id = 'game-instructions';
    instructions.textContent = 'Use the arrow keys to move the focus between free bolts. Press Enter or Space to move the focused bolt into the dock. Press Control or Command plus Z to undo, or Escape to return to the level list. You can also tap or click a bolt.';
    el.play.append(bar, playLayout, instructions);

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
      const context = canvas.getContext('2d');
      if (context) context.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout = computeLayout(cssW, cssH);
    };
    resize();
    resizeHandler = resize;
    window.addEventListener('resize', resize, { passive: true });

    canvas.addEventListener('pointerdown', (event) => {
      if (!state || !layout || !canvas || state.status !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const point = screenToBoard(layout, event.clientX - rect.left, event.clientY - rect.top);
      const hit = hitTestScrew(state, point.x, point.y, SCREW_RADIUS * 1.15);
      if (!hit) return;
      event.preventDefault();
      focusedScrewId = hit.id;
      attemptPick(hit.id);
    });

    canvas.addEventListener('keydown', (event) => {
      if (!state || state.status !== 'playing') return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        doUndo();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setScreen('levels');
        return;
      }
      if (isDirectionKey(event.key)) {
        event.preventDefault();
        moveFocusedScrew(event.key);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        const target = state.screws.find((screw) => screw.id === focusedScrewId)
          ?? listFreeScrews(state)[0];
        if (target) attemptPick(target.id);
        else showToast('No free bolt is available');
      }
    });

    updatePlaySummary();
  }

  function updatePlaySummary(): void {
    if (!state) return;
    const free = listFreeScrews(state);
    if (remainingStat) remainingStat.textContent = String(state.screws.length);
    if (dockStat) dockStat.textContent = `${state.dock.length}/${state.dockSize}`;
    if (freeStat) freeStat.textContent = String(free.length);
    if (undoButton) undoButton.disabled = undoStack.length === 0;
    if (hintButton) {
      hintButton.textContent = freeHintsLeft > 0 ? `Hint · ${freeHintsLeft} free` : 'Hint · ad preview';
    }
    const progress = el.play.querySelector<HTMLElement>('[data-progress]');
    if (progress) progress.style.width = `${Math.min(100, (levelId / LEVEL_COUNT) * 100)}%`;
    canvas?.setAttribute(
      'aria-label',
      `Level ${levelId}. ${state.screws.length} bolts remain on the board; ${state.dock.length} of ${state.dockSize} dock spaces are filled; ${free.length} bolts are free to move. Use arrow keys to focus a free bolt, then press Enter or Space.`,
    );
  }

  function attemptPick(screwId: string): void {
    if (!state || state.status !== 'playing') return;
    const screw = state.screws.find((item) => item.id === screwId);
    if (!screw) return;

    undoStack.push(cloneState(state));
    const result = pickScrew(state, screwId);
    if (!result.ok) {
      undoStack.pop();
      shakeUntil = performance.now() + 280;
      showToast(result.reason === 'covered' ? 'That bolt is covered' : 'That bolt cannot move');
      return;
    }

    hintId = null;
    focusedScrewId = listFreeScrews(state)[0]?.id ?? null;
    updatePlaySummary();
    if (result.cleared > 0) {
      showToast('Match cleared');
      announce(`${result.cleared} ${COLOR_NAME[screw.color]} bolts cleared. ${state.screws.length} remain on the board.`);
    } else {
      announce(`${COLOR_NAME[screw.color]} bolt moved to the dock. ${state.dock.length} of ${state.dockSize} spaces are filled.`);
    }

    const nextStatus = state.status as 'playing' | 'won' | 'failed';
    if (nextStatus === 'won') {
      unlockLevel(levelId + 1);
      announce(`Level ${levelId} complete. The board and dock are clear.`);
      void afterWin();
    } else if (nextStatus === 'failed') {
      shakeUntil = performance.now() + 400;
      announce('Dock full. Undo a move or restart the level.');
      void afterFail();
    }
  }

  function moveFocusedScrew(key: DirectionKey): void {
    if (!state) return;
    const free = listFreeScrews(state);
    if (free.length === 0) {
      showToast('No free bolt is available');
      return;
    }
    const current = free.find((screw) => screw.id === focusedScrewId) ?? free[0]!;
    const vectors: Record<DirectionKey, { dx: number; dy: number }> = {
      ArrowRight: { dx: 1, dy: 0 },
      ArrowLeft: { dx: -1, dy: 0 },
      ArrowDown: { dx: 0, dy: 1 },
      ArrowUp: { dx: 0, dy: -1 },
    };
    const { dx, dy } = vectors[key];
    const candidates = free
      .filter((screw) => screw.id !== current.id)
      .map((screw) => {
        const x = screw.x - current.x;
        const y = screw.y - current.y;
        const forward = x * dx + y * dy;
        const cross = Math.abs(x * dy - y * dx);
        return { screw, forward, score: forward + cross * 2.2 };
      });
    let next = candidates
      .filter((candidate) => candidate.forward > 0)
      .sort((a, b) => a.score - b.score)[0]?.screw;
    if (!next) {
      next = [...free]
        .filter((screw) => screw.id !== current.id)
        .sort((a, b) => {
          if (dx !== 0) return dx > 0 ? a.x - b.x || Math.abs(a.y - current.y) - Math.abs(b.y - current.y)
            : b.x - a.x || Math.abs(a.y - current.y) - Math.abs(b.y - current.y);
          return dy > 0 ? a.y - b.y || Math.abs(a.x - current.x) - Math.abs(b.x - current.x)
            : b.y - a.y || Math.abs(a.x - current.x) - Math.abs(b.x - current.x);
        })[0];
    }
    if (!next) return;
    focusedScrewId = next.id;
    announce(`${COLOR_NAME[next.color]} bolt focused. Press Enter or Space to move it.`);
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
    focusedScrewId = listFreeScrews(state)[0]?.id ?? null;
    updatePlaySummary();
    announce('Last move undone.');
  }

  async function doHint(): Promise<void> {
    if (!state || state.status !== 'playing') return;
    if (freeHintsLeft <= 0) {
      const approved = await showRewarded('hint');
      if (!approved) {
        showToast('Hint cancelled');
        return;
      }
    } else {
      freeHintsLeft -= 1;
    }
    const id = hintScrew(state);
    if (!id) {
      showToast('No free bolt');
      updatePlaySummary();
      return;
    }
    hintId = id;
    focusedScrewId = id;
    updatePlaySummary();
    showToast('Hint highlighted');
    announce('A useful free bolt is highlighted. Press Enter or Space to move it.');
  }

  async function doRestart(): Promise<void> {
    await showInterstitial('restart');
    startLevel(levelId);
    announce(`Level ${levelId} restarted.`);
  }

  function startLoop(): void {
    const tick = (): void => {
      if (screen !== 'play' || !canvas || !state || !layout) return;
      const context = canvas.getContext('2d');
      if (context) {
        context.save();
        if (performance.now() < shakeUntil) {
          const magnitude = 3;
          context.translate((Math.random() - 0.5) * magnitude * 2, (Math.random() - 0.5) * magnitude * 2);
        }
        drawBoard(context, state, layout, hintId, focusedScrewId);
        context.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function renderWin(): void {
    el.win.innerHTML = '';
    const box = div('end-card success-card');
    box.innerHTML = `
      <span class="end-mark" aria-hidden="true">✓</span>
      <span class="end-eyebrow">LEVEL CLEARED</span>
      <h1>Beautifully sorted</h1>
      <p class="tagline">Level ${levelId} is complete. The board and dock are clear.</p>
    `;
    const actions = div('stack end-actions');
    const next = levelId + 1;
    if (next <= LEVEL_COUNT) actions.append(button(`Next level · ${next}`, 'btn block', () => startLevel(next)));
    actions.append(
      button('Choose a level', 'btn secondary block', () => setScreen('levels')),
      button('Back home', 'btn ghost block', () => setScreen('home')),
    );
    el.win.append(box, actions);
  }

  function renderFail(): void {
    el.fail.innerHTML = '';
    const box = div('end-card fail-card');
    box.innerHTML = `
      <span class="end-mark" aria-hidden="true">!</span>
      <span class="end-eyebrow">DOCK IS FULL</span>
      <h1>Try another move</h1>
      <p class="tagline">No triple match yet. Undo your last pick, then plan a clearer path.</p>
    `;
    const actions = div('stack end-actions');
    actions.append(
      button('Undo last move', 'btn block', () => {
        if (undoStack.length) {
          state = undoStack.pop()!;
          hintId = null;
          focusedScrewId = listFreeScrews(state)[0]?.id ?? null;
          setScreen('play');
        } else {
          showToast('No move to undo');
        }
      }),
      button('Restart level', 'btn secondary block', () => void doRestart()),
      button('Choose a level', 'btn ghost block', () => setScreen('levels')),
    );
    el.fail.append(box, actions);
  }

  setScreen('home');
}

function isDirectionKey(key: string): key is DirectionKey {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
}

function div(className: string, screenName?: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = className;
  if (screenName) element.dataset.screen = screenName;
  return element;
}

function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = label;
  element.addEventListener('click', onClick);
  return element;
}
