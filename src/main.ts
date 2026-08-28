import './style.css';
import { registerSW } from 'virtual:pwa-register';
import {
  CELLS, TRACE_SIZE, addDays, dateKey, generatePuzzle,
  isSolved, parseDateKey, popcount, type Puzzle
} from './puzzle';
import { loadState, type Point, type SavedState } from './storage';

type Mode = 'fill' | 'pencil' | 'eraser';

const app = document.querySelector<HTMLDivElement>('#app')!;
const today = new Date();
const todayKey = dateKey(today);
const path = window.location.pathname.replace(/\/+$/, '') || '/';

const logo = `
  <svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
    <path fill="none" stroke="currentColor" stroke-width="4" d="m32 7 21 12v26L32 57 11 45V19z"/>
    <path fill="#f4c95d" d="m32 17 13 8v14l-13 8-13-8V25z"/>
  </svg>`;

function shell(content: string): string {
  return `
    <header class="site-header">
      <a class="brand" href="/">${logo}<span>Hex Daily Notebook</span></a>
      <nav class="site-nav" aria-label="Main navigation">
        <a class="nav-link secondary" href="/">Today</a>
        <button class="nav-button" id="archive-open" type="button">Archive</button>
        <button class="nav-button" id="rules-open" type="button">How to play</button>
      </nav>
    </header>
    ${content}
    <footer class="site-footer">
      <p>Private by design. Your marks never leave this device.</p>
      <nav class="footer-links" aria-label="Legal">
        <a href="/privacy">Privacy</a><a href="/terms">Terms</a>
      </nav>
    </footer>
    ${dialogs()}`;
}

function dialogs(): string {
  const archiveItems = Array.from({ length: 21 }, (_, index) => {
    const date = addDays(today, -7 - index);
    const key = dateKey(date);
    const saved = readState(key).state;
    const label = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    return `<li><a class="archive-link" href="/?day=${key}"><span>${label}</span>${saved.completed ? '<span class="archive-done" aria-label="Completed">✓</span>' : ''}</a></li>`;
  }).join('');
  return `
    <dialog id="archive-dialog" aria-labelledby="archive-title">
      <div class="dialog-head"><h2 id="archive-title">Released drawings</h2><button class="icon-button" data-close="archive-dialog" aria-label="Close archive">×</button></div>
      <div class="dialog-body"><p>Puzzles enter the archive after seven days. Your completion marks are stored only here.</p><ul class="archive-list">${archiveItems}</ul></div>
    </dialog>
    <dialog id="rules-dialog" aria-labelledby="rules-title">
      <div class="dialog-head"><h2 id="rules-title">Read the drawing</h2><button class="icon-button" data-close="rules-dialog" aria-label="Close instructions">×</button></div>
      <div class="dialog-body">
        <ol>
          <li>Shade exactly seven cells. Together they make one connected trace.</li>
          <li>A brass pin tells you how many of its neighboring cells are shaded. The pin itself is never shaded.</li>
          <li>Use × marks and the free pencil layer to reason. They do not count as answers.</li>
        </ol>
        <p><strong>Keyboard:</strong> Tab into the grid, move to all six neighbors with arrow keys (hold Shift with Up or Down for the opposite diagonal), and press Space to cycle blank → filled → ×. Press F, P, or E for tools and U to undo.</p>
      </div>
    </dialog>`;
}

function legalPage(kind: 'privacy' | 'terms'): void {
  const isPrivacy = kind === 'privacy';
  document.title = `${isPrivacy ? 'Privacy' : 'Terms'} — Hex Daily Notebook`;
  const content = isPrivacy ? `
    <main id="main" class="legal">
      <p class="eyebrow">Revision 01 · 28 August 2026</p><h1>Privacy, kept simple.</h1>
      <p>Hex Daily Notebook has no account, advertising, analytics, cookies, or tracking pixels. The app does not send your play history anywhere.</p>
      <h2>What stays on your device</h2><p>Your filled cells, crosses, pencil strokes, elapsed time, and completion state are saved in your browser’s local storage. The offline app shell may be cached by your browser. You can erase this data at any time through your browser’s site-data controls.</p>
      <h2>Network use</h2><p>On first visit, your browser requests the static app files from our host. Once cached, the daily puzzle generator works offline. We do not embed third-party scripts, fonts, or services.</p>
      <h2>Contact</h2><p>Questions can be sent to <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>
    </main>` : `
    <main id="main" class="legal">
      <p class="eyebrow">Revision 01 · 28 August 2026</p><h1>Terms of use.</h1>
      <p>Hex Daily Notebook is a free daily puzzle supplied for personal enjoyment. No account or purchase is required.</p>
      <h2>Fair use</h2><p>You may play and share your spoiler-free result. Do not use the service to disrupt its availability or misrepresent the puzzle as your own product.</p>
      <h2>Availability</h2><p>The app is provided as-is. We aim to keep puzzles and local saves reliable, but uninterrupted access and preservation of browser-stored data are not guaranteed.</p>
      <h2>Original work</h2><p>The puzzle rules, interface, and generated editorial illustration were created for Hex Daily Notebook. The source code is available under the MIT License.</p>
    </main>`;
  app.innerHTML = shell(content);
  bindDialogs();
}

function errorPage(message: string): void {
  document.title = 'Drawing unavailable — Hex Daily Notebook';
  app.innerHTML = shell(`<main id="main" class="legal error-page"><p class="eyebrow">Drawing not found</p><h1>That sheet is not on the desk.</h1><p>${message}</p><p><a class="action-button" href="/">Open today’s puzzle</a></p></main>`);
  bindDialogs();
}

function storageKey(date: string): string { return `hex-notebook:v1:${date}`; }

function readState(date: string) { return loadState(localStorage, storageKey(date)); }

function bindDialogs(): void {
  const archive = document.querySelector<HTMLDialogElement>('#archive-dialog');
  const rules = document.querySelector<HTMLDialogElement>('#rules-dialog');
  document.querySelector('#archive-open')?.addEventListener('click', () => archive?.showModal());
  document.querySelector('#rules-open')?.addEventListener('click', () => rules?.showModal());
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((button) => button.addEventListener('click', () => {
    document.querySelector<HTMLDialogElement>(`#${button.dataset.close}`)?.close();
  }));
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  }));
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

function gamePage(date: string): void {
  const selectedDate = parseDateKey(date)!;
  const puzzle = generatePuzzle(date);
  const loaded = readState(date);
  let state = loaded.state;
  let mode: Mode = 'fill';
  let runtimeStarted: number | null = null;
  let timerId: number | undefined;
  const history: SavedState[] = [];

  document.title = `${date === todayKey ? 'Today’s puzzle' : formatDate(selectedDate)} — Hex Daily Notebook`;
  app.innerHTML = shell(`
    <main id="main" class="notebook">
      <section class="title-block" aria-labelledby="page-title">
        <div><p class="eyebrow">Daily spatial deduction · Drawing ${date.replaceAll('-', '.')}</p><h1 id="page-title">Find the hidden ink trace.</h1><p class="dek">Seven connected cells. Numbered pins count their shaded neighbors. Your pencil marks stay on this device.</p></div>
        <div class="issue-stamp" aria-label="Puzzle metadata">SHEET ${date.slice(2).replaceAll('-', '/')}<br>CELLS 19 · TRACE 07<br>UNIQUE ✓</div>
      </section>
      <p id="offline-banner" class="offline-banner" role="status">Offline copy — the puzzle and your local notes still work.</p>
      <div class="game-layout">
        <aside class="control-rail" aria-label="Puzzle tools">
          <p class="rule-summary">Shade <strong>7 connected cells</strong>. Each brass pin counts shaded neighbors touching it.</p>
          <div class="tool-group"><p class="draft-label">Marking tool</p><div class="tool-belt" role="group" aria-label="Marking tool">
            <button class="tool-button" data-mode="fill" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>Fill <kbd>F</kbd></button>
            <button class="tool-button" data-mode="pencil" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="m4 20 4-1 11-11-3-3L5 16l-1 4Z"/></svg>Pencil <kbd>P</kbd></button>
            <button class="tool-button" data-mode="eraser" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="m4 15 9-10 7 7-7 8H8l-4-5Z"/></svg>Eraser <kbd>E</kbd></button>
          </div><div class="secondary-actions"><button id="undo" class="quiet-button" disabled>Undo <kbd>U</kbd></button><button id="clear-pencil" class="quiet-button">Clear pencil</button></div></div>
          <div class="status-table" aria-label="Drawing status">
            <div class="status-row"><span>Trace</span><strong id="trace-count">0 / ${TRACE_SIZE}</strong></div>
            <div class="status-row"><span>Time</span><strong id="timer">00:00</strong></div>
            <div class="status-row"><span>Issue</span><strong>${date === todayKey ? 'Today' : formatDateShort(selectedDate)}</strong></div>
          </div>
          <button id="check" class="action-button">Check trace</button>
          <p class="keyboard-note">Keyboard: arrows move; <kbd>Shift</kbd> + ↑/↓ reaches the opposite diagonals. <kbd>Space</kbd> marks, <kbd>U</kbd> undoes, <kbd>?</kbd> opens rules.</p>
        </aside>
        <section class="board-panel" aria-label="Puzzle board">
          <div class="board-topline"><p>FIG. 01 · POINT-TOP HEX FIELD</p><p id="mode-label">FILL MODE</p></div>
          <div id="storage-warning" class="storage-warning" role="alert" hidden><span id="storage-warning-text"></span><button id="storage-warning-action" class="warning-action" type="button">Retry save</button></div>
          <div id="live-status" class="live-status" role="status" aria-live="polite">The sheet is ready. Fill, cross out, or sketch a note.</div>
          <div class="board-wrap">${boardMarkup(puzzle, state)}</div>
          <p class="board-caption">Brass pins are clues, not answer cells. A trace is connected when every filled cell joins through a shared edge.</p>
          <section id="completion" class="completion ${state.completed ? 'visible' : ''}" aria-labelledby="completion-title">
            <div><h2 id="completion-title">Trace confirmed.</h2><p>You resolved drawing ${date.replaceAll('-', '.')} in <span id="final-time">${formatTime(state.elapsed)}</span>.</p></div>
            <button id="share" class="share-button">Copy result</button>
          </section>
        </section>
      </div>
      <section class="field-notes" aria-labelledby="field-title">
        <picture class="field-image"><source srcset="/assets/blueprint-still-life.avif" type="image/avif"><img src="/assets/blueprint-still-life.webp" width="900" height="600" loading="lazy" decoding="async" alt="A brass compass and pencil resting on a hand-drawn hexagonal blueprint"></picture>
        <div class="field-copy"><p class="eyebrow">Field note 01</p><h2 id="field-title">Think on the sheet.</h2><p>The scratch layer is part of play, not an afterthought. Draw loops, routes, or reminders anywhere on the grid, erase them freely, and come back later. Nothing is uploaded.</p><details><summary>Rules in full</summary><ol><li>Fill exactly seven cells.</li><li>All seven must be connected through shared edges.</li><li>Each brass pin gives the exact number of adjacent filled cells.</li><li>Pencil lines and × marks are notes; only filled hatching is checked.</li></ol></details><p class="draft-label">Editorial artwork generated for this notebook · no people or brands</p></div>
      </section>
    </main>`);
  bindDialogs();

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
      localStorage.setItem(storageKey(date), JSON.stringify(state));
      if (storageWarningAction.dataset.action === 'retry') storageWarning.hidden = true;
      return true;
    } catch {
      const message = 'Changes in this tab are not saved. Keep this tab open, free browser storage, then retry.';
      showStorageWarning(message, 'retry');
      announce(message, 'error');
      return false;
    }
  }

  function checkpoint(): void {
    if (runtimeStarted !== null) {
      state.elapsed += Math.floor((Date.now() - runtimeStarted) / 1000);
      runtimeStarted = Date.now();
    }
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
    checkButton.textContent = state.completed ? 'Trace confirmed' : 'Check trace';
    updateTimer();
  }

  function renderStrokes(): void {
    const layer = document.querySelector<SVGGElement>('#strokes')!;
    layer.innerHTML = state.strokes.map((stroke) => {
      if (!stroke.length) return '';
      const d = stroke.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
      return `<path class="stroke" d="${d}"/>`;
    }).join('');
  }

  function cycleCell(index: number): void {
    if (puzzle.clues.has(index) || state.completed) {
      if (puzzle.clues.has(index)) announce(`Pin ${puzzle.clues.get(index)} counts its shaded neighbors and cannot be filled.`);
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
    announce(mode === 'fill' ? 'Fill mode. Select a cell to cycle filled, ×, and blank.' : mode === 'pencil' ? 'Pencil mode. Draw anywhere across the sheet.' : 'Eraser mode. Drag across a pencil stroke to remove it.');
  }

  document.querySelectorAll<SVGGElement>('[data-cell]').forEach((cell) => {
    cell.addEventListener('click', () => { if (mode === 'fill') cycleCell(Number(cell.dataset.cell)); });
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
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode as Mode)));

  let drawing = false;
  function svgPoint(event: PointerEvent): Point {
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse());
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
  });
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
  });
  const finishDrawing = () => {
    if (!drawing) return;
    drawing = false;
    if (save()) announce(mode === 'pencil' ? 'Pencil stroke saved on this device.' : 'Pencil stroke erased.');
  };
  svg.addEventListener('pointerup', finishDrawing);
  svg.addEventListener('pointercancel', finishDrawing);

  undoButton.addEventListener('click', () => {
    const previous = history.pop();
    if (!previous) return;
    state = previous;
    undoButton.disabled = history.length === 0;
    const saved = save(); updateBoard();
    if (saved) announce('Last mark undone.');
  });
  document.querySelector('#clear-pencil')!.addEventListener('click', () => {
    if (!state.strokes.length) { announce('The pencil layer is already clear.'); return; }
    pushHistory(); state.strokes = []; const saved = save(); updateBoard();
    if (saved) announce('Pencil layer cleared. Undo is available.');
  });

  checkButton.addEventListener('click', () => {
    startClock();
    const mask = state.marks.reduce((result, mark, index) => result | (mark === 1 ? 1 << index : 0), 0);
    if (isSolved(mask, puzzle)) {
      if (runtimeStarted !== null) { state.elapsed += Math.floor((Date.now() - runtimeStarted) / 1000); runtimeStarted = null; }
      if (timerId !== undefined) window.clearInterval(timerId);
      state.completed = true; const saved = save(); updateBoard();
      document.querySelector('#final-time')!.textContent = formatTime(state.elapsed);
      if (saved) announce('Trace confirmed. Every clue agrees and all seven cells connect.', 'success');
      completion.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    } else {
      const filled = popcount(mask);
      announce(filled !== TRACE_SIZE ? `The trace needs exactly seven filled cells; it currently has ${filled}.` : 'Not yet. At least one filled cell disagrees with the pins or the connected trace. Keep drafting.', 'error');
    }
  });

  document.querySelector('#share')?.addEventListener('click', async () => {
    const text = `Hex Daily Notebook ${date}\nTrace confirmed · ${formatTime(state.elapsed)}\nhttps://hex-daily-notebook.sociobot.in`;
    try { await navigator.clipboard.writeText(text); announce('Spoiler-free result copied.', 'success'); }
    catch { announce('Could not copy automatically. Your result is still saved here.', 'error'); }
  });

  document.addEventListener('keydown', (event) => {
    if (document.querySelector('dialog[open]')) return;
    if (event.key.toLowerCase() === 'f') setMode('fill');
    if (event.key.toLowerCase() === 'p') setMode('pencil');
    if (event.key.toLowerCase() === 'e') setMode('eraser');
    if (event.key.toLowerCase() === 'u' && !event.ctrlKey && !event.metaKey) undoButton.click();
    if (event.key === '?') document.querySelector<HTMLDialogElement>('#rules-dialog')?.showModal();
  });

  function updateNetwork(): void { document.querySelector('#offline-banner')?.classList.toggle('visible', !navigator.onLine); }
  window.addEventListener('online', updateNetwork); window.addEventListener('offline', updateNetwork); updateNetwork();
  window.addEventListener('beforeunload', checkpoint);
  storageWarningAction.addEventListener('click', () => {
    if (storageWarningAction.dataset.action === 'dismiss') {
      storageWarning.hidden = true;
    } else if (save()) {
      announce('Your latest changes are now saved on this device.', 'success');
    }
  });
  updateBoard();
  if (loaded.unreadable) {
    showStorageWarning('Browser storage could not be read. Changes may last only while this tab stays open.', 'retry');
  } else if (loaded.repaired) {
    if (save()) showStorageWarning('Damaged saved data was reset safely. Valid progress was preserved where possible.', 'dismiss');
  } else if (state.completed) {
    checkButton.disabled = true;
    announce('This drawing is complete. Your notes are still available.', 'success');
  }
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

if (path === '/privacy') legalPage('privacy');
else if (path === '/terms') legalPage('terms');
else if (path !== '/') errorPage('The address does not match a released drawing.');
else {
  const requested = new URLSearchParams(window.location.search).get('day');
  const selected = requested || todayKey;
  const parsed = parseDateKey(selected);
  if (!parsed) errorPage('That date is not valid. Use a date in YYYY-MM-DD format.');
  else if (selected > todayKey) errorPage('Future drawings stay sealed until their local calendar day.');
  else if (selected !== todayKey && selected > dateKey(addDays(today, -7))) errorPage('Recent drawings enter the archive after seven days.');
  else gamePage(selected);
}

registerSW({ immediate: true });
