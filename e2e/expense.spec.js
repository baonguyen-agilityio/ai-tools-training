import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('expense-row').first()).toBeVisible();
});

test('lists seeded expenses newest first with paging info', async ({ page }) => {
  const rows = page.getByTestId('expense-row');
  await expect(rows).toHaveCount(10);
  await expect(rows.first()).toContainText('2026-03-15');
  await expect(page.getByTestId('page-info')).toHaveText('Page 1 of 2 (12 total)');

  await page.getByTestId('page-next').click();
  await expect(rows).toHaveCount(2);
  await expect(page.getByTestId('page-info')).toHaveText('Page 2 of 2 (12 total)');
  await expect(page.getByTestId('page-next')).toBeDisabled();
});

test('filters by category', async ({ page }) => {
  await page.getByTestId('filter-category').fill('food');
  await page.getByTestId('filter-category').press('Enter');
  await expect(page.getByTestId('page-info')).toContainText('(5 total)');
  for (const cell of await page.getByTestId('expense-row').locator('td:nth-child(3)').all()) {
    await expect(cell).toHaveText('food');
  }
});

test('shows monthly summary for a chosen month', async ({ page }) => {
  await page.getByTestId('summary-month').fill('2026-01');
  await expect(page.getByTestId('summary-total')).toHaveText('186.25');
  await expect(page.getByTestId('summary-category')).toHaveCount(3);
});

test('adds an expense', async ({ page }) => {
  await page.getByTestId('input-date').fill('2026-03-20');
  await page.getByTestId('input-amount').fill('5.5');
  await page.getByTestId('input-category').fill('food');
  await page.getByTestId('input-note').fill('E2E tea');
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('input-note')).toHaveValue('');

  await page.reload();
  await expect(page.getByTestId('expense-row').filter({ hasText: 'E2E tea' })).toHaveCount(1);
  await expect(page.getByTestId('page-info')).toContainText('(13 total)');
});

test('deletes an expense', async ({ page }) => {
  const first = page.getByTestId('expense-row').first();
  const note = await first.locator('td:nth-child(4)').textContent();
  await first.getByTestId('delete-btn').click();
  await expect(page.getByTestId('expense-row').filter({ hasText: note })).toHaveCount(0);
  await expect(page.getByTestId('page-info')).toContainText('(12 total)');
});
