import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const HOOK = new URL('../.claude/hooks/guard-never-rules.js', import.meta.url).pathname;

let mainRepo, featureRepo;
before(() => {
  mainRepo = mkdtempSync(join(tmpdir(), 'guard-main-'));
  featureRepo = mkdtempSync(join(tmpdir(), 'guard-feat-'));
  execFileSync('git', ['init', '-q', '-b', 'main', mainRepo]);
  execFileSync('git', ['init', '-q', '-b', 'feat/x', featureRepo]);
});
after(() => {
  rmSync(mainRepo, { recursive: true, force: true });
  rmSync(featureRepo, { recursive: true, force: true });
});

function run(tool_name, tool_input, cwd = featureRepo) {
  return spawnSync('node', [HOOK], { input: JSON.stringify({ tool_name, tool_input, cwd }), encoding: 'utf8' });
}
const bash = (command, cwd) => run('Bash', { command }, cwd);

function blocked(res, pattern) {
  assert.equal(res.status, 2, `expected block, got ${res.status}`);
  assert.match(res.stderr, pattern);
}
const allowed = (res) => assert.equal(res.status, 0, res.stderr);

test('guard: blocks writes to data/expenses.json', () => {
  for (const cmd of [
    'echo [] > data/expenses.json',
    'jq . data/seed.json >>./data/expenses.json',
    'cp data/seed.json data/expenses.json',
    'sed -i "" s/a/b/ data/expenses.json',
    'cat data/seed.json | tee data/expenses.json',
    'EXPENSES_FILE=data/expenses.json npm test',
    'node -e "fs.writeFileSync(\'data/expenses.json\', \'[]\')"',
    'bash -c "rm data/expenses.json"',
  ]) blocked(bash(cmd), /data\/expenses\.json/);
  blocked(run('Write', { file_path: '/repo/data/expenses.json', content: '[]' }), /EXPENSES_FILE/);
  blocked(run('Edit', { file_path: 'data/Expenses.json', old_string: 'a', new_string: 'b' }), /EXPENSES_FILE/);
});

test('guard: allows reads and other files', () => {
  for (const cmd of [
    'cat data/expenses.json',
    'jq length < data/expenses.json',
    'git diff data/expenses.json',
    'sed -n 1,5p data/expenses.json',
    'cp data/seed.json /tmp/expenses.json',
    'echo [] > data/expenses.json.bak',
    'npm run seed',
  ]) allowed(bash(cmd));
  allowed(run('Write', { file_path: '/repo/data/seed.json', content: '[]' }));
});

test('guard: blocks force-push to main/master', () => {
  for (const cmd of [
    'git push --force origin main',
    'git push -f origin master',
    'git push origin +main',
    'git push --force-with-lease origin HEAD:refs/heads/main',
    'git -C . push -uf origin main',
    'git push --mirror origin',
    'git checkout main && git push origin HEAD:main --force',
  ]) blocked(bash(cmd), /main\/master/);
  blocked(bash('git push --force', mainRepo), /main\/master/);
  blocked(bash('git push -f origin HEAD', mainRepo), /main\/master/);
});

test('guard: allows normal pushes and force-with-lease on a feature branch', () => {
  allowed(bash('git push --force-with-lease origin feat/day-09-hooks'));
  allowed(bash('git push --force-with-lease'));
  allowed(bash('git push origin main', mainRepo));
  allowed(bash('git push -u origin feat/maintenance'));
});

test('guard: blocks git commit --no-verify', () => {
  for (const cmd of [
    'git commit --no-verify -m "fix: x"',
    'git commit -n -m "fix: x"',
    'git commit -anm "fix: x"',
    'git add . && git commit --no-veri -m x',
  ]) blocked(bash(cmd), /--no-verify/);
});

test('guard: allows commits that only mention no-verify', () => {
  allowed(bash('git commit -m "docs: explain why --no-verify is banned"'));
  allowed(bash('git commit -mn'));
  allowed(bash('git commit --no-verbose -m x'));
  allowed(bash('git log --no-verify'));
});
