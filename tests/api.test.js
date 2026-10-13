import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let dir, server, base, store;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'expenses-api-'));
  process.env.EXPENSES_FILE = join(dir, 'expenses.json');
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

test('GET /api/summary totals one month', async () => {
  const body = await (await api('/api/summary?month=2026-01')).json();
  assert.equal(body.total, 186.25);
  assert.deepEqual(body.byCategory, { food: 21.25, transport: 45, bills: 120 });
});

test('GET /api/summary requires month', async () => {
  assert.equal((await api('/api/summary')).status, 400);
  assert.equal((await api('/api/summary?month=2026-1')).status, 400);
});

test('unknown routes and methods', async () => {
  assert.equal((await api('/api/nope')).status, 404);
  assert.equal((await api('/api/summary', { method: 'POST' })).status, 405);
  assert.equal((await api('/missing.txt')).status, 404);
});
