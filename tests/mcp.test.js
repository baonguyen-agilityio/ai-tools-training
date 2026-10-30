import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const ROOT = resolve(import.meta.dirname, '..');
let dir, client;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'expenses-mcp-'));
  const file = join(dir, 'expenses.json');
  copyFileSync(resolve(ROOT, 'data/seed.json'), file);
  client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [resolve(ROOT, 'mcp/expenses-server.js')],
      env: { ...process.env, EXPENSES_FILE: file, BUDGETS_FILE: join(dir, 'budgets.json') },
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
