import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  CELLS, NEIGHBORS, addDays, candidatesFor, dateKey, generatePuzzle
} from '../../src/puzzle';

const demoDate = '2026-08-14';
const demoKey = `demo:hex-notebook:v1:${demoDate}`;

async function blankEditable(page: Page) {
  const first = page.locator('[data-cell]:not(.clue):not(.filled):not(.crossed)').first();
  const index = await first.getAttribute('data-cell');
  return page.locator(`[data-cell="${index}"]`);
}

async function solveDemo(page: Page): Promise<void> {
  const puzzle = generatePuzzle(demoDate);
  for (let index = 0; index < CELLS.length; index += 1) {
    if (puzzle.clues.has(index)) continue;
    const cell = page.locator(`[data-cell="${index}"]`);
    const classes = (await cell.getAttribute('class')) || '';
    if (classes.includes('filled')) {
      await cell.click();
      await cell.click();
    } else if (classes.includes('crossed')) {
      await cell.click();
    }
    if (puzzle.targetMask & (1 << index)) await cell.click();
  }
  await page.getByRole('button', { name: 'Check puzzle' }).click();
}

test('opens the complete product with plain first-screen guidance', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle('Hex Daily Notebook — Solve a daily hex puzzle');
  await expect(page.locator('h1')).toHaveText('Solve a daily hex deduction puzzle');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByText(/people who prefer spatial grids/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
  await expect(page.getByText('Free to play.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What this app does not do' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('opens and resets a populated sample in one click @claim:demo-sandbox', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('[data-cell].filled')).toHaveCount(3);
  await expect(page.locator('[data-cell].crossed')).toHaveCount(2);
  await expect(page.locator('.stroke')).toHaveCount(1);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  const cell = await blankEditable(page);
  await cell.click();
  await expect(page.locator('#trace-count')).toHaveText('4 / 7');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#trace-count')).toHaveText('3 / 7');
});

test('plays immediately without payment @claim:free-access', async ({ page }) => {
  await page.goto('/demo');
  const cell = await blankEditable(page);
  await cell.click();
  await expect(cell).toHaveClass(/filled/);
  await expect(page.locator('[data-cell]')).toHaveCount(19);
  await expect(page.getByText(/checkout|payment|subscribe/i)).toHaveCount(0);
});

test('builds the same puzzle for the same date @claim:deterministic-date', async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  try {
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    await first.goto('/demo');
    await second.goto('/demo');
    const firstClues = await first.locator('[data-cell].clue').evaluateAll((cells) => cells.map((cell) => cell.getAttribute('aria-label')));
    const secondClues = await second.locator('[data-cell].clue').evaluateAll((cells) => cells.map((cell) => cell.getAttribute('aria-label')));
    expect(firstClues).toEqual(secondClues);
    expect(firstClues.length).toBeGreaterThanOrEqual(5);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});

test('generates a different puzzle throughout the year @claim:fresh-daily', async ({ page }) => {
  await page.goto('/demo');
  const targets = new Set<number>();
  const signatures = new Set<string>();
  for (let date = new Date(2026, 0, 1); date.getFullYear() === 2026; date = addDays(date, 1)) {
    const puzzle = generatePuzzle(dateKey(date));
    targets.add(puzzle.targetMask);
    signatures.add(`${puzzle.targetMask}:${JSON.stringify([...puzzle.clues])}`);
  }
  expect(targets.size).toBe(365);
  expect(signatures.size).toBe(365);
});

test('accepts the one generated solution @claim:unique-solution', async ({ page }) => {
  await page.goto('/demo');
  const puzzle = generatePuzzle(demoDate);
  expect(candidatesFor(puzzle.clues)).toEqual([puzzle.targetMask]);
  await solveDemo(page);
  await expect(page.getByRole('heading', { name: 'Puzzle solved' })).toBeVisible();
});

test('checks seven connected cells against every clue @claim:seven-connected-clues', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Check puzzle' }).click();
  await expect(page.locator('#live-status')).toHaveText('Fill exactly seven cells. 3 are filled now.');
  await solveDemo(page);
  await expect(page.locator('#live-status')).toContainText('Every clue agrees and all seven cells connect');
});

test('draws and erases freehand notes @claim:pencil-layer', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /Pencil/ }).click();
  const board = page.locator('#hex-board');
  await board.scrollIntoViewIfNeeded();
  const box = await board.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * .62, box!.y + box!.height * .58);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * .72, box!.y + box!.height * .66, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.stroke')).toHaveCount(2);
  await page.getByRole('button', { name: /Eraser/ }).click();
  await board.scrollIntoViewIfNeeded();
  const eraseBox = await board.boundingBox();
  expect(eraseBox).not.toBeNull();
  await page.mouse.move(eraseBox!.x + eraseBox!.width * .66, eraseBox!.y + eraseBox!.height * .61);
  await page.mouse.down();
  await page.mouse.move(eraseBox!.x + eraseBox!.width * .72, eraseBox!.y + eraseBox!.height * .66, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('.stroke')).toHaveCount(1);
});

test('keeps × notes out of the filled count @claim:cross-not-answer', async ({ page }) => {
  await page.goto('/demo');
  const cell = await blankEditable(page);
  await cell.click();
  await expect(page.locator('#trace-count')).toHaveText('4 / 7');
  await cell.click();
  await expect(cell).toHaveClass(/crossed/);
  await expect(page.locator('#trace-count')).toHaveText('3 / 7');
});

test('supports six-neighbor keyboard play and shortcuts @claim:keyboard-six', async ({ page }) => {
  await page.goto('/demo');
  const center = CELLS.findIndex(({ q, r }) => q === 0 && r === 0);
  const movements: Array<[string, number, number]> = [
    ['ArrowLeft', -1, 0], ['ArrowRight', 1, 0],
    ['ArrowUp', 0, -1], ['ArrowDown', 0, 1],
    ['Shift+ArrowUp', 1, -1], ['Shift+ArrowDown', -1, 1]
  ];
  expect(NEIGHBORS[center]).toHaveLength(6);
  for (const [key, q, r] of movements) {
    await page.locator(`[data-cell="${center}"]`).focus();
    await page.keyboard.press(key);
    const expected = CELLS.findIndex((cell) => cell.q === q && cell.r === r);
    await expect(page.locator(`[data-cell="${expected}"]`)).toBeFocused();
  }
  const editable = await blankEditable(page);
  await editable.focus();
  await page.keyboard.press('Space');
  await expect(editable).toHaveClass(/filled/);
  await page.keyboard.press('p');
  await expect(page.locator('#mode-label')).toHaveText('PENCIL MODE');
  await page.keyboard.press('f');
  await page.keyboard.press('u');
  await expect(editable).not.toHaveClass(/filled/);
});

test('marks cells with a touch action @claim:touch-play', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touch outcome runs in the phone project.');
  await page.goto('/demo');
  const cell = await blankEditable(page);
  await cell.tap();
  await expect(cell).toHaveClass(/filled/);
});

test('releases archive puzzles after seven days @claim:archive-delay', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Start for real' }).click();
  await page.getByRole('button', { name: 'Open archive' }).click();
  await expect(page.locator('.archive-link')).toHaveCount(21);
  const released = dateKey(addDays(new Date(), -7));
  await expect(page.locator('.archive-link').first()).toHaveAttribute('href', `/?day=${released}`);
  await page.locator('.archive-link').first().click();
  await expect(page.locator('[data-cell]')).toHaveCount(19);
  const sealed = dateKey(addDays(new Date(), -6));
  await page.goto(`/?day=${sealed}`);
  await expect(page.locator('h1')).toHaveText('This puzzle is unavailable');
});

test('restores demo progress and elapsed time after reload @claim:local-progress', async ({ page }) => {
  await page.goto('/demo');
  const cell = await blankEditable(page);
  await cell.click();
  await page.waitForTimeout(1100);
  await page.reload();
  await expect(page.locator('#trace-count')).toHaveText('4 / 7');
  const seconds = await page.locator('#timer').evaluate((element) => {
    const [minutes, rest] = element.textContent!.split(':').map(Number);
    return minutes * 60 + rest;
  });
  expect(seconds).toBeGreaterThanOrEqual(173);
});

test('copies a result without answer cells @claim:spoiler-free-copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/demo');
  await solveDemo(page);
  await page.getByRole('button', { name: 'Copy result' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.split('\n')).toHaveLength(3);
  expect(copied).toContain('Hex Daily Notebook sample');
  expect(copied).not.toMatch(/cell|mask|[×⬢]{3}/i);
  await expect(page.locator('#live-status')).toHaveText('Result copied without the answer.');
});

test('reloads the sample offline after caching @claim:offline-reload', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto('/demo');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-cell]')).toHaveCount(19);
    await expect(page.locator('#offline-banner')).toBeVisible();
    await expect(page.locator('#trace-count')).toHaveText('3 / 7');
  } finally {
    await context.setOffline(false);
    await context.close();
  }
});

test('starts without an account @claim:no-account', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.locator('[data-cell]')).toHaveCount(19);
  await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /sign in|create account/i })).toHaveCount(0);
  const cell = await blankEditable(page);
  await cell.click();
  await expect(cell).toHaveClass(/filled/);
});

test('sets no cookies and loads no tracking resources @claim:no-tracking', async ({ page, context }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo');
  const cell = await blankEditable(page);
  await cell.click();
  await page.getByRole('button', { name: /Pencil/ }).click();
  expect(await context.cookies()).toEqual([]);
  expect(requests.some((url) => /analytics|doubleclick|facebook|segment|plausible/i.test(url))).toBe(false);
});

test('requests app files from this origin only @claim:first-party-only', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await page.goto('/demo');
  await page.locator('#hex-board').scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  expect([...origins]).toEqual(['http://127.0.0.1:4173']);
});

test('keeps sample changes separate from daily puzzle data @claim:local-only-data', async ({ page }) => {
  const realKey = 'hex-notebook:v1:real-data-check';
  await page.addInitScript(({ key }) => localStorage.setItem(key, 'unchanged'), { key: realKey });
  const writes: string[] = [];
  page.on('request', (request) => {
    if (!['document', 'script', 'stylesheet', 'image', 'manifest', 'other'].includes(request.resourceType())) writes.push(`${request.method()} ${request.url()}`);
  });
  await page.goto('/demo');
  const cell = await blankEditable(page);
  await cell.click();
  expect(await page.evaluate(({ key }) => localStorage.getItem(key), { key: realKey })).toBe('unchanged');
  expect(await page.evaluate((key) => sessionStorage.getItem(key) !== null, demoKey)).toBe(true);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#trace-count')).toHaveText('3 / 7');
  expect(await page.evaluate(({ key }) => localStorage.getItem(key), { key: realKey })).toBe('unchanged');
  await page.getByRole('link', { name: 'Start for real' }).click();
  expect(await page.evaluate((prefix) => Object.keys(sessionStorage).some((key) => key.startsWith(prefix)), 'demo:')).toBe(false);
  expect(await page.evaluate(({ key }) => localStorage.getItem(key), { key: realKey })).toBe('unchanged');
  expect(writes).toEqual([]);
});

test('repairs an impossible completed state and keeps the puzzle editable', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hex-notebook:v1:2026-08-14', JSON.stringify({
      marks: Array(19).fill(0), strokes: [], elapsed: 12, completed: true
    }));
  });
  await page.goto('/?day=2026-08-14');
  await expect(page.getByRole('alert')).toContainText('Saved puzzle data was repaired');
  await expect(page.getByRole('button', { name: 'Check puzzle' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Puzzle solved' })).toBeHidden();
  const repaired = await page.evaluate(() => JSON.parse(localStorage.getItem('hex-notebook:v1:2026-08-14')!));
  expect(repaired.completed).toBe(false);
});

test('clears impossible marks from fixed clue cells', async ({ page }) => {
  const clue = [...generatePuzzle(demoDate).clues.keys()][0];
  await page.addInitScript(({ index }) => {
    const marks = Array(19).fill(0); marks[index] = 1;
    localStorage.setItem('hex-notebook:v1:2026-08-14', JSON.stringify({ marks, strokes: [], elapsed: 0, completed: false }));
  }, { index: clue });
  await page.goto('/?day=2026-08-14');
  await expect(page.getByRole('alert')).toContainText('Saved puzzle data was repaired');
  await expect(page.locator(`[data-cell="${clue}"]`)).not.toHaveClass(/filled/);
  await expect(page.locator('#trace-count')).toHaveText('0 / 7');
  const repaired = await page.evaluate(() => JSON.parse(localStorage.getItem('hex-notebook:v1:2026-08-14')!));
  expect(repaired.marks[clue]).toBe(0);
});

test('keeps save failures visible and never reports the mark as saved', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key.startsWith('hex-notebook:')) throw new DOMException('quota full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.goto('/?day=2026-08-14');
  await page.locator('[data-cell]:not(.clue)').first().click();
  await expect(page.getByRole('alert')).toContainText('Changes in this tab are not saved');
  await expect(page.locator('#live-status')).not.toContainText('filled.');
  await page.reload();
  await expect(page.locator('[data-cell].filled')).toHaveCount(0);
});

test('repairs malformed strokes and preserves valid marks', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('hex-notebook:v1:2026-08-14', JSON.stringify({
      marks: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      strokes: ['bad'], elapsed: 12, completed: false
    }));
  });
  await page.goto('/?day=2026-08-14');
  await expect(page.getByRole('alert')).toContainText('Saved puzzle data was repaired');
  await expect(page.locator('[data-cell].filled')).toHaveCount(1);
  await expect(page.locator('.stroke')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('loads more than 1,200 valid pencil strokes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hex-notebook:v1:2026-08-14', JSON.stringify({
      marks: Array(19).fill(0),
      strokes: Array.from({ length: 1201 }, (_, index) => [{ x: index % 640, y: index % 600 }]),
      elapsed: 0, completed: false
    }));
  });
  await page.goto('/?day=2026-08-14');
  await expect(page.locator('.stroke')).toHaveCount(1201);
});

test('uses SPA navigation with route titles, focus, and history restore', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Demo', exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page).toHaveTitle('Demo — Hex Daily Notebook');
  await expect(page.locator('h1')).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#nav-demo')).toBeFocused();
  await page.getByRole('link', { name: 'Privacy', exact: true }).first().click();
  await expect(page).toHaveTitle('Privacy — Hex Daily Notebook');
  await expect(page.locator('h1')).toBeFocused();
});

test('handles normal, invalid, future, and unknown routes', async ({ page }) => {
  await page.goto('/?day=2026-08-14');
  await expect(page.locator('[data-cell]')).toHaveCount(19);
  await page.goto('/?day=2026-02-29');
  await expect(page.locator('h1')).toHaveText('This puzzle is unavailable');
  await page.goto('/?day=2999-01-01');
  await expect(page.locator('h1')).toHaveText('This puzzle is unavailable');
  await page.goto('/not-a-real-route');
  await expect(page.locator('h1')).toHaveText('Page not found');
  await expect(page.getByRole('link', { name: 'Open today’s puzzle' })).toBeVisible();
});

test('keeps interactive targets large and avoids horizontal overflow', async ({ page }) => {
  await page.goto('/');
  for (const locator of [page.locator('.brand'), page.getByRole('link', { name: 'Demo', exact: true }), page.getByRole('link', { name: 'Privacy', exact: true }).first()]) {
    const box = await locator.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('has no serious accessibility violations', async ({ page }) => {
  for (const route of ['/', '/demo', '/privacy', '/terms']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  }
});

test('respects reduced motion and keeps the sample action visible on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Phone layout runs in the mobile project.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeInViewport();
  const duration = await page.locator('.action-button').first().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(duration).toMatch(/0\.00001s|1e-05s|0s/);
});
