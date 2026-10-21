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

test('renders category text literally, never as HTML', async ({ page }) => {
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });
  const categories = ['<b>food</b>', `<img src=x onerror="alert('xss')">`];
  await page.getByTestId('summary-month').fill('2026-03');

  try {
    for (const category of categories) {
      await page.getByTestId('input-date').fill('2026-03-21');
      await page.getByTestId('input-amount').fill('1');
      await page.getByTestId('input-category').fill(category);
      await page.getByTestId('input-note').fill('E2E probe');
      await page.getByTestId('submit').click();
      await expect(page.getByTestId('input-note')).toHaveValue('');
    }

    const probes = page.getByTestId('expense-row').filter({ hasText: 'E2E probe' });
    await expect(probes).toHaveCount(2);
    await expect(probes.locator('td:nth-child(3)')).toHaveText(categories);
    await expect(probes.locator('b, img')).toHaveCount(0);
    for (const category of categories) {
      await expect(page.getByTestId('summary-category').filter({ hasText: `${category}: 1` })).toHaveCount(1);
    }
    expect(dialogs).toEqual([]);
  } finally {
    const { items } = await (await page.request.get('/api/expenses?limit=100')).json();
    for (const e of items.filter((e) => e.note === 'E2E probe')) {
      await page.request.delete(`/api/expenses/${e.id}`);
    }
  }
});

test('renders every list field literally, even values the server would reject', async ({ page }) => {
  const forged = { id: '"><b>id</b>', date: '<b>2026-03-21</b>', amount: '<b>1</b>', category: 'food', note: 'E2E forged' };
  await page.route(/\/api\/expenses\?/, (route) =>
    route.fulfill({ json: { items: [forged], total: 1, page: 1, limit: 10 } }));
  await page.reload();

  const row = page.getByTestId('expense-row');
  await expect(row).toHaveCount(1);
  await expect(row.locator('td:nth-child(1)')).toHaveText(forged.date);
  await expect(row.locator('td:nth-child(2)')).toHaveText(forged.amount);
  await expect(row.getByTestId('delete-btn')).toHaveAttribute('data-id', forged.id);
  await expect(row.locator('b')).toHaveCount(0);
});

test('deletes an expense', async ({ page }) => {
  const first = page.getByTestId('expense-row').first();
  const note = await first.locator('td:nth-child(4)').textContent();
  await first.getByTestId('delete-btn').click();
  await expect(page.getByTestId('expense-row').filter({ hasText: note })).toHaveCount(0);
  await expect(page.getByTestId('page-info')).toContainText('(12 total)');
});

test('deleting an already-deleted expense still refreshes list and summary', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const res = await page.request.post('/api/expenses', {
    data: { date: '2026-04-01', amount: 7, category: 'food', note: 'E2E stale' },
  });
  const { id } = await res.json();
  await page.reload();
  await page.getByTestId('summary-month').fill('2026-04');
  await expect(page.getByTestId('summary-total')).toHaveText('7');

  // Removed elsewhere (another tab, double-click) while this page still shows it.
  await page.request.delete(`/api/expenses/${id}`);
  await page.getByTestId('expense-row').filter({ hasText: 'E2E stale' }).getByTestId('delete-btn').click();

  await expect(page.getByTestId('expense-row').filter({ hasText: 'E2E stale' })).toHaveCount(0);
  await expect(page.getByTestId('summary-total')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('a failed delete keeps the row and does not swallow the error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.route(/\/api\/expenses\/[^/?]+$/, (route) =>
    route.request().method() === 'DELETE'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"internal error"}' })
      : route.fallback(),
  );
  const row = page.getByTestId('expense-row').first();
  const id = await row.getAttribute('data-id');
  // Added behind the page's back: it can only show up if the failed delete still refreshes.
  await page.request.post('/api/expenses', {
    data: { date: '2026-04-02', amount: 1, category: 'food', note: 'E2E added elsewhere' },
  });
  await row.getByTestId('delete-btn').click();

  await expect.poll(() => errors).toEqual(['internal error']);
  await expect(page.locator(`[data-testid="expense-row"][data-id="${id}"]`)).toHaveCount(1);
  await expect(page.getByTestId('expense-row').filter({ hasText: 'E2E added elsewhere' })).toHaveCount(1);
});

test('search highlights matches and renders the note literally, never as HTML', async ({ page }) => {
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const note = `<img src=x onerror="alert('xss')"> (team)`;
  const { id } = await (await page.request.post('/api/expenses', {
    data: { date: '2026-03-21', amount: 1, category: 'food', note },
  })).json();

  try {
    await page.reload();
    const row = page.getByTestId('expense-row').filter({ hasText: '(team)' });
    await expect(row.locator('td:nth-child(4)')).toHaveText(note);
    await expect(row.locator('img')).toHaveCount(0);

    await page.getByTestId('search-note').fill('(team');
    await expect(row.locator('mark')).toHaveText('(team');
    await expect(row.locator('td:nth-child(4)')).toHaveText(note);
    await expect(row.locator('img')).toHaveCount(0);
    expect(dialogs).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await page.request.delete(`/api/expenses/${id}`);
  }
});

test('a slow response for an earlier search term does not overwrite the current results', async ({ page }) => {
  let releaseStale;
  const stale = { id: 'stale', date: '2026-01-01', amount: 1, category: 'food', note: 'STALE' };
  await page.route(/q=c$/, async (route) => {
    await new Promise((r) => { releaseStale = r; });
    await route.fulfill({ json: { items: [stale], total: 1, page: 1, limit: 10 } });
  });

  await page.getByTestId('search-note').pressSequentially('co');
  await expect(page.getByTestId('page-info')).toContainText('(2 total)');
  releaseStale();
  await page.waitForResponse(/q=c$/);
  await page.waitForTimeout(300);

  await expect(page.getByTestId('expense-row').filter({ hasText: 'STALE' })).toHaveCount(0);
  await expect(page.getByTestId('page-info')).toContainText('(2 total)');
});

test('highlight never matches inside an escaped character', async ({ page }) => {
  const note = "Tom's 39 tea";
  const { id } = await (await page.request.post('/api/expenses', {
    data: { date: '2026-03-22', amount: 1, category: 'food', note },
  })).json();
  try {
    await page.reload();
    await page.getByTestId('search-note').fill('39');
    const cell = page.getByTestId('expense-row').filter({ hasText: 'tea' }).locator('td:nth-child(4)');
    await expect(cell.locator('mark')).toHaveText(['39']);
    await expect(cell).toHaveText(note);
  } finally {
    await page.request.delete(`/api/expenses/${id}`);
  }
});
