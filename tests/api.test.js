import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let dir, server, base, store;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'expenses-api-'));
  process.env.EXPENSES_FILE = join(dir, 'expenses.json');
  process.env.BUDGETS_FILE = join(dir, 'budgets.json');
  store = await import('../src/store.js');
  const { createServer } = await import('../src/server.js');
  server = createServer();
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
beforeEach(() => store.resetFromSeed());
after(async () => {
  await new Promise((r) => server.close(r));
  rmSync(dir, { recursive: true, force: true });
});

const api = (path, init) => fetch(base + path, init);
const post = (body) =>
  api('/api/expenses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('GET /api/expenses returns first page newest first', async () => {
  const res = await api('/api/expenses');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 12);
  assert.equal(body.items.length, 10);
  assert.equal(body.items[0].id, 'b3');
});

test('GET /api/expenses filters by category and honors limit', async () => {
  const body = await (await api('/api/expenses?category=food&limit=2')).json();
  assert.equal(body.total, 5);
  assert.equal(body.items.length, 2);
});

test('GET /api/expenses returns the remaining items on page 2', async () => {
  const body = await (await api('/api/expenses?page=2&limit=10')).json();
  assert.equal(body.page, 2);
  assert.equal(body.items.length, 2);
  assert.deepEqual(body.items.map((e) => e.id), ['a2', 'a1']);
});

test('GET /api/expenses searches notes with q', async () => {
  const body = await (await api('/api/expenses?q=grab')).json();
  assert.deepEqual(body.items.map((e) => e.id), ['a2']);
  assert.equal(body.total, 1);
});

test('GET /api/export returns CSV for the month', async () => {
  const res = await api('/api/export?month=2026-03');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  assert.match(res.headers.get('content-disposition'), /expenses-2026-03\.csv/);
  assert.equal((await res.text()).split('\n').length, 5);
});

test('GET /api/export rejects a bad month with 400, like /api/summary', async () => {
  for (const path of ['/api/export?month=2026-13', '/api/export', '/api/summary?month=2026-13']) {
    const res = await api(path);
    assert.equal(res.status, 400, path);
    assert.deepEqual(await res.json(), { error: 'month must be YYYY-MM' });
  }
});

test('GET /api/export returns 500 and keeps serving when the data file is unreadable', async () => {
  writeFileSync(process.env.EXPENSES_FILE, '{not json');
  const res = await api('/api/export?month=2026-03');
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'internal error' });
  store.resetFromSeed();
  assert.equal((await api('/api/export?month=2026-03')).status, 200);
});

test('GET /api/expenses rejects bad paging', async () => {
  assert.equal((await api('/api/expenses?page=0')).status, 400);
  assert.equal((await api('/api/expenses?limit=abc')).status, 400);
});

test('POST /api/expenses creates and persists', async () => {
  const res = await post({ date: '2026-03-20', amount: 5.5, category: 'Food', note: 'Tea' });
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.ok(created.id);
  assert.equal(created.category, 'food');
  assert.equal(store.load().length, 13);
});

test('POST /api/expenses validates input', async () => {
  const res = await post({ date: 'nope', amount: 1, category: 'x' });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /date/);
  assert.equal(store.load().length, 12);
});

test('POST /api/expenses rejects dates that do not exist', async () => {
  for (const date of ['2026-02-31', '2026-04-31', '2026-02-30', '2026-02-29', '2026-13-01']) {
    const res = await post({ date, amount: 5, category: 'food', note: 'probe' });
    assert.equal(res.status, 400, date);
    assert.deepEqual(await res.json(), { error: 'date must be YYYY-MM-DD' });
  }
  assert.equal(store.load().length, 12);
  assert.equal((await (await api('/api/summary?month=2026-02')).json()).total, 315.29);
  assert.equal((await post({ date: '2028-02-29', amount: 5, category: 'food' })).status, 201);
});

test('POST /api/expenses rejects malformed JSON', async () => {
  const res = await api('/api/expenses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{bad',
  });
  assert.equal(res.status, 400);
});

test('DELETE /api/expenses/:id removes the expense', async () => {
  const res = await api('/api/expenses/a1', { method: 'DELETE' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).id, 'a1');
  assert.ok(!store.load().some((e) => e.id === 'a1'));
});

test('DELETE /api/expenses/:id returns 404 when nothing was removed', async () => {
  assert.equal((await api('/api/expenses/a1', { method: 'DELETE' })).status, 200);
  for (const id of ['a1', 'does-not-exist']) {
    const res = await api(`/api/expenses/${id}`, { method: 'DELETE' });
    assert.equal(res.status, 404);
    assert.ok((await res.json()).error);
  }
});

test('GET /api/summary totals one month', async () => {
  const body = await (await api('/api/summary?month=2026-01')).json();
  assert.equal(body.total, 186.25);
  assert.deepEqual(body.byCategory, { food: 21.25, transport: 45, bills: 120 });
});

test('GET /api/summary returns cent-exact totals for a drifting month', async () => {
  const body = await (await api('/api/summary?month=2026-02')).json();
  assert.equal(body.total, 315.29);
  assert.deepEqual(body.byCategory, { food: 40.09, transport: 15.2, fun: 60, bills: 200 });
});

test('GET /api/summary requires month', async () => {
  assert.equal((await api('/api/summary')).status, 400);
  assert.equal((await api('/api/summary?month=2026-1')).status, 400);
});

test('GET /api/summary rejects months that do not exist', async () => {
  for (const month of ['2026-13', '2026-00']) {
    const res = await api(`/api/summary?month=${month}`);
    assert.equal(res.status, 400, month);
    assert.deepEqual(await res.json(), { error: 'month must be YYYY-MM' });
  }
  assert.equal((await api('/api/summary?month=2026-12')).status, 200);
});

test('unknown routes and methods', async () => {
  assert.equal((await api('/api/nope')).status, 404);
  assert.equal((await api('/api/summary', { method: 'POST' })).status, 405);
  assert.equal((await api('/missing.txt')).status, 404);
});

const BUDGET = { total: 1500, categories: { food: 500, fun: 150 } };
const putBudget = (month, body) =>
  api(`/api/budget?month=${month}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const getBudget = async (month) => (await api(`/api/budget?month=${month}`)).json();

test('b-AC1 GET /api/budget returns the saved month in currency', async () => {
  await putBudget('2026-10', BUDGET);
  const res = await api('/api/budget?month=2026-10');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { month: '2026-10', source: '2026-10', budget: BUDGET });
});

test('b-AC2 GET /api/budget inherits from the nearest earlier month', async () => {
  await putBudget('2026-10', BUDGET);
  const res = await api('/api/budget?month=2026-11');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { month: '2026-11', source: '2026-10', budget: BUDGET });
});

test('b-AC3 GET /api/budget before the first saved month is null', async () => {
  await putBudget('2026-10', BUDGET);
  const res = await api('/api/budget?month=2026-09');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { month: '2026-09', source: null, budget: null });
});

test('b-AC4 GET and PUT /api/budget reject a bad or missing month', async () => {
  for (const query of ['?month=2026-13', '']) {
    for (const method of ['GET', 'PUT']) {
      const body = method === 'PUT' ? JSON.stringify(BUDGET) : undefined;
      const res = await api(`/api/budget${query}`, { method, body });
      assert.equal(res.status, 400, `${method} ${query}`);
      assert.deepEqual(await res.json(), { error: 'month must be YYYY-MM' });
    }
  }
  assert.deepEqual(store.loadBudgets(), {});
});

test('b-AC5 PUT /api/budget saves the month in cents', async () => {
  const res = await putBudget('2026-10', BUDGET);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { month: '2026-10', source: '2026-10', budget: BUDGET });
  assert.deepEqual(store.loadBudgets(), {
    '2026-10': { total: 150000, categories: { food: 50000, fun: 15000 } },
  });
});

test('b-AC6 PUT /api/budget replaces the month wholesale', async () => {
  await putBudget('2026-10', BUDGET);
  await putBudget('2026-12', { total: 2500, categories: { food: 900 } });
  const res = await putBudget('2026-10', { total: 1600 });
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).budget, { total: 1600, categories: {} });
  assert.deepEqual(store.loadBudgets(), {
    '2026-10': { total: 160000, categories: {} },
    '2026-12': { total: 250000, categories: { food: 90000 } },
  });
});

test('b-AC7 PUT on an inherited month writes only that month', async () => {
  await putBudget('2026-10', BUDGET);
  const res = await putBudget('2026-11', { total: 1800, categories: { bills: 700 } });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).source, '2026-11');
  assert.deepEqual(Object.keys(store.loadBudgets()).sort(), ['2026-10', '2026-11']);
  assert.deepEqual(await getBudget('2026-10'), { month: '2026-10', source: '2026-10', budget: BUDGET });
});

test('b-AC8 PUT /api/budget rejects malformed JSON', async () => {
  const res = await putBudget('2026-10', '{not json');
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'invalid JSON body' });
  assert.deepEqual(store.loadBudgets(), {});
});

test('b-AC9 PUT /api/budget rejects non-object bodies and writes nothing', async () => {
  for (const body of ['null', '[]', '5']) {
    const res = await putBudget('2026-10', body);
    assert.equal(res.status, 400, body);
    assert.deepEqual(await res.json(), { error: 'body must be an object' });
  }
  assert.deepEqual(store.loadBudgets(), {});
});

test('b-AC10 PUT /api/budget rejects invalid budgets and writes nothing', async () => {
  await putBudget('2026-12', BUDGET);
  const saved = store.loadBudgets();
  const cases = [
    [{ categories: { food: 500 } }, 'total must be a positive number'],
    [{ total: 0 }, 'total must be a positive number'],
    [{ total: -5 }, 'total must be a positive number'],
    [{ total: 0.004 }, 'total must be a positive number'],
    [{ total: 1500, categories: { food: 0 } }, 'food cap must be a positive number'],
    [{ total: 1500, categories: { food: -1 } }, 'food cap must be a positive number'],
    [{ total: 1500, categories: [] }, 'categories must be an object'],
    [{ total: 1500, categories: { coffee: 10 } }, 'coffee: category must be one of food, transport, bills, fun'],
    [{ total: 1500, categories: { food: 1, ' Food ': 2 } }, 'food: duplicate category'],
  ];
  for (const [body, error] of cases) {
    const res = await putBudget('2026-10', body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.deepEqual(await res.json(), { error });
  }
  assert.deepEqual(store.loadBudgets(), saved);
});

test('b-AC10 PUT /api/budget ignores unknown top-level keys', async () => {
  const res = await putBudget('2026-10', { total: 1500, note: 'x' });
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).budget, { total: 1500, categories: {} });
  assert.deepEqual(store.loadBudgets()['2026-10'], { total: 150000, categories: {} });
});

test('b-AC11 /api/budget rejects other methods with 405', async () => {
  for (const method of ['POST', 'DELETE', 'PATCH']) {
    const res = await api('/api/budget?month=2026-10', { method });
    assert.equal(res.status, 405, method);
  }
});

test('b-AC12 GET /api/budget returns 500 on an unreadable budgets file and keeps serving', async () => {
  writeFileSync(process.env.BUDGETS_FILE, '{not json');
  const res = await api('/api/budget?month=2026-10');
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'internal error' });
  const put = await putBudget('2026-10', BUDGET);
  assert.equal(put.status, 500);
  assert.deepEqual(await put.json(), { error: 'internal error' });
  assert.equal(readFileSync(process.env.BUDGETS_FILE, 'utf8'), '{not json');
  store.resetFromSeed();
  assert.equal((await api('/api/budget?month=2026-10')).status, 200);
});

test('b-AC13 README HTTP API table lists exactly the seven routes', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const section = readme.split(/^## HTTP API$/m)[1]?.split(/^## /m)[0] ?? '';
  const rows = section
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) => line.split('|').slice(1, 3).map((cell) => cell.trim().replaceAll('`', '')));
  assert.deepEqual(rows, [
    ['GET', '/api/expenses'],
    ['POST', '/api/expenses'],
    ['DELETE', '/api/expenses/:id'],
    ['GET', '/api/summary'],
    ['GET', '/api/export'],
    ['GET', '/api/budget'],
    ['PUT', '/api/budget'],
  ]);
});
