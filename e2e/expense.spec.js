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

test('adds an expense and shows it without a reload', async ({ page }) => {
  await page.getByTestId('summary-month').fill('2026-03');
  await expect(page.getByTestId('summary-total')).toHaveText('115.3');

  await page.getByTestId('input-date').fill('2026-03-20');
  await page.getByTestId('input-amount').fill('5.5');
  await page.getByTestId('input-category').fill('food');
  await page.getByTestId('input-note').fill('E2E tea');
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('input-note')).toHaveValue('');

  await expect(page.getByTestId('expense-row').first()).toContainText('E2E tea');
  await expect(page.getByTestId('page-info')).toContainText('(13 total)');
  await expect(page.getByTestId('summary-total')).toHaveText('120.8');
  await expect(page.locator('[data-testid="summary-category"][data-category="food"]')).toHaveText('food: 27.8');
});

test('a failed refresh after a saved expense is not reported as an add error', async ({ page }) => {
  await page.route(/\/api\/expenses\?/, (route) => route.abort(), { times: 1 });
  await page.getByTestId('input-date').fill('2026-03-21');
  await page.getByTestId('input-amount').fill('1');
  await page.getByTestId('input-category').fill('food');
  await page.getByTestId('input-note').fill('E2E refresh');
  await page.getByTestId('submit').click();

  await expect(page.getByTestId('input-note')).toHaveValue('');
  await expect(page.getByTestId('form-error')).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('expense-row').filter({ hasText: 'E2E refresh' })).toHaveCount(1);
  await page.getByTestId('expense-row').filter({ hasText: 'E2E refresh' }).getByTestId('delete-btn').click();
  await expect(page.getByTestId('page-info')).toContainText('(13 total)');
});

test('deletes an expense', async ({ page }) => {
  const first = page.getByTestId('expense-row').first();
  const note = await first.locator('td:nth-child(4)').textContent();
  await first.getByTestId('delete-btn').click();
  await expect(page.getByTestId('expense-row').filter({ hasText: note })).toHaveCount(0);
  await expect(page.getByTestId('page-info')).toContainText('(12 total)');
});
