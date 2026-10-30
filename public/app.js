// Minimal client: fetch from the API, render, re-fetch after every mutation.
const state = { page: 1, limit: 10, category: '', q: '' };
let listSeq = 0; // bumped per loadList(); a response for an older request is dropped
let budgetSeq = 0; // same guard for loadBudget()
const CAPS = ['food', 'transport', 'bills', 'fun']; // mirrors BUDGET_CATEGORIES in src/budget.js (source of truth)

const $ = (sel) => document.querySelector(sel);
const rows = $('#expense-rows');
const pageInfo = $('#page-info');
const form = $('#expense-form');
const formError = $('#form-error');
const summaryMonth = $('#summary-month');
const budgetForm = $('#budget-form');
const budgetSource = $('#budget-source');
const budgetSaved = $('#budget-saved');
const budgetError = $('#budget-error');

async function api(path, init) {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? res.statusText), { status: res.status });
  return body;
}

async function loadList() {
  const params = new URLSearchParams({ page: state.page, limit: state.limit });
  if (state.category) params.set('category', state.category);
  if (state.q) params.set('q', state.q);
  const seq = ++listSeq;
  const { items, total, page, limit } = await api(`/api/expenses?${params}`);
  if (seq !== listSeq) return;
  const pages = Math.max(1, Math.ceil(total / limit));

  rows.replaceChildren(
    ...items.map((e) => {
      const tr = document.createElement('tr');
      tr.dataset.testid = 'expense-row';
      tr.dataset.id = e.id;
      tr.innerHTML = `
        <td>${escapeHtml(e.date)}</td>
        <td class="amount">${escapeHtml(money(e.amount))}</td>
        <td>${escapeHtml(e.category)}</td>
        <td>${highlight(e.note, state.q)}</td>
        <td><button type="button" data-testid="delete-btn" data-id="${escapeHtml(e.id)}">Delete</button></td>`;
      return tr;
    }),
  );
  pageInfo.textContent = `Page ${page} of ${pages} (${total} total)`;
  $('#page-prev').disabled = page <= 1;
  $('#page-next').disabled = page >= pages;
}

async function loadSummary() {
  const month = summaryMonth.value;
  if (!month) return;
  $('#export-link').href = `/api/export?month=${month}`;
  const { total, byCategory } = await api(`/api/summary?month=${month}`);
  $('#summary-total').textContent = money(total);
  $('#summary-categories').replaceChildren(
    ...Object.entries(byCategory).map(([cat, amt]) => {
      const li = document.createElement('li');
      li.dataset.testid = 'summary-category';
      li.dataset.category = cat;
      li.textContent = `${cat}: ${money(amt)}`;
      return li;
    }),
  );
}

// Pre-fills the budget form with the month's effective budget; an inherited one is flagged (D3a).
async function loadBudget() {
  const month = summaryMonth.value;
  if (!month) return;
  const seq = ++budgetSeq;
  const { source, budget } = await api(`/api/budget?month=${month}`);
  if (seq !== budgetSeq) return;
  const f = budgetForm.elements;
  f.total.value = budget ? money(budget.total) : '';
  for (const cat of CAPS) f[cat].value = budget?.categories[cat] ? money(budget.categories[cat]) : '';
  budgetSource.textContent = `copied from ${source}, not saved`;
  budgetSource.hidden = !source || source === month;
}

function hideBudgetMessages() {
  budgetSaved.hidden = true;
  budgetError.hidden = true;
}

/**
 * Escaped text with every literal, case-insensitive match of the search term
 * wrapped in <mark>. Matching runs on the raw note and escaping on each piece,
 * so the term can never match inside an escaped entity like &#39;.
 */
function highlight(text, q) {
  const s = String(text);
  if (!q) return escapeHtml(s);
  const lower = s.toLowerCase();
  const needle = q.toLowerCase();
  let out = '';
  let i = 0;
  for (let j = lower.indexOf(needle, i); j !== -1; j = lower.indexOf(needle, i)) {
    out += escapeHtml(s.slice(i, j)) + `<mark>${escapeHtml(s.slice(j, j + needle.length))}</mark>`;
    i = j + needle.length;
  }
  return out + escapeHtml(s.slice(i));
}

// Two decimals, same as the CSV export; non-numbers pass through untouched so they still render literally.
const money = (n) => (typeof n === 'number' ? n.toFixed(2) : n);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// --- events ---
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  formError.hidden = true;
  const input = Object.fromEntries(new FormData(form));
  try {
    await api('/api/expenses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
    return;
  }
  form.reset();
  await Promise.all([loadList(), loadSummary()]);
});

budgetForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  hideBudgetMessages();
  const month = summaryMonth.value;
  const f = budgetForm.elements;
  // Numbers on the wire, empty caps omitted (R18).
  const categories = Object.fromEntries(CAPS.filter((cat) => f[cat].value).map((cat) => [cat, Number(f[cat].value)]));
  const failure = await api(`/api/budget?month=${month}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ total: Number(f.total.value), categories }),
  }).then(() => null, (err) => err);
  // Month changed mid-save: the form now shows another month, so neither outcome is reported there.
  if (summaryMonth.value !== month) return;
  if (failure) {
    budgetError.textContent = failure.message;
    budgetError.hidden = false;
    return;
  }
  budgetSaved.textContent = `Saved for ${month}.`;
  budgetSaved.hidden = false;
  await Promise.all([loadBudget(), loadSummary()]);
});

rows.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-testid="delete-btn"]');
  if (!btn) return;
  try {
    await api(`/api/expenses/${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
  } catch (err) {
    // 404: already gone (stale page, double-click), nothing to report. Anything else is a real failure.
    if (err.status !== 404) throw err;
  } finally {
    await Promise.all([loadList(), loadSummary()]);
  }
});

$('#filter-category').addEventListener('change', (ev) => {
  state.category = ev.target.value.trim();
  state.page = 1;
  loadList();
});

$('#search-note').addEventListener('input', (ev) => {
  state.q = ev.target.value.trim();
  state.page = 1;
  loadList();
});

$('#page-prev').addEventListener('click', () => { state.page -= 1; loadList(); });
$('#page-next').addEventListener('click', () => { state.page += 1; loadList(); });
summaryMonth.addEventListener('change', loadSummary);
summaryMonth.addEventListener('change', () => { hideBudgetMessages(); loadBudget(); });

// --- init ---
summaryMonth.value = currentMonth();
loadList();
loadSummary();
loadBudget();
