import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CELLS, generatePuzzle } from '../../src/puzzle';

test('loads a unique daily puzzle without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?day=2026-08-14');
  await expect(page).toHaveTitle(/Hex Daily Notebook/);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[data-cell]')).toHaveCount(19);
  await expect(page.getByText('UNIQUE ✓')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('supports keyboard marking, mode shortcuts, undo, and local restore', async ({ page }) => {
  await page.goto('/?day=2026-08-14');
  const editable = page.locator('[data-cell]:not(.clue)').first();
  await editable.focus();
  await page.keyboard.press('Space');
  await expect(editable).toHaveClass(/filled/);
  await page.keyboard.press('Space');
  await expect(editable).toHaveClass(/crossed/);
  await page.keyboard.press('u');
  await expect(editable).toHaveClass(/filled/);
  await page.keyboard.press('p');
  await expect(page.getByText('PENCIL MODE', { exact: true })).toBeVisible();
  await page.locator('#hex-board').scrollIntoViewIfNeeded();
  const box = await page.locator('#hex-board').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.62, box!.y + box!.height * 0.58, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('.stroke')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('[data-cell].filled')).toHaveCount(1);
  await expect(page.locator('.stroke')).toHaveCount(1);
});

test('exposes all six direct hex neighbors to keyboard navigation', async ({ page }) => {
  await page.goto('/?day=2026-08-14');
  const center = CELLS.findIndex(({ q, r }) => q === 0 && r === 0);
  const movements: Array<[string, number, number]> = [
    ['ArrowLeft', -1, 0], ['ArrowRight', 1, 0],
    ['ArrowUp', 0, -1], ['ArrowDown', 0, 1],
    ['Shift+ArrowUp', 1, -1], ['Shift+ArrowDown', -1, 1]
  ];
  for (const [key, q, r] of movements) {
    await page.locator(`[data-cell="${center}"]`).focus();
    await page.keyboard.press(key);
    const expected = CELLS.findIndex((cell) => cell.q === q && cell.r === r);
    await expect(page.locator(`[data-cell="${expected}"]`)).toBeFocused();
  }
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
  await expect(page.locator('#live-status')).toContainText('not saved');
  await expect(page.locator('#live-status')).not.toContainText('filled.');
  await page.reload();
  await expect(page.locator('[data-cell].filled')).toHaveCount(0);
});

test('repairs malformed stored strokes without a page error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('hex-notebook:v1:2026-08-14', JSON.stringify({
      marks: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      strokes: ['bad'], elapsed: 12, completed: false
    }));
  });
  await page.goto('/?day=2026-08-14');
  await expect(page.getByRole('alert')).toContainText('Damaged saved data was reset safely');
  await expect(page.locator('[data-cell].filled')).toHaveCount(1);
  await expect(page.locator('.stroke')).toHaveCount(0);
  expect(errors).toEqual([]);
  const repaired = await page.evaluate(() => JSON.parse(localStorage.getItem('hex-notebook:v1:2026-08-14')!));
  expect(repaired.strokes).toEqual([]);
  expect(repaired.marks[0]).toBe(1);
});

test('loads more than 1,200 valid pencil strokes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hex-notebook:v1:2026-08-14', JSON.stringify({
      marks: Array(19).fill(0),
      strokes: Array.from({ length: 1201 }, (_, index) => [{ x: index % 640, y: index % 600 }]),
      elapsed: 0,
      completed: false
    }));
  });
  await page.goto('/?day=2026-08-14');
  await expect(page.locator('.stroke')).toHaveCount(1201);
});

test('keeps brand and legal link targets at least 44 CSS pixels high', async ({ page }) => {
  await page.goto('/?day=2026-08-14');
  for (const locator of [page.locator('.brand'), page.getByRole('link', { name: 'Privacy' }), page.getByRole('link', { name: 'Terms' })]) {
    const box = await locator.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test('has no serious accessibility violations', async ({ page }) => {
  await page.goto('/?day=2026-08-14');
  // @axe-core supports a wider Playwright peer range than its bundled type copy.
  const results = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});

test('checks and persists a correctly solved trace', async ({ page }) => {
  const date = '2026-08-14';
  const puzzle = generatePuzzle(date);
  await page.goto(`/?day=${date}`);
  for (let index = 0; index < 19; index += 1) {
    if (puzzle.targetMask & (1 << index)) await page.locator(`[data-cell="${index}"]`).click();
  }
  await page.getByRole('button', { name: 'Check trace' }).click();
  await expect(page.getByText('Trace confirmed.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('This drawing is complete.')).toBeVisible();
});

test('legal pages and delayed archive are reachable', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Privacy/);
  await page.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByRole('dialog', { name: 'Released drawings' })).toBeVisible();
  await expect(page.locator('.archive-link')).toHaveCount(21);
});

test('reopens from the service worker while offline', async ({ page, context }) => {
  await page.goto('/?day=2026-08-14');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find the hidden ink trace.');
  await expect(page.getByText('Offline copy')).toBeVisible();
  await context.setOffline(false);
});
