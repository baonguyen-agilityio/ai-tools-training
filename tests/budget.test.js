import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const readJson = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));

let dir, store, budget, expenses;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'expenses-budget-'));
  process.env.EXPENSES_FILE = join(dir, 'expenses.json');
  process.env.BUDGETS_FILE = join(dir, 'budgets.json');
  store = await import('../src/store.js');
  budget = await import('../src/budget.js');
  expenses = await import('../src/expenses.js');
});
// Fresh budgets file per test so store tests pass alone and in any order.
let n = 0;
beforeEach(() => {
  process.env.BUDGETS_FILE = join(dir, `budgets-${++n}.json`);
});
after(() => rmSync(dir, { recursive: true, force: true }));

const B9 = { total: 90000, categories: {} };
const B10 = { total: 150000, categories: { food: 50000, fun: 15000 } };
const MSG_TOTAL = /^Error: total must be a positive number$/;
const MSG_COFFEE = /^Error: coffee: category must be one of food, transport, bills, fun$/;

test('AC1: loadBudgets returns {} and creates no file', () => {
  assert.deepEqual(store.loadBudgets(), {});
  assert.ok(!existsSync(store.budgetsFile()));
});

test('AC2: saveBudgets/loadBudgets round-trip at BUDGETS_FILE; default is <root>/data/budgets.json', () => {
  const budgets = { '2026-09': B9, '2026-10': B10 };
  store.saveBudgets(budgets);
  assert.equal(store.budgetsFile(), process.env.BUDGETS_FILE);
  assert.ok(existsSync(process.env.BUDGETS_FILE));
  assert.deepEqual(store.loadBudgets(), budgets);

  const saved = process.env.BUDGETS_FILE;
  delete process.env.BUDGETS_FILE;
  try {
    assert.equal(store.budgetsFile(), resolve(ROOT, 'data/budgets.json'));
  } finally {
    process.env.BUDGETS_FILE = saved;
  }
});

test('AC3: effectiveBudget returns the saved month itself', () => {
  assert.deepEqual(budget.effectiveBudget({ '2026-10': B10 }, '2026-10'), { source: '2026-10', budget: B10 });
});

test('AC4: effectiveBudget inherits the nearest earlier saved month across a gap', () => {
  assert.deepEqual(budget.effectiveBudget({ '2026-09': B9, '2026-10': B10 }, '2026-12'), { source: '2026-10', budget: B10 });
});

test('AC5: month before the first saved month → null/null', () => {
  assert.deepEqual(budget.effectiveBudget({ '2026-10': B10 }, '2026-09'), { source: null, budget: null });
});

test('AC6: empty budgets → null/null', () => {
  assert.deepEqual(budget.effectiveBudget({}, '2026-10'), { source: null, budget: null });
});

test('AC7: keys not matching MONTH_RE are ignored', () => {
  const budgets = { foo: B10, '2026-1': B10, '2026-09': B9 };
  assert.deepEqual(budget.effectiveBudget(budgets, '2026-10'), { source: '2026-09', budget: B9 });
});

test('AC7: a month argument not matching MONTH_RE → null/null', () => {
  const budgets = { '2026-09': B9, '2026-10': B10 };
  for (const month of ['foo', '2026-1', '', '2026-13']) {
    assert.deepEqual(budget.effectiveBudget(budgets, month), { source: null, budget: null }, `month=${month}`);
  }
});

test('AC8: validateBudget returns cents and accepts numeric strings', () => {
  assert.deepEqual(budget.validateBudget({ total: '1500.004', categories: { food: 500 } }), {
    total: 150000,
    categories: { food: 50000 },
  });
});

test('AC9: total missing / 0 / negative / NaN / text → total must be a positive number', () => {
  for (const total of [undefined, 0, -5, NaN, 'abc']) {
    assert.throws(() => budget.validateBudget({ total }), MSG_TOTAL, `total=${total}`);
  }
  assert.throws(() => budget.validateBudget({}), MSG_TOTAL);
});

test('AC10: cap key coffee → keyed category message', () => {
  assert.throws(() => budget.validateBudget({ total: 1, categories: { coffee: 10 } }), MSG_COFFEE);
});

test('AC11: cap key " Food " is trimmed and lowercased', () => {
  assert.deepEqual(budget.validateBudget({ total: 1, categories: { ' Food ': 500 } }).categories, { food: 50000 });
});

test('AC12: cap 0 / negative / text → <cat> cap must be a positive number', () => {
  for (const food of [0, -1, 'abc']) {
    assert.throws(
      () => budget.validateBudget({ total: 1, categories: { food } }),
      /^Error: food cap must be a positive number$/,
      `food=${food}`,
    );
  }
});

test('AC13: categories null / array / string rejected; omitted or {} → {}', () => {
  for (const categories of [null, [], 'food']) {
    assert.throws(() => budget.validateBudget({ total: 1, categories }), /^Error: categories must be an object$/);
  }
  assert.deepEqual(budget.validateBudget({ total: 1 }), { total: 100, categories: {} });
  assert.deepEqual(budget.validateBudget({ total: 1, categories: {} }), { total: 100, categories: {} });
});

test('AC14: input null / array / number → body must be an object', () => {
  for (const input of [null, [], 5]) {
    assert.throws(() => budget.validateBudget(input), /^Error: body must be an object$/);
  }
});

test('AC15: error precedence: total before categories, keys in insertion order', () => {
  assert.throws(() => budget.validateBudget({ total: 0, categories: { coffee: 0 } }), MSG_TOTAL);
  assert.throws(() => budget.validateBudget({ total: 1, categories: { coffee: 10, food: 0 } }), MSG_COFFEE);
});

test('AC16: loadBudgets throws on unparsable JSON', () => {
  writeFileSync(store.budgetsFile(), '{not json');
  assert.throws(() => store.loadBudgets(), SyntaxError);
});

test('AC17: resetFromSeed resets both temp files (default and demo pair)', () => {
  store.resetFromSeed();
  assert.deepEqual(store.load(), readJson('data/seed.json'));
  assert.deepEqual(store.loadBudgets(), readJson('data/seed-budgets.json'));
  assert.deepEqual(store.loadBudgets(), {});

  store.resetFromSeed({ demo: true });
  assert.deepEqual(store.load(), readJson('data/demo-seed.json'));
  assert.deepEqual(store.loadBudgets(), readJson('data/demo-budgets.json'));
});

test('AC18: budgetsFile() and dataFile() are outside the repo data/ directory', () => {
  const dataDir = resolve(ROOT, 'data') + sep;
  assert.ok(!store.budgetsFile().startsWith(dataDir), store.budgetsFile());
  assert.ok(!store.dataFile().startsWith(dataDir), store.dataFile());
});

test('AC19: .gitignore lists data/budgets.json', () => {
  const lines = readFileSync(resolve(ROOT, '.gitignore'), 'utf8').split('\n').map((l) => l.trim());
  assert.ok(lines.includes('data/budgets.json'));
});

test('AC21: monthCents returns integer cents; summary is built on it', () => {
  const seed = readJson('data/seed.json');
  const { cents, byCategory } = expenses.monthCents(seed, '2026-01');
  assert.ok(Number.isInteger(cents));
  assert.ok(Object.values(byCategory).every(Number.isInteger));
  const s = expenses.summary(seed, '2026-01');
  assert.equal(s.total, cents / 100);
  assert.deepEqual(s.byCategory, Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, v / 100])));
  assert.deepEqual(expenses.monthCents([{ date: '2026-01-02', amount: 0.1 }, { date: '2026-01-03', amount: 0.2 }].map((e) => ({ ...e, category: 'food' })), '2026-01'), {
    cents: 30,
    byCategory: { food: 30 },
  });
});

test('AC22: rounded cents value 0 (0.004) is rejected', () => {
  assert.throws(() => budget.validateBudget({ total: 0.004 }), MSG_TOTAL);
  assert.throws(
    () => budget.validateBudget({ total: 1, categories: { food: 0.004 } }),
    /^Error: food cap must be a positive number$/,
  );
});

test('AC23: two keys normalising to the same category → food: duplicate category', () => {
  assert.throws(
    () => budget.validateBudget({ total: 1, categories: { food: 1, ' Food ': 2 } }),
    /^Error: food: duplicate category$/,
  );
});

test('toWire: converts cents back to currency', () => {
  assert.deepEqual(budget.toWire({ total: 150050, categories: { food: 50000 } }), {
    total: 1500.5,
    categories: { food: 500 },
  });
  assert.equal(budget.BUDGET_CATEGORIES.join(','), 'food,transport,bills,fun');
});
