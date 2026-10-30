import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { summaryWithBudget } from '../src/budget.js';

const ROOT = resolve(import.meta.dirname, '..');
let dir, client, file, budgetsFile;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'expenses-mcp-'));
  file = join(dir, 'expenses.json');
  budgetsFile = join(dir, 'budgets.json');
  copyFileSync(resolve(ROOT, 'data/seed.json'), file);
  writeFileSync(budgetsFile, JSON.stringify({ '2026-02': { total: 30000, categories: { food: 5000 } } }));
  client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [resolve(ROOT, 'mcp/expenses-server.js')],
      env: { ...process.env, EXPENSES_FILE: file, BUDGETS_FILE: budgetsFile },
    }),
  );
});
after(async () => {
  await client.close();
  rmSync(dir, { recursive: true, force: true });
});

test('MCP server: lists tools, summarises a month, rejects a bad month', async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['monthly_summary', 'search_expenses']);

  const res = await client.callTool({ name: 'monthly_summary', arguments: { month: '2026-02' } });
  assert.equal(JSON.parse(res.content[0].text).total, 315.29);

  await assert.rejects(
    client.callTool({ name: 'monthly_summary', arguments: { month: '2026-13' } }),
    /month must be YYYY-MM/,
  );
});

test('MCP server: search_expenses finds by note, rejects an empty q', async () => {
  const res = await client.callTool({ name: 'search_expenses', arguments: { q: 'coffee' } });
  assert.deepEqual(JSON.parse(res.content[0].text).items.map((e) => e.id), ['a3']);

  await assert.rejects(
    client.callTool({ name: 'search_expenses', arguments: { q: '   ' } }),
    /q must not be empty/,
  );
});

test('c-AC15: monthly_summary deep-equals summaryWithBudget over the same temp files', async () => {
  const res = await client.callTool({ name: 'monthly_summary', arguments: { month: '2026-02' } });
  const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
  const expected = summaryWithBudget(read(file), read(budgetsFile), '2026-02');
  assert.ok(expected.budget);
  assert.deepEqual(JSON.parse(res.content[0].text), expected);
});
