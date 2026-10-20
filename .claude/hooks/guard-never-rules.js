#!/usr/bin/env node
// PreToolUse guard for the CLAUDE.md "Never" list. Reads the hook payload on
// stdin; exits 2 with a reason on stderr to block, 0 to allow.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DATA_FILE = /(^|[^\w.-])data\/expenses\.json(?![\w.-])/i;
const READ_ONLY = new Set(['cat', 'less', 'more', 'head', 'tail', 'grep', 'egrep', 'fgrep', 'rg', 'wc', 'jq',
  'ls', 'stat', 'file', 'diff', 'cmp', 'shasum', 'md5', 'echo', 'printf']);
const GIT_READ_ONLY = new Set(['diff', 'log', 'show', 'status', 'blame', 'ls-files']);
const WRAPPERS = new Set(['sudo', 'env', 'command', 'exec', 'time', 'nohup']);
const SHELLS = new Set(['sh', 'bash', 'zsh']);
// git commit short options whose value is the rest of the cluster or the next word.
const COMMIT_VALUE_OPTS = 'mFcCt';

const MSG = {
  data: 'data/expenses.json is the real dev data file. Point EXPENSES_FILE at a temp file instead, or use `npm run seed` to reset it.',
  push: 'Force-pushing main/master is forbidden. Force-push only your own PR branch, with --force-with-lease.',
  noVerify: 'git commit --no-verify (-n) skips the hooks. Fix whatever the hook reports and commit normally.',
};

// Split a shell command into segments of words; operators (; | & && || newline) end a segment,
// redirects become their own '>' / '<' words. Quotes are honoured, expansions are not.
function segments(cmd) {
  const out = [];
  let words = [], word = '', inWord = false, quote = null;
  const endWord = () => { if (inWord) words.push(word); word = ''; inWord = false; };
  const endSeg = () => { endWord(); if (words.length) out.push(words); words = []; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < cmd.length) word += cmd[++i];
      else word += c;
    } else if (c === '"' || c === "'") { quote = c; inWord = true; }
    else if (c === '\\' && i + 1 < cmd.length) { word += cmd[++i]; inWord = true; }
    else if (/\s/.test(c) && c !== '\n') endWord();
    else if (';|&\n()`'.includes(c)) {
      if (c === '&' && cmd[i + 1] === '>') continue; // &> is a redirect, handled next char
      endSeg();
    } else if (c === '>' || c === '<') {
      if (/^\d+$/.test(word)) { word = ''; inWord = false; } // drop fd number in 2>
      endWord();
      while (cmd[i + 1] === '>' || cmd[i + 1] === '|' || cmd[i + 1] === '&') i++;
      words.push(c);
    } else { word += c; inWord = true; }
  }
  endSeg();
  return out;
}

const isAssignment = (w) => /^[A-Za-z_]\w*=/.test(w);

function commandStart(words) {
  let i = 0;
  while (i < words.length && (isAssignment(words[i]) || WRAPPERS.has(words[i]))) i++;
  return i;
}

// Index of the git subcommand after global options (-C dir, -c k=v, --git-dir=...).
function gitSub(words, i) {
  for (i++; i < words.length; i++) {
    if (words[i] === '-C' || words[i] === '-c') i++;
    else if (!words[i].startsWith('-')) return i;
  }
  return -1;
}

function writesDataFile(words) {
  const start = commandStart(words);
  const cmd = words[start];
  let readOnly = READ_ONLY.has(cmd);
  if (cmd === 'git') readOnly = GIT_READ_ONLY.has(words[gitSub(words, start)]);
  if (cmd === 'sed') readOnly = !words.some((w) => /^-[a-zA-Z]*i|^--in-place/.test(w));
  return words.some((w, i) => {
    if (!DATA_FILE.test(w)) return false;
    if (words[i - 1] === '>') return true;
    if (words[i - 1] === '<') return false;
    return isAssignment(w) || !readOnly;
  });
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function forcePushesMain(words, cwd) {
  const start = commandStart(words);
  if (words[start] !== 'git') return false;
  const sub = gitSub(words, start);
  if (words[sub] !== 'push') return false;
  let force = false, all = false;
  const positional = [];
  for (let i = sub + 1; i < words.length; i++) {
    const w = words[i];
    if (w === '>' || w === '<') { i++; continue; }
    if (/^--force(-with-lease|-if-includes)?(=|$)/.test(w) || /^-[a-zA-Z]*f/.test(w) && !w.startsWith('--')) force = true;
    else if (w === '--mirror') force = all = true;
    else if (w === '--all' || w === '--branches') all = true;
    else if (['--repo', '-o', '--push-option', '--receive-pack', '--exec'].includes(w)) i++;
    else if (!w.startsWith('-')) positional.push(w);
  }
  const refspecs = positional.slice(1);
  if (refspecs.some((r) => r.startsWith('+'))) force = true;
  if (!force) return false;
  if (all) return true;
  const isMain = (ref) => /^(refs\/heads\/)?(main|master)$/.test(ref);
  const branch = currentBranch(cwd);
  if (!refspecs.length) return isMain(branch);
  return refspecs.some((r) => {
    const dest = r.replace(/^\+/, '').split(':').pop();
    return isMain(dest) || (dest === 'HEAD' && isMain(branch));
  });
}

function commitNoVerify(words) {
  const start = commandStart(words);
  if (words[start] !== 'git') return false;
  const sub = gitSub(words, start);
  if (words[sub] !== 'commit') return false;
  for (let i = sub + 1; i < words.length; i++) {
    const w = words[i];
    if (w === '--') break;
    if (w.startsWith('--')) {
      if (w.length > 8 && '--no-verify'.startsWith(w)) return true; // git accepts unique prefixes
      if (['--message', '--file', '--reuse-message', '--reedit-message', '--template', '--author', '--date'].includes(w)) i++;
    } else if (w.startsWith('-') && w.length > 1) {
      for (let j = 1; j < w.length; j++) {
        if (w[j] === 'n') return true;
        if (COMMIT_VALUE_OPTS.includes(w[j])) { if (j === w.length - 1) i++; break; }
        if (w[j] === 'S' || w[j] === 'u') break; // optional attached value
      }
    }
  }
  return false;
}

function checkBash(cmd, cwd) {
  for (const words of segments(cmd)) {
    const start = commandStart(words);
    if (SHELLS.has(words[start]) && words[start + 1] === '-c' && words[start + 2]) {
      const nested = checkBash(words[start + 2], cwd);
      if (nested) return nested;
    }
    if (words[start] === 'eval') {
      const nested = checkBash(words.slice(start + 1).join(' '), cwd);
      if (nested) return nested;
    }
    if (writesDataFile(words)) return MSG.data;
    if (forcePushesMain(words, cwd)) return MSG.push;
    if (commitNoVerify(words)) return MSG.noVerify;
  }
  return null;
}

export function check({ tool_name, tool_input = {}, cwd = process.cwd() }) {
  if (tool_name === 'Bash') return checkBash(tool_input.command ?? '', cwd);
  const file = tool_input.file_path ?? tool_input.notebook_path ?? '';
  return DATA_FILE.test(file) ? MSG.data : null;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let reason = null;
  try {
    reason = check(JSON.parse(raw));
  } catch {
    process.exit(0); // malformed payload: fail open rather than wedge every tool call
  }
  if (reason) {
    process.stderr.write(`Blocked by .claude/hooks/guard-never-rules.js (CLAUDE.md "Never" list): ${reason}\n`);
    process.exit(2);
  }
}
