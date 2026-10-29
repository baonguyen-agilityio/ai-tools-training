import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { changedPaths, touchesCode } from '../.claude/hooks/stop-run-tests.js';

const HOOK = new URL('../.claude/hooks/stop-run-tests.js', import.meta.url).pathname;
const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, stdio: 'ignore' });
function write(dir, file, content = '') {
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), content);
}

// Temp repo on main whose own `npm test` passes or fails with a marker, so the hook never runs the real suite.
function repo(testsPass) {
  const dir = mkdtempSync(join(tmpdir(), 'stop-hook-'));
  dirs.push(dir);
  const script = testsPass ? 'node -e "process.exit(0)"' : 'node -e "console.log(\'STOP-MARKER\'); process.exit(1)"';
  write(dir, 'package.json', JSON.stringify({ name: 'x', private: true, scripts: { test: script } }));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', 'base');
  return dir;
}

function run(payload) {
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return spawnSync('node', [HOOK], { input, encoding: 'utf8' });
}
const allowed = (res) => assert.equal(res.status, 0, res.stderr);

test('stop hook: malformed payload fails open', () => {
  allowed(run('not json'));
});

test('stop hook: stop_hook_active skips the run', () => {
  const dir = repo(false);
  write(dir, 'src/a.js');
  allowed(run({ cwd: dir, stop_hook_active: true }));
});

test('stop hook: no src/ or tests/ change skips the run', () => {
  const dir = repo(false);
  allowed(run({ cwd: dir, stop_hook_active: false }));
  write(dir, 'docs/x.md');
  allowed(run({ cwd: dir, stop_hook_active: false }));
});

test('stop hook: dirty src/ with passing tests exits 0', () => {
  const dir = repo(true);
  write(dir, 'src/a.js');
  allowed(run({ cwd: dir, stop_hook_active: false }));
});

test('stop hook: dirty tests/ with failing tests exits 2 with the output', () => {
  const dir = repo(false);
  write(dir, 'tests/a.test.js');
  const res = run({ cwd: dir, stop_hook_active: false });
  assert.equal(res.status, 2);
  assert.match(res.stderr, /npm test failed/);
  assert.match(res.stderr, /STOP-MARKER/);
});

test('stop hook: committed src/ change on a branch still runs the tests', () => {
  const dir = repo(false);
  git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  git(dir, 'checkout', '-q', '-b', 'feat/x');
  write(dir, 'src/a.js');
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', 'change');
  const res = run({ cwd: dir, stop_hook_active: false });
  assert.equal(res.status, 2);
  assert.match(res.stderr, /STOP-MARKER/);
});

test('stop hook: branch diff is skipped on main or without origin/main', () => {
  const onMain = repo(false);
  git(onMain, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  write(onMain, 'src/a.js');
  git(onMain, 'add', '.');
  git(onMain, 'commit', '-q', '-m', 'change');
  allowed(run({ cwd: onMain, stop_hook_active: false }));

  const noRemote = repo(false);
  git(noRemote, 'checkout', '-q', '-b', 'feat/x');
  write(noRemote, 'src/a.js');
  git(noRemote, 'add', '.');
  git(noRemote, 'commit', '-q', '-m', 'change');
  allowed(run({ cwd: noRemote, stop_hook_active: false }));
});

test('stop hook: outside a git repo exits 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stop-hook-nogit-'));
  dirs.push(dir);
  allowed(run({ cwd: dir, stop_hook_active: false }));
});

test('stop hook: porcelain parsing follows renames into src/', () => {
  const paths = changedPaths('R  lib/a.js -> src/a.js\n M docs/x.md\n?? "tests/b c.js"\n');
  assert.deepEqual(paths, ['src/a.js', 'docs/x.md', 'tests/b c.js']);
  assert.ok(touchesCode(['src/a.js']));
  assert.ok(!touchesCode(['docs/x.md', 'srcs/a.js']));
});
