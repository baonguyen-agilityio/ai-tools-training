import { test, expect } from '@playwright/test';

// Month invariant (R21, R39): saving tests use months >= 2027-01 (AC8 re-saves the 2026-10 baseline,
// restored by beforeEach), inherited reads and tests that never write (AC6, AC7) use 2026-11 / 2026-12,
// "no budget" uses 2026-01.
const BASELINE = { total: 1500, categories: { food: 500, fun: 150 } };
const BUDGET_URL = /\/api\/budget\?/;

test.describe('REQ-002d set budget', () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.put('/api/budget?month=2026-10', { data: BASELINE });
    expect(res.ok()).toBe(true);
    await page.goto('/');
  });

  const field = (page, name) => page.getByTestId(name === 'total' ? 'budget-total' : `budget-cap-${name}`);

  // Holds every PUT until the returned release() is called; other budget requests pass through.
  async function holdPuts(page) {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route(BUDGET_URL, async (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      await gate;
      return route.continue();
    });
    return release;
  }

  async function expectBaseline(page) {
    await expect(field(page, 'total')).toHaveValue('1500.00');
    await expect(field(page, 'food')).toHaveValue('500.00');
    await expect(field(page, 'fun')).toHaveValue('150.00');
    await expect(field(page, 'transport')).toHaveValue('');
    await expect(field(page, 'bills')).toHaveValue('');
  }

  test('d-AC1 saved month pre-fills its values, source hidden', async ({ page }) => {
    await page.getByTestId('summary-month').fill('2026-10');
    await expectBaseline(page);
    await expect(page.getByTestId('budget-source')).toBeHidden();
  });

  test('d-AC2 unsaved month copies October and says so', async ({ page }) => {
    await page.getByTestId('summary-month').fill('2026-11');
    await expectBaseline(page);
    await expect(page.getByTestId('budget-source')).toHaveText('copied from 2026-10, not saved');
  });

  test('d-AC3 month before any budget leaves the form empty', async ({ page }) => {
    await page.getByTestId('summary-month').fill('2026-10');
    await expect(field(page, 'total')).toHaveValue('1500.00');
    await page.getByTestId('summary-month').fill('2026-01');
    for (const name of ['total', 'food', 'transport', 'bills', 'fun']) {
      await expect(field(page, name)).toHaveValue('');
    }
    await expect(page.getByTestId('budget-source')).toBeHidden();
  });

  test('d-AC4 save sends a numeric PUT body without empty caps', async ({ page }) => {
    await page.getByTestId('summary-month').fill('2027-01');
    await expectBaseline(page);
    await field(page, 'total').fill('1600');
    await field(page, 'food').fill('550');

    const put = page.waitForRequest((r) => r.method() === 'PUT' && BUDGET_URL.test(r.url()));
    const summary = page.waitForResponse((r) => r.url().includes('/api/summary?month=2027-01'));
    await page.getByTestId('budget-save').click();

    const req = await put;
    expect(new URL(req.url()).search).toBe('?month=2027-01');
    expect(req.postDataJSON()).toEqual({ total: 1600, categories: { food: 550, fun: 150 } });
    await summary;
    await expect(page.getByTestId('budget-saved')).toHaveText('Saved for 2027-01.');
    await expect(page.getByTestId('budget-source')).toBeHidden();

    const release = await holdPuts(page);
    const second = page.waitForRequest((r) => r.method() === 'PUT' && BUDGET_URL.test(r.url()));
    await page.getByTestId('budget-save').click();
    await second;
    await expect(page.getByTestId('budget-saved')).toBeHidden();
    release();
    await expect(page.getByTestId('budget-saved')).toHaveText('Saved for 2027-01.');
  });

  test('d-AC5b a save answered after a month change does not show budget-saved', async ({ page }) => {
    await page.getByTestId('summary-month').fill('2027-03');
    await expect(field(page, 'total')).not.toHaveValue('');
    const release = await holdPuts(page);
    const put = page.waitForRequest((r) => r.method() === 'PUT' && BUDGET_URL.test(r.url()));
    await page.getByTestId('budget-save').click();
    await put;

    await page.getByTestId('summary-month').fill('2026-11');
    await expect(page.getByTestId('budget-source')).toHaveText('copied from 2026-10, not saved');
    const answered = page.waitForResponse((r) => r.request().method() === 'PUT');
    release();
    await (await answered).finished();
    // No event marks "handler ignored the response"; one macrotask lets its continuation run.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    await expect(page.getByTestId('budget-saved')).toBeHidden();
    await expect(page.getByTestId('budget-source')).toHaveText('copied from 2026-10, not saved');
  });

  test('d-AC5 saving one month leaves the source month untouched', async ({ page }) => {
    await page.getByTestId('summary-month').fill('2027-02');
    await expect(field(page, 'total')).not.toHaveValue('');
    await field(page, 'total').fill('1700');
    await field(page, 'food').fill('600');
    await field(page, 'fun').fill('');
    await page.getByTestId('budget-save').click();
    await expect(page.getByTestId('budget-saved')).toHaveText('Saved for 2027-02.');

    await page.getByTestId('summary-month').fill('2026-10');
    await expectBaseline(page);
    await expect(page.getByTestId('budget-saved')).toBeHidden();
    await expect(page.getByTestId('budget-error')).toBeHidden();
  });

  test('d-AC6 empty or zero total is blocked by the browser', async ({ page }) => {
    await page.route('**/api/budget**', async (route) => {
      expect(route.request().method(), 'no PUT may be sent while total is invalid').not.toBe('PUT');
      return route.fallback();
    });
    await page.getByTestId('summary-month').fill('2026-12');
    await expect(field(page, 'total')).toHaveValue('1500.00');

    for (const value of ['', '0']) {
      await field(page, 'total').fill(value);
      await page.getByTestId('budget-save').click();
      expect(await field(page, 'total').evaluate((el) => el.checkValidity())).toBe(false);
    }
    await expect(page.getByTestId('budget-saved')).toBeHidden();
  });

  test('d-AC7 server error shows in budget-error and clears on retry and month change', async ({ page }) => {
    const message = 'coffee: category must be one of food, transport, bills, fun';
    // Each request's answer is fixed by its position, not by when the route handler happens to run.
    const answers = { PUT: ['error', 'hold', 'error'], GET: ['pass', 'hold'] };
    await page.route(BUDGET_URL, (route) => {
      const answer = answers[route.request().method()].shift();
      if (answer === 'hold') return; // never answered
      if (answer === 'error') return route.fulfill({ status: 400, json: { error: message } });
      return route.fallback();
    });
    const error = page.getByTestId('budget-error');

    await page.getByTestId('summary-month').fill('2026-12');
    await expect(field(page, 'total')).toHaveValue('1500.00');
    await field(page, 'total').fill('1600');
    await page.getByTestId('budget-save').click();
    await expect(error).toBeVisible();
    await expect(error).toHaveText(message);
    await expect(field(page, 'total')).toHaveValue('1600');
    await expect(field(page, 'food')).toHaveValue('500.00');
    await expect(page.getByTestId('budget-saved')).toBeHidden();

    await page.getByTestId('budget-save').click(); // PUT held
    await expect(error).toBeHidden();

    // toHaveText alone would match the hidden <p>, which keeps the old text; wait for the 400 to show it.
    await page.getByTestId('budget-save').click();
    await expect(error).toBeVisible();
    await expect(error).toHaveText(message);

    await page.getByTestId('summary-month').fill('2026-11'); // GET held
    await expect(error).toBeHidden();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('d-AC7b a save error answered after a month change stays hidden', async ({ page }) => {
    const message = 'coffee: category must be one of food, transport, bills, fun';
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route(BUDGET_URL, async (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      await gate;
      return route.fulfill({ status: 400, json: { error: message } });
    });
    await page.getByTestId('summary-month').fill('2026-12');
    await expect(field(page, 'total')).toHaveValue('1500.00');
    const put = page.waitForRequest((r) => r.method() === 'PUT' && BUDGET_URL.test(r.url()));
    await page.getByTestId('budget-save').click();
    await put;

    await page.getByTestId('summary-month').fill('2026-11');
    await expect(page.getByTestId('budget-source')).toHaveText('copied from 2026-10, not saved');
    const answered = page.waitForResponse((r) => r.request().method() === 'PUT');
    release();
    await (await answered).finished();
    // No event marks "handler ignored the response"; one macrotask lets its continuation run.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    await expect(page.getByTestId('budget-error')).toBeHidden();
  });

  test('d-AC8 clearing a cap removes it', async ({ page }) => {
    await page.getByTestId('summary-month').fill('2026-10');
    await expectBaseline(page);
    await field(page, 'fun').fill('');

    const put = page.waitForRequest((r) => r.method() === 'PUT' && BUDGET_URL.test(r.url()));
    await page.getByTestId('budget-save').click();
    expect((await put).postDataJSON()).toEqual({ total: 1500, categories: { food: 500 } });
    await expect(page.getByTestId('budget-saved')).toHaveText('Saved for 2026-10.');

    await page.reload();
    await page.getByTestId('summary-month').fill('2026-10');
    await expect(field(page, 'food')).toHaveValue('500.00');
    await expect(field(page, 'fun')).toHaveValue('');
    const res = await page.request.get('/api/budget?month=2026-10');
    expect((await res.json()).budget.categories).toEqual({ food: 500 });
  });

  test('d-AC9 budget form fits a 390 px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    const box = await page.getByTestId('budget-form').boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeLessThanOrEqual(390);
  });
});

test.describe('REQ-002e summary status', () => {
  const NOTE = 'E2E budget';
  const WARN = 'rgb(138, 90, 0)';
  const OVER = 'rgb(176, 0, 32)';
  const BODY = 'rgb(34, 34, 34)';

  const line = (page, category) => page.locator(`[data-testid="summary-category"][data-category="${category}"]`);

  async function addExpenses(page, list) {
    for (const [category, amount] of list) {
      const res = await page.request.post('/api/expenses', { data: { date: '2026-10-15', amount, category, note: NOTE } });
      expect(res.ok()).toBe(true);
    }
  }

  async function showOctober(page, list = []) {
    await addExpenses(page, list);
    await page.getByTestId('summary-month').fill('2026-10');
  }

  test.beforeEach(async ({ page }) => {
    const res = await page.request.put('/api/budget?month=2026-10', { data: { total: 1500, categories: { food: 500, fun: 150 } } });
    expect(res.ok()).toBe(true);
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    const { items } = await (await page.request.get(`/api/expenses?limit=100&q=${encodeURIComponent(NOTE)}`)).json();
    for (const e of items.filter((e) => e.note === NOTE)) await page.request.delete(`/api/expenses/${e.id}`);
  });

  test('e-AC1 total line shows spent / budget, Left and warn colour', async ({ page }) => {
    await showOctober(page, [['food', 450], ['transport', 120.5], ['bills', 620], ['fun', 100], ['coffee', 30]]);
    const total = page.getByTestId('summary-total');
    await expect(total).toHaveText('1320.50 / 1500.00 (Left: 179.50)');
    await expect(total).toHaveAttribute('data-state', 'warn');
    await expect(total).toHaveCSS('color', WARN);
  });

  test('e-AC2 over-cap category shows Over by and over colour', async ({ page }) => {
    await showOctober(page, [['food', 535.5]]);
    await expect(line(page, 'food')).toHaveText('food: 535.50 / 500.00 (Over by 35.50)');
    await expect(line(page, 'food')).toHaveAttribute('data-state', 'over');
    await expect(line(page, 'food')).toHaveCSS('color', OVER);
  });

  test('e-AC3 exactly 100% is over with Left: 0.00', async ({ page }) => {
    await showOctober(page, [['food', 500]]);
    await expect(line(page, 'food')).toHaveText(/\(Left: 0\.00\)$/);
    await expect(line(page, 'food')).toHaveAttribute('data-state', 'over');
  });

  test('e-AC4 ok line has data-state ok and body colour', async ({ page }) => {
    await showOctober(page, [['fun', 100]]);
    await expect(line(page, 'fun')).toHaveText('fun: 100.00 / 150.00 (Left: 50.00)');
    await expect(line(page, 'fun')).toHaveAttribute('data-state', 'ok');
    await expect(line(page, 'fun')).toHaveCSS('color', BODY);
  });

  test('e-AC5 unspent capped category listed after byCategory lines', async ({ page }) => {
    await showOctober(page, [['food', 10], ['coffee', 5]]);
    await expect(page.getByTestId('summary-category')).toHaveText([
      'food: 10.00 / 500.00 (Left: 490.00)',
      'coffee: 5.00',
      'fun: 0.00 / 150.00 (Left: 150.00)',
    ]);
  });

  test('e-AC6 uncapped category renders as today without data-state', async ({ page }) => {
    await showOctober(page, [['coffee', 30]]);
    await expect(line(page, 'coffee')).toHaveText('coffee: 30.00');
    await expect(line(page, 'coffee')).not.toHaveAttribute('data-state');
  });

  test('e-AC7 month without budget renders as today', async ({ page }) => {
    await page.getByTestId('summary-month').fill('2026-10');
    await expect(page.getByTestId('summary-total')).toHaveAttribute('data-state');
    await page.getByTestId('summary-month').fill('2026-01');
    const total = page.getByTestId('summary-total');
    await expect(total).toHaveText('186.25');
    await expect(total).not.toHaveAttribute('data-state');
    const lines = page.getByTestId('summary-category');
    await expect(lines).toHaveCount(3);
    for (const li of await lines.all()) {
      await expect(li).toHaveText(/^[^:]+: \d+\.\d{2}$/);
      await expect(li).not.toHaveAttribute('data-state');
    }
  });

  test('e-AC8 status lines refresh after add and delete', async ({ page }) => {
    await showOctober(page);
    await page.getByTestId('input-date').fill('2026-10-15');
    await page.getByTestId('input-amount').fill('450');
    await page.getByTestId('input-category').fill('food');
    await page.getByTestId('input-note').fill(NOTE);
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('summary-total')).toHaveText('450.00 / 1500.00 (Left: 1050.00)');
    await expect(line(page, 'food')).toHaveText('food: 450.00 / 500.00 (Left: 50.00)');

    await page.getByTestId('expense-row').filter({ hasText: NOTE }).getByTestId('delete-btn').click();
    await expect(page.getByTestId('summary-total')).toHaveText('0.00 / 1500.00 (Left: 1500.00)');
    await expect(line(page, 'food')).toHaveText('food: 0.00 / 500.00 (Left: 500.00)');
  });
});
