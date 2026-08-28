import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { generatePuzzle } from '../../src/puzzle';

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
