// @ts-check
// Project MCP server (stdio): read-only tools over the expense store.
// Run: node mcp/expenses-server.js  (EXPENSES_FILE honoured via src/store.js)
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as store from '../src/store.js';
import { list, MONTH_RE } from '../src/expenses.js';
import { summaryWithBudget } from '../src/budget.js';

const TOOLS = [
  {
    name: 'monthly_summary',
    description: 'Total and per-category totals for one month (YYYY-MM).',
    inputSchema: {
      type: 'object',
      properties: { month: { type: 'string', description: 'Month as YYYY-MM' } },
      required: ['month'],
    },
  },
  {
    name: 'search_expenses',
    description: 'Search expense notes (case-insensitive), newest first, optional category filter, 10 per page.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Text to find in the note' },
        category: { type: 'string', description: 'Lowercase category slug' },
        page: { type: 'integer', minimum: 1, description: '1-based page, default 1' },
      },
      required: ['q'],
    },
  },
];

/** @param {unknown} value */
const json = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });

/** @param {Record<string, unknown>} args */
function monthlySummary(args) {
  const month = String(args.month ?? '');
  if (!MONTH_RE.test(month)) throw new McpError(ErrorCode.InvalidParams, 'month must be YYYY-MM');
  return json(summaryWithBudget(store.load(), store.loadBudgets(), month));
}

/** @param {Record<string, unknown>} args */
function searchExpenses(args) {
  const q = String(args.q ?? '').trim();
  if (!q) throw new McpError(ErrorCode.InvalidParams, 'q must not be empty');
  const page = args.page === undefined ? 1 : Number(args.page);
  if (!Number.isInteger(page) || page < 1) {
    throw new McpError(ErrorCode.InvalidParams, 'page must be a positive integer');
  }
  const category = args.category === undefined ? undefined : String(args.category);
  return json(list(store.load(), { q, category, page }));
}

export const server = new Server({ name: 'expenses', version: '0.1.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
  const args = params.arguments ?? {};
  if (params.name === 'monthly_summary') return monthlySummary(args);
  if (params.name === 'search_expenses') return searchExpenses(args);
  throw new McpError(ErrorCode.MethodNotFound, `unknown tool: ${params.name}`);
});

await server.connect(new StdioServerTransport());
