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
    const puts = [];
    page.on('request', (r) => r.method() === 'PUT' && puts.push(r.url()));
    await page.getByTestId('summary-month').fill('2026-12');
    await expect(field(page, 'total')).toHaveValue('1500.00');

    for (const value of ['', '0']) {
      await field(page, 'total').fill(value);
      await page.getByTestId('budget-save').click();
      expect(await field(page, 'total').evaluate((el) => el.checkValidity())).toBe(false);
    }
    expect(puts).toEqual([]);
    await expect(page.getByTestId('budget-saved')).toBeHidden();
  });

  test('d-AC7 server error shows in budget-error and clears on retry and month change', async ({ page }) => {
    const message = 'coffee: category must be one of food, transport, bills, fun';
    let mode = 'error'; // 'error': PUT answers 400; 'hold': budget requests never answered
    await page.route(BUDGET_URL, (route) => {
      if (mode === 'hold') return;
      if (route.request().method() === 'PUT') return route.fulfill({ status: 400, json: { error: message } });
      return route.fallback();
    });
    const error = page.getByTestId('budget-error');

    await page.getByTestId('summary-month').fill('2026-12');
    await expect(field(page, 'total')).toHaveValue('1500.00');
    await field(page, 'total').fill('1600');
    await page.getByTestId('budget-save').click();
    await expect(error).toHaveText(message);
    await expect(field(page, 'total')).toHaveValue('1600');
    await expect(field(page, 'food')).toHaveValue('500.00');
    await expect(page.getByTestId('budget-saved')).toBeHidden();

    mode = 'hold';
    await page.getByTestId('budget-save').click();
    await expect(error).toBeHidden();

    mode = 'error';
    await page.getByTestId('budget-save').click();
    await expect(error).toHaveText(message);

    mode = 'hold';
    await page.getByTestId('summary-month').fill('2026-11');
    await expect(error).toBeHidden();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
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
