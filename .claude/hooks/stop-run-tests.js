#!/usr/bin/env node
// Stop hook: runs `npm test` when src/ or tests/ changed (dirty tree or branch diff vs origin/main).
// Reads the hook payload on stdin; exits 2 with the failing output on stderr so Claude keeps
// working, 0 otherwise.
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CODE_DIRS = ['src/', 'tests/'];
// ponytail: tail only, the node:test summary and failures sit at the end; raise if context gets cut.
const MAX_LINES = 150;

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

// Paths from `git status --porcelain`; a rename "R  old -> new" yields the new path.
export function changedPaths(porcelain) {
  return porcelain.split('\n').filter(Boolean).map((line) => line.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''));
}

export const touchesCode = (paths) => paths.some((p) => CODE_DIRS.some((dir) => p.startsWith(dir)));

function branchPaths(cwd) {
  let branch = '';
  try { branch = git(['symbolic-ref', '--short', 'HEAD'], cwd).trim(); } catch { /* detached HEAD */ }
  if (branch === 'main') return [];
  try { git(['rev-parse', '--verify', '-q', 'origin/main'], cwd); } catch { return []; }
  return git(['diff', '--name-only', 'origin/main...HEAD'], cwd).split('\n').filter(Boolean);
}

// Returns the failure report, or null when there is nothing to report.
export function check({ stop_hook_active, cwd = process.cwd() }) {
  if (stop_hook_active) return null;
  let paths;
  try {
    paths = [...changedPaths(git(['status', '--porcelain'], cwd)), ...branchPaths(cwd)];
  } catch {
    return null; // not a git repo: nothing to compare against
  }
  if (!touchesCode(paths)) return null;
  const res = spawnSync('npm', ['test'], { cwd, encoding: 'utf8' });
  if (res.status === 0) return null;
  const output = `${res.stdout ?? ''}${res.stderr ?? ''}${res.error ? `\n${res.error.message}` : ''}`;
  return output.trimEnd().split('\n').slice(-MAX_LINES).join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let report = null;
  try {
    report = check(JSON.parse(raw));
  } catch {
    process.exit(0); // malformed payload: fail open rather than trap every turn
  }
  if (report) {
    process.stderr.write(`Stop hook (.claude/hooks/stop-run-tests.js): npm test failed, fix before finishing.\n${report}\n`);
    process.exit(2);
  }
}
