import './style.css';
import { registerSW } from 'virtual:pwa-register';
import {
  CELLS, TRACE_SIZE, addDays, dateKey, generatePuzzle,
  isSolved, parseDateKey, popcount, type Puzzle
} from './puzzle';
import { loadState, reconcileState, type LoadResult, type Point, type SavedState } from './storage';

type Mode = 'fill' | 'pencil' | 'eraser';
type RouteState = { scrollY?: number; focusId?: string };

const app = document.querySelector<HTMLDivElement>('#app')!;
const today = new Date();
const todayKey = dateKey(today);
const demoDate = '2026-08-14';
const realPrefix = 'hex-notebook:v1:';
const demoPrefix = 'demo:hex-notebook:v1:';
let cleanupPage = () => {};

const logo = `
  <svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
    <path fill="none" stroke="currentColor" stroke-width="4" d="m32 7 21 12v26L32 57 11 45V19z"/>
    <path fill="#f4c95d" d="m32 17 13 8v14l-13 8-13-8V25z"/>
  </svg>`;

function storageKey(date: string, demo: boolean): string {
  return `${demo ? demoPrefix : realPrefix}${date}`;
}

function sampleState(puzzle: Puzzle): SavedState {
  const marks = Array(CELLS.length).fill(0);
  const answerCells = CELLS.map((_, index) => index).filter((index) => puzzle.targetMask & (1 << index));
  const noteCells = CELLS.map((_, index) => index)
    .filter((index) => !(puzzle.targetMask & (1 << index)) && !puzzle.clues.has(index));
  answerCells.slice(0, 3).forEach((index) => { marks[index] = 1; });
  noteCells.slice(0, 2).forEach((index) => { marks[index] = 2; });
  return {
    marks,
    strokes: [[
      { x: 215, y: 205 }, { x: 254, y: 170 }, { x: 302, y: 178 },
      { x: 338, y: 220 }, { x: 323, y: 252 }
    ]],
    elapsed: 172,
    completed: false
  };
}

function readPuzzleState(date: string, demo: boolean): LoadResult {
  const puzzle = generatePuzzle(date);
  const storage = demo ? sessionStorage : localStorage;
  const key = storageKey(date, demo);
  if (demo) {
    try {
      if (storage.getItem(key) === null) storage.setItem(key, JSON.stringify(sampleState(puzzle)));
    } catch {
      return { state: sampleState(puzzle), repaired: false, unreadable: true };
    }
  }
  return reconcileState(loadState(storage, key), puzzle);
}

function clearDemoData(): void {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(demoPrefix)) sessionStorage.removeItem(key);
    }
  } catch {
    // Demo still resets in memory when browser storage is unavailable.
  }
}

function archiveMarkup(demo: boolean): string {
  if (demo) return '<p>The demo does not open or change your puzzle archive.</p>';
  const items = Array.from({ length: 21 }, (_, index) => {
    const date = addDays(today, -7 - index);
    const key = dateKey(date);
    const saved = readPuzzleState(key, false).state;
    const label = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    return `<li><a class="archive-link" data-route href="/?day=${key}"><span>${label}</span>${saved.completed ? '<span class="archive-done" aria-label="Completed">✓</span>' : ''}</a></li>`;
  }).join('');
  return `<p>Puzzles become available after seven days. Completed puzzles have a check mark.</p><ul class="archive-list">${items}</ul>`;
}

function dialogs(demo: boolean): string {
  return `
    <dialog id="archive-dialog" aria-labelledby="archive-title">
      <div class="dialog-head"><h2 id="archive-title">Available archive puzzles</h2><button class="icon-button" data-close="archive-dialog" aria-label="Close archive">×</button></div>
      <div class="dialog-body">${archiveMarkup(demo)}</div>
    </dialog>
    <dialog id="rules-dialog" aria-labelledby="rules-title">
      <div class="dialog-head"><h2 id="rules-title">How to solve the puzzle</h2><button class="icon-button" data-close="rules-dialog" aria-label="Close instructions">×</button></div>
      <div class="dialog-body">
        <ol>
          <li>Fill exactly seven cells. Every filled cell must connect through a shared edge.</li>
          <li>A numbered clue gives the exact number of filled cells touching it. Clue cells cannot be filled.</li>
          <li>Use × marks and pencil lines as notes. Neither type of note counts as a filled answer.</li>
        </ol>
        <p><strong>Keyboard:</strong> Use arrow keys for four directions. Hold Shift with Up or Down for the other two.</p>
        <p>Press Space to mark a cell. Press F, P, or E for tools, U to undo, and ? for these rules.</p>
      </div>
    </dialog>`;
}

function shell(content: string, demo = false): string {
  return `
    <header class="site-header">
      <a class="brand" id="nav-brand" data-route href="/" aria-label="Hex Daily Notebook home">${logo}<span>Hex Daily Notebook</span></a>
      <nav class="site-nav" aria-label="Main navigation">
        <a class="nav-link" id="nav-home" data-route href="/">Home</a>
        <a class="nav-link" id="nav-demo" data-route href="/demo">Demo</a>
        <a class="nav-link" id="nav-privacy" data-route href="/privacy">Privacy</a>
      </nav>
    </header>
    ${demo ? `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><span>Your daily puzzle data is not read or changed.</span><div><button id="reset-demo" type="button">Reset demo</button><a id="start-real" data-route href="/">Start for real</a></div></aside>` : ''}
    <div id="route-status" class="sr-only" role="status" aria-live="polite"></div>
    ${content}
    <footer class="site-footer">
      <p>Solve one free hex puzzle each day.</p>
      <nav class="footer-links" aria-label="Site information">
        <a data-route href="/privacy">Privacy</a><a data-route href="/terms">Terms</a>
        <a href="https://sociobot.in" rel="external" aria-label="Built by Param Factory, external site">Built by Param Factory ↗</a><span>Build 1.1.0</span>
      </nav>
    </footer>
    ${dialogs(demo)}`;
}

function setMeta(title: string, description: string, canonicalPath: string): void {
  document.title = title;
  const canonical = `https://hex-daily-notebook.sociobot.in${canonicalPath}`;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonical);
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', canonical);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', title);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', description);
}

function bindDialogs(signal: AbortSignal): void {
  const archive = document.querySelector<HTMLDialogElement>('#archive-dialog');
  const rules = document.querySelector<HTMLDialogElement>('#rules-dialog');
  document.querySelector('#archive-open')?.addEventListener('click', () => archive?.showModal(), { signal });
  document.querySelector('#rules-open')?.addEventListener('click', () => rules?.showModal(), { signal });
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((button) => button.addEventListener('click', () => {
    document.querySelector<HTMLDialogElement>(`#${button.dataset.close}`)?.close();
  }, { signal }));
  document.querySelectorAll<HTMLDialogElement>('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  }, { signal }));
}

function legalPage(kind: 'privacy' | 'terms'): void {
  const abort = new AbortController();
  const isPrivacy = kind === 'privacy';
  if (isPrivacy) {
    setMeta('Privacy — Hex Daily Notebook', 'Read how Hex Daily Notebook stores puzzle progress in your browser.', '/privacy');
    app.innerHTML = shell(`
      <main id="main" class="legal">
        <p class="eyebrow">Updated 5 September 2026</p><h1 tabindex="-1">Read how your puzzle data is stored</h1>
        <p>Hex Daily Notebook has no account, ads, analytics, cookies, or tracking pixels.</p>
        <h2>Data in your browser</h2><p>Filled cells, crosses, pencil lines, elapsed time, and completion stay in browser storage on this device.</p>
        <p>Demo data uses a separate session-storage key. Resetting or leaving the demo removes it without changing daily puzzle data.</p>
        <h2>Network requests</h2><p>Your first visit downloads static app files from this site. The app does not load third-party scripts, fonts, or services.</p>
        <p>After the first visit is cached, the puzzle can reload offline. Offline changes stay in your browser.</p>
        <h2>Delete your data</h2><p>Use your browser’s site-data controls to delete saved puzzle progress and cached app files.</p>
        <h2>Contact</h2><p>Email privacy questions to <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>
      </main>`);
  } else {
    setMeta('Terms — Hex Daily Notebook', 'Read the terms for using this free daily hex puzzle.', '/terms');
    app.innerHTML = shell(`
      <main id="main" class="legal">
        <p class="eyebrow">Updated 5 September 2026</p><h1 tabindex="-1">Read the terms for this free puzzle</h1>
        <p>Hex Daily Notebook is free for personal use. No account or purchase is required.</p>
        <h2>Use the puzzle fairly</h2><p>You may play and share the copied result. Do not disrupt the site or present this puzzle as your product.</p>
        <h2>Availability</h2><p>The app is provided as-is. Continuous access and preservation of browser-stored data are not guaranteed.</p>
        <h2>Original work</h2><p>The puzzle rules, interface, and editorial image were created for Hex Daily Notebook.</p>
        <p>The source code is available under the MIT License.</p>
      </main>`);
  }
  bindDialogs(abort.signal);
  cleanupPage = () => abort.abort();
}

function errorPage(message: string, missing = false): void {
  const abort = new AbortController();
  const title = missing ? 'Page not found — Hex Daily Notebook' : 'Puzzle unavailable — Hex Daily Notebook';
  const heading = missing ? 'Page not found' : 'This puzzle is unavailable';
  setMeta(title, 'Return to today’s daily hex puzzle.', missing ? '/404' : '/');
  app.innerHTML = shell(`<main id="main" class="legal error-page"><p class="eyebrow">${missing ? '404' : 'Puzzle unavailable'}</p><h1 tabindex="-1">${heading}</h1><p>${message}</p><p><a class="action-button inline-action" data-route href="/">Open today’s puzzle</a></p></main>`);
  bindDialogs(abort.signal);
  cleanupPage = () => abort.abort();
}

function polygonPoints(cx: number, cy: number, radius: number): string {
  return Array.from({ length: 6 }, (_, side) => {
    const angle = Math.PI / 180 * (60 * side - 30);
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

function position(index: number): Point {
  const { q, r } = CELLS[index];
  return { x: 320 + 94 * (q + r / 2), y: 300 + 81.5 * r };
}

function boardMarkup(puzzle: Puzzle, state: SavedState): string {
  const cells = CELLS.map((_, index) => {
    const point = position(index);
    const clue = puzzle.clues.get(index);
    const mark = state.marks[index];
    const classes = ['hex-cell', clue !== undefined ? 'clue' : '', mark === 1 ? 'filled' : '', mark === 2 ? 'crossed' : ''].filter(Boolean).join(' ');
    const stateLabel = clue !== undefined ? `clue ${clue}, fixed` : mark === 1 ? 'filled' : mark === 2 ? 'marked excluded' : 'blank';
    return `<g id="cell-${index}" class="${classes}" data-cell="${index}" role="button" tabindex="0" aria-label="Cell ${index + 1}, ${stateLabel}">
      <polygon points="${polygonPoints(point.x, point.y, 51)}" />
      <path class="cross" d="M${point.x - 17} ${point.y - 17}L${point.x + 17} ${point.y + 17}M${point.x + 17} ${point.y - 17}L${point.x - 17} ${point.y + 17}" />
      ${clue !== undefined ? `<circle class="clue-pin" cx="${point.x}" cy="${point.y}" r="22"/><text class="clue-number" x="${point.x}" y="${point.y + 1}">${clue}</text>` : ''}
    </g>`;
  }).join('');
  return `<svg id="hex-board" class="hex-board fill" viewBox="0 0 640 600" role="group" aria-label="Hex puzzle grid. Use arrow keys to move and Space to mark a cell.">
    <defs><pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(25)"><rect width="12" height="12" fill="#0c6173"/><line x1="0" y1="0" x2="0" y2="12" stroke="#9ef0e8" stroke-width="5"/></pattern></defs>
    <rect class="hit-surface" width="640" height="600"/><circle class="construction-ring" cx="320" cy="300" r="282"/><circle class="construction-ring" cx="320" cy="300" r="265"/>
    <g id="cells">${cells}</g><g id="strokes" aria-hidden="true"></g>
  </svg>`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function supportingSections(): string {
  return `
    <section class="how-section" aria-labelledby="how-title">
      <div class="how-copy"><p class="eyebrow">Three steps</p><h2 id="how-title">How it works</h2>
        <ol class="step-list">
          <li><h3>Read each numbered clue</h3><p>It gives the exact number of filled cells touching that clue.</p></li>
          <li><h3>Mark your answer</h3><p>Fill seven connected cells. Use × notes and pencil lines while you test ideas.</p></li>
          <li><h3>Check the puzzle</h3><p>The app confirms when every clue and connection is correct.</p></li>
        </ol>
      </div>
      <picture class="field-image"><source srcset="/assets/blueprint-still-life.avif" type="image/avif"><img src="/assets/blueprint-still-life.webp" width="900" height="600" loading="lazy" decoding="async" alt="A brass compass and pencil beside a hand-drawn hex grid"></picture>
    </section>
    <section class="privacy-summary" aria-labelledby="limits-title">
      <p class="eyebrow">Privacy and limits</p><h2 id="limits-title">What this app does not do</h2>
      <p>It does not need an account or purchase. It has no ads, analytics, cookies, tracking pixels, or third-party services.</p>
      <p>Your puzzle progress stays in this browser. The app does not sync progress between devices.</p>
      <a data-route href="/privacy">Read the privacy details</a>
    </section>`;
}

function gamePage(date: string, demo: boolean): void {
  const abort = new AbortController();
  const selectedDate = parseDateKey(date)!;
  const puzzle = generatePuzzle(date);
  const loaded = readPuzzleState(date, demo);
  const storage = demo ? sessionStorage : localStorage;
  let state = loaded.state;
  let mode: Mode = 'fill';
  let runtimeStarted: number | null = null;
  let timerId: number | undefined;
  const history: SavedState[] = [];
  const isHome = !demo && date === todayKey;

  if (demo) setMeta('Demo — Hex Daily Notebook', 'Try a partly solved hex deduction puzzle without changing your daily puzzle.', '/demo');
  else if (isHome) setMeta('Hex Daily Notebook — Solve a daily hex puzzle', 'Solve a free daily hex deduction puzzle with local pencil notes and no account.', '/');
  else setMeta(`${formatDate(selectedDate)} puzzle — Hex Daily Notebook`, 'Solve an archived daily hex deduction puzzle.', `/?day=${date}`);

  const hero = demo ? `
    <div><p class="eyebrow">Sample puzzle · 14 August 2026</p><h1 id="page-title" tabindex="-1">Try a partly solved hex puzzle</h1><p class="dek">Use the filled cells, crosses, and pencil line to finish this sample.</p></div>` : isHome ? `
    <div><p class="eyebrow">New puzzle each local calendar day</p><h1 id="page-title" tabindex="-1">Solve a daily hex deduction puzzle</h1><p class="dek">For people who prefer spatial grids and pencil marks to another word game.</p>
      <div class="hero-action"><a class="action-button inline-action" id="hero-demo" data-route href="/demo">Try it with sample data</a><p>It opens a partly solved sample. Today’s puzzle stays unchanged.</p></div>
      <ul class="plain-facts"><li>Free to play.</li><li>Works offline after the first visit.</li><li>Puzzle progress stays in this browser.</li></ul>
    </div>` : `
    <div><p class="eyebrow">Archive puzzle · ${formatDate(selectedDate)}</p><h1 id="page-title" tabindex="-1">Solve this hex deduction puzzle</h1><p class="dek">Fill seven connected cells by following the numbered neighbor clues.</p></div>`;

  app.innerHTML = shell(`
    <main id="main" class="notebook">
      <section class="title-block" aria-labelledby="page-title">
        ${hero}
        <div class="issue-stamp" aria-label="Puzzle details">DATE ${date.slice(2).replaceAll('-', '/')}<br>19 CELLS · FILL 7<br>ONE SOLUTION</div>
      </section>
      <p id="offline-banner" class="offline-banner" role="status">You are offline. The puzzle and browser-stored notes still work.</p>
      <section class="game-layout" aria-labelledby="play-title">
        <h2 id="play-title" class="sr-only">Play the hex puzzle</h2>
        <aside class="control-rail" aria-label="Puzzle tools">
          <p class="rule-summary">Fill <strong>7 connected cells</strong>. Each numbered clue counts filled cells touching it.</p>
          <div class="tool-group"><p class="draft-label">Marking tool</p><div class="tool-belt" role="group" aria-label="Marking tool">
            <button class="tool-button" data-mode="fill" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>Fill <kbd>F</kbd></button>
            <button class="tool-button" data-mode="pencil" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="m4 20 4-1 11-11-3-3L5 16l-1 4Z"/></svg>Pencil <kbd>P</kbd></button>
            <button class="tool-button" data-mode="eraser" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="m4 15 9-10 7 7-7 8H8l-4-5Z"/></svg>Eraser <kbd>E</kbd></button>
          </div><div class="secondary-actions"><button id="undo" class="quiet-button" disabled>Undo <kbd>U</kbd></button><button id="clear-pencil" class="quiet-button">Clear pencil</button></div></div>
          <div class="status-table" aria-label="Puzzle status">
            <div class="status-row"><span>Filled</span><strong id="trace-count">0 / ${TRACE_SIZE}</strong></div>
            <div class="status-row"><span>Time</span><strong id="timer">00:00</strong></div>
            <div class="status-row"><span>Date</span><strong>${demo ? 'Sample' : date === todayKey ? 'Today' : formatDateShort(selectedDate)}</strong></div>
          </div>
          <button id="check" class="action-button">Check puzzle</button>
          <div class="help-actions">${demo ? '' : '<button id="archive-open" class="quiet-button" type="button">Open archive</button>'}<button id="rules-open" class="quiet-button" type="button">How to solve</button></div>
          <p class="keyboard-note">Use arrows to move. Hold Shift with Up or Down for two diagonal moves. Space marks a cell.</p>
        </aside>
        <section class="board-panel" aria-label="Puzzle board">
          <div class="board-topline"><p>19-CELL POINT-TOP GRID</p><p id="mode-label">FILL MODE</p></div>
          <div id="storage-warning" class="storage-warning" role="alert" hidden><span id="storage-warning-text"></span><button id="storage-warning-action" class="warning-action" type="button">Retry save</button></div>
          <div id="live-status" class="live-status" role="status" aria-live="polite">Puzzle ready. Fill cells, add × notes, or draw a pencil note.</div>
          <div class="board-wrap">${boardMarkup(puzzle, state)}</div>
          <p class="board-caption">Numbered cells are fixed clues. Filled answer cells connect through shared edges.</p>
          <section id="completion" class="completion ${state.completed ? 'visible' : ''}" aria-labelledby="completion-title">
            <div><h2 id="completion-title">Puzzle solved</h2><p>You finished ${demo ? 'the sample' : date} in <span id="final-time">${formatTime(state.elapsed)}</span>.</p></div>
            <button id="share" class="share-button">Copy result</button>
          </section>
        </section>
      </section>
      ${demo ? '' : supportingSections()}
    </main>`, demo);
  bindDialogs(abort.signal);

  const svg = document.querySelector<SVGSVGElement>('#hex-board')!;
  const status = document.querySelector<HTMLDivElement>('#live-status')!;
  const undoButton = document.querySelector<HTMLButtonElement>('#undo')!;
  const checkButton = document.querySelector<HTMLButtonElement>('#check')!;
  const completion = document.querySelector<HTMLElement>('#completion')!;
  const timer = document.querySelector<HTMLElement>('#timer')!;
  const storageWarning = document.querySelector<HTMLDivElement>('#storage-warning')!;
  const storageWarningText = document.querySelector<HTMLSpanElement>('#storage-warning-text')!;
  const storageWarningAction = document.querySelector<HTMLButtonElement>('#storage-warning-action')!;

  function announce(message: string, kind: '' | 'success' | 'error' = ''): void {
    status.textContent = message;
    status.className = `live-status ${kind}`.trim();
  }

  function showStorageWarning(message: string, action: 'retry' | 'dismiss'): void {
    storageWarningText.textContent = message;
    storageWarningAction.textContent = action === 'retry' ? 'Retry save' : 'Dismiss';
    storageWarningAction.dataset.action = action;
    storageWarning.hidden = false;
  }

  function save(): boolean {
    try {
      storage.setItem(storageKey(date, demo), JSON.stringify(state));
      if (storageWarningAction.dataset.action === 'retry') storageWarning.hidden = true;
      return true;
    } catch {
      const message = demo
        ? 'Demo changes cannot be stored in this tab. Reset the demo to start again.'
        : 'Changes in this tab are not saved. Keep this tab open, free browser storage, then retry.';
      showStorageWarning(message, 'retry');
      announce(message, 'error');
      return false;
    }
  }

  function checkpoint(): void {
    if (runtimeStarted === null) return;
    state.elapsed += Math.floor((Date.now() - runtimeStarted) / 1000);
    runtimeStarted = Date.now();
    save();
  }

  function startClock(): void {
    if (state.completed || runtimeStarted !== null) return;
    runtimeStarted = Date.now();
    timerId = window.setInterval(updateTimer, 1000);
  }

  function elapsed(): number {
    return state.elapsed + (runtimeStarted === null ? 0 : Math.floor((Date.now() - runtimeStarted) / 1000));
  }

  function updateTimer(): void { timer.textContent = formatTime(elapsed()); }

  function snapshot(): SavedState {
    return { marks: [...state.marks], strokes: state.strokes.map((stroke) => stroke.map((point) => ({ ...point }))), elapsed: state.elapsed, completed: state.completed };
  }

  function pushHistory(): void {
    history.push(snapshot());
    if (history.length > 60) history.shift();
    undoButton.disabled = false;
  }

  function renderStrokes(): void {
    const layer = document.querySelector<SVGGElement>('#strokes')!;
    layer.innerHTML = state.strokes.map((stroke) => {
      if (!stroke.length) return '';
      const d = stroke.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
      return `<path class="stroke" d="${d}"/>`;
    }).join('');
  }

  function updateBoard(): void {
    document.querySelectorAll<SVGGElement>('[data-cell]').forEach((cell) => {
      const index = Number(cell.dataset.cell);
      const clue = puzzle.clues.get(index);
      const mark = state.marks[index];
      cell.classList.toggle('filled', mark === 1);
      cell.classList.toggle('crossed', mark === 2);
      const stateLabel = clue !== undefined ? `clue ${clue}, fixed` : mark === 1 ? 'filled' : mark === 2 ? 'marked excluded' : 'blank';
      cell.setAttribute('aria-label', `Cell ${index + 1}, ${stateLabel}`);
    });
    document.querySelector('#trace-count')!.textContent = `${state.marks.filter((mark) => mark === 1).length} / ${TRACE_SIZE}`;
    renderStrokes();
    completion.classList.toggle('visible', state.completed);
    checkButton.disabled = state.completed;
    checkButton.textContent = state.completed ? 'Puzzle solved' : 'Check puzzle';
    updateTimer();
  }

  function cycleCell(index: number): void {
    if (puzzle.clues.has(index) || state.completed) {
      if (puzzle.clues.has(index)) announce(`Clue ${puzzle.clues.get(index)} counts filled neighbors and cannot be filled.`);
      return;
    }
    pushHistory();
    state.marks[index] = (state.marks[index] + 1) % 3;
    startClock();
    const saved = save();
    updateBoard();
    if (saved) announce(state.marks[index] === 1 ? `Cell ${index + 1} filled.` : state.marks[index] === 2 ? `Cell ${index + 1} marked ×.` : `Cell ${index + 1} cleared.`);
  }

  function setMode(nextMode: Mode): void {
    mode = nextMode;
    document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    svg.classList.remove('fill', 'pencil', 'eraser');
    svg.classList.add(mode);
    document.querySelector('#mode-label')!.textContent = `${mode.toUpperCase()} MODE`;
    announce(mode === 'fill' ? 'Fill mode. Select a cell to cycle filled, ×, and blank.' : mode === 'pencil' ? 'Pencil mode. Draw anywhere on the grid.' : 'Eraser mode. Drag across a pencil line to remove it.');
  }

  document.querySelectorAll<SVGGElement>('[data-cell]').forEach((cell) => {
    cell.addEventListener('click', () => { if (mode === 'fill') cycleCell(Number(cell.dataset.cell)); }, { signal: abort.signal });
    cell.addEventListener('keydown', (event) => {
      const index = Number(cell.dataset.cell);
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); cycleCell(index); return; }
      const direction: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        ArrowUp: event.shiftKey ? [1, -1] : [0, -1],
        ArrowDown: event.shiftKey ? [-1, 1] : [0, 1]
      };
      if (!direction[event.key]) return;
      event.preventDefault();
      const [dq, dr] = direction[event.key];
      const target = CELLS.findIndex((candidate) => candidate.q === CELLS[index].q + dq && candidate.r === CELLS[index].r + dr);
      if (target >= 0) document.querySelector<SVGGElement>(`#cell-${target}`)?.focus();
    }, { signal: abort.signal });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode as Mode), { signal: abort.signal }));

  let drawing = false;
  function svgPoint(event: PointerEvent): Point {
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: Math.round(transformed.x * 10) / 10, y: Math.round(transformed.y * 10) / 10 };
  }

  function eraseAt(point: Point): boolean {
    const before = state.strokes.length;
    state.strokes = state.strokes.filter((stroke) => !stroke.some((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) < 18));
    return before !== state.strokes.length;
  }

  svg.addEventListener('pointerdown', (event) => {
    if (mode === 'fill' || state.completed) return;
    event.preventDefault();
    drawing = true;
    svg.setPointerCapture(event.pointerId);
    pushHistory(); startClock();
    const point = svgPoint(event);
    if (mode === 'pencil') state.strokes.push([point]); else eraseAt(point);
    renderStrokes();
  }, { signal: abort.signal });
  svg.addEventListener('pointermove', (event) => {
    if (!drawing || mode === 'fill') return;
    event.preventDefault();
    const point = svgPoint(event);
    if (mode === 'pencil') {
      const stroke = state.strokes.at(-1)!;
      const previous = stroke.at(-1)!;
      if (Math.hypot(previous.x - point.x, previous.y - point.y) > 2) stroke.push(point);
    } else eraseAt(point);
    renderStrokes();
  }, { signal: abort.signal });
  const finishDrawing = () => {
    if (!drawing) return;
    drawing = false;
    if (save()) announce(mode === 'pencil' ? 'Pencil line saved in this browser.' : 'Pencil line erased.');
  };
  svg.addEventListener('pointerup', finishDrawing, { signal: abort.signal });
  svg.addEventListener('pointercancel', finishDrawing, { signal: abort.signal });

  undoButton.addEventListener('click', () => {
    const previous = history.pop();
    if (!previous) return;
    state = previous;
    undoButton.disabled = history.length === 0;
    const saved = save(); updateBoard();
    if (saved) announce('Last mark undone.');
  }, { signal: abort.signal });
  document.querySelector('#clear-pencil')!.addEventListener('click', () => {
    if (!state.strokes.length) { announce('The pencil layer is already clear.'); return; }
    pushHistory(); state.strokes = []; const saved = save(); updateBoard();
    if (saved) announce('Pencil layer cleared. Undo is available.');
  }, { signal: abort.signal });

  checkButton.addEventListener('click', () => {
    startClock();
    const mask = state.marks.reduce((result, mark, index) => result | (mark === 1 ? 1 << index : 0), 0);
    if (isSolved(mask, puzzle)) {
      if (runtimeStarted !== null) { state.elapsed += Math.floor((Date.now() - runtimeStarted) / 1000); runtimeStarted = null; }
      if (timerId !== undefined) window.clearInterval(timerId);
      state.completed = true; const saved = save(); updateBoard();
      document.querySelector('#final-time')!.textContent = formatTime(state.elapsed);
      if (saved) announce('Puzzle solved. Every clue agrees and all seven cells connect.', 'success');
      completion.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    } else {
      const filled = popcount(mask);
      announce(filled !== TRACE_SIZE ? `Fill exactly seven cells. ${filled} are filled now.` : 'Not solved yet. A clue or connection does not match. Change a filled cell and check again.', 'error');
    }
  }, { signal: abort.signal });

  document.querySelector('#share')?.addEventListener('click', async () => {
    const text = `Hex Daily Notebook ${demo ? 'sample' : date}\nPuzzle solved · ${formatTime(state.elapsed)}\nhttps://hex-daily-notebook.sociobot.in`;
    try { await navigator.clipboard.writeText(text); announce('Result copied without the answer.', 'success'); }
    catch { announce('The browser could not copy the result. The solved puzzle remains saved here.', 'error'); }
  }, { signal: abort.signal });

  document.addEventListener('keydown', (event) => {
    if (document.querySelector('dialog[open]')) return;
    if (event.key.toLowerCase() === 'f') setMode('fill');
    if (event.key.toLowerCase() === 'p') setMode('pencil');
    if (event.key.toLowerCase() === 'e') setMode('eraser');
    if (event.key.toLowerCase() === 'u' && !event.ctrlKey && !event.metaKey) undoButton.click();
    if (event.key === '?') document.querySelector<HTMLDialogElement>('#rules-dialog')?.showModal();
  }, { signal: abort.signal });

  function updateNetwork(): void { document.querySelector('#offline-banner')?.classList.toggle('visible', !navigator.onLine); }
  window.addEventListener('online', updateNetwork, { signal: abort.signal });
  window.addEventListener('offline', updateNetwork, { signal: abort.signal });
  window.addEventListener('beforeunload', checkpoint, { signal: abort.signal });
  storageWarningAction.addEventListener('click', () => {
    if (storageWarningAction.dataset.action === 'dismiss') storageWarning.hidden = true;
    else if (save()) announce('Your latest changes are saved in this browser.', 'success');
  }, { signal: abort.signal });

  updateNetwork();
  updateBoard();
  if (loaded.unreadable) {
    showStorageWarning('Browser storage could not be read. Changes may last only while this tab stays open.', 'retry');
  } else if (loaded.repaired) {
    if (save()) showStorageWarning('Saved puzzle data was repaired. Invalid clue marks or completion data was removed.', 'dismiss');
  } else if (state.completed) {
    announce('This puzzle is complete. Your notes are still available.', 'success');
  } else if (demo) {
    announce('Sample loaded with three filled cells, two × notes, and one pencil line.');
  }

  cleanupPage = () => {
    checkpoint();
    if (timerId !== undefined) window.clearInterval(timerId);
    abort.abort();
  };
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function renderCurrent(moveFocus = false): void {
  cleanupPage();
  cleanupPage = () => {};
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/privacy') legalPage('privacy');
  else if (path === '/terms') legalPage('terms');
  else if (path === '/demo') gamePage(demoDate, true);
  else if (path !== '/') errorPage('Check the address or return to today’s puzzle.', true);
  else {
    const requested = new URLSearchParams(window.location.search).get('day');
    const selected = requested || todayKey;
    const parsed = parseDateKey(selected);
    if (!parsed) errorPage('Use a real calendar date in YYYY-MM-DD format.');
    else if (selected > todayKey) errorPage('This puzzle becomes available on its local calendar date.');
    else if (selected !== todayKey && selected > dateKey(addDays(today, -7))) errorPage('Archive puzzles become available after seven days.');
    else gamePage(selected, false);
  }
  if (moveFocus) {
    document.querySelector<HTMLElement>('h1')?.focus();
    const status = document.querySelector('#route-status');
    if (status) status.textContent = `${document.title} loaded`;
    window.scrollTo(0, 0);
  }
}

function activeFocusId(): string | undefined {
  const active = document.activeElement as HTMLElement | null;
  return active?.id || undefined;
}

function navigate(destination: string, discardDemo = false): void {
  const current: RouteState = { scrollY: window.scrollY, focusId: activeFocusId() };
  history.replaceState(current, '', window.location.href);
  cleanupPage();
  cleanupPage = () => {};
  if (discardDemo) clearDemoData();
  history.pushState({ scrollY: 0 } satisfies RouteState, '', destination);
  renderCurrent(true);
}

document.addEventListener('click', (event) => {
  const target = event.target as Element;
  const reset = target.closest<HTMLButtonElement>('#reset-demo');
  if (reset) {
    cleanupPage(); cleanupPage = () => {}; clearDemoData(); renderCurrent(false);
    document.querySelector<HTMLElement>('#reset-demo')?.focus();
    document.querySelector('#route-status')!.textContent = 'Demo reset to the original sample';
    return;
  }
  const link = target.closest<HTMLAnchorElement>('a[data-route]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return;
  event.preventDefault();
  navigate(`${url.pathname}${url.search}`, link.id === 'start-real');
});

window.addEventListener('popstate', (event) => {
  renderCurrent(false);
  const state = (event.state || {}) as RouteState;
  requestAnimationFrame(() => {
    window.scrollTo(0, state.scrollY || 0);
    const focusTarget = state.focusId ? document.getElementById(state.focusId) : document.querySelector<HTMLElement>('h1');
    focusTarget?.focus({ preventScroll: true });
    const status = document.querySelector('#route-status');
    if (status) status.textContent = `${document.title} loaded`;
  });
});

history.replaceState({ scrollY: window.scrollY } satisfies RouteState, '', window.location.href);
renderCurrent(false);
registerSW({ immediate: true });
