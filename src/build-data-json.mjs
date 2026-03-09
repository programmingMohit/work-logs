#!/usr/bin/env node

/**
 * build-data-json
 *
 * Builds data.json from git history across all repos in ~/Desktop/Nimbly.
 * Run once after backfill completes to seed data.json for the dashboard.
 *
 * Usage: node ~/worklog/build-data-json.mjs
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const NIMBLY_DIR  = join(homedir(), 'Desktop/Nimbly');
const STAGING_DIR = join(homedir(), '.worklog');
const GH_PERSONAL = 'programmingMohit';
const LOGS_REPO = `git@github-programmingMohit:${GH_PERSONAL}/work-logs.git`;
const GIT_AUTHORS    = '--author="mohit.chakraborty@hellonimbly.com" --author="MohitChakrabortyNimbly"';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();
  } catch {
    return '';
  }
}

// Extract branch name from merge commit subject (best approximation for historical data)
function branchFromMerge(subject) {
  if (!subject) return null;
  // "Merge pull request #123 from Nimbly-Technologies/feature/branch-name"
  const prMatch = subject.match(/from [^/]+\/(.+)$/);
  if (prMatch) return prMatch[1].trim();
  // "Merge branch 'feature/branch-name' into main"
  const branchMatch = subject.match(/Merge branch '([^']+)'/);
  if (branchMatch) return branchMatch[1].trim();
  return null;
}

function fmt(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d) ? null : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

console.log('\nScanning repos for commit history...');

const repos = run(
  `find "${NIMBLY_DIR}" -maxdepth 2 -name ".git" -type d -not -path "*/node_modules/*" 2>/dev/null`
).split('\n').filter(Boolean).map(p => p.replace('/.git', ''));

// date -> { commits, repoMap: { repoName -> { branch, commits, added, deleted, timestamps } } }
const byDate = new Map();

for (const repo of repos) {
  const name = repo.split('/').pop();

  const gitLog = run(
    `git -C "${repo}" log ${GIT_AUTHORS} --format="%H%x1f%s%x1f%ai%x1e" 2>/dev/null`
  );
  if (!gitLog) continue;

  const currentBranch = run(`git -C "${repo}" branch --show-current 2>/dev/null`) || 'main';

  // numstat: additions/deletions per commit, keyed by hash
  const numstatRaw = run(
    `git -C "${repo}" log ${GIT_AUTHORS} --numstat --format="%H%x1e" 2>/dev/null`
  );

  // Parse numstat into map: hash -> { added, deleted }
  const numstatByHash = new Map();
  let currentHash = null;
  for (const line of numstatRaw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.includes('\x1e')) {
      currentHash = trimmed.replace('\x1e', '').slice(0, 8);
      numstatByHash.set(currentHash, { added: 0, deleted: 0 });
    } else if (currentHash && trimmed) {
      const [a, d] = trimmed.split('\t');
      const entry = numstatByHash.get(currentHash);
      if (a !== '-') entry.added   += parseInt(a) || 0;
      if (d !== '-') entry.deleted += parseInt(d) || 0;
    }
  }

  for (const record of gitLog.split('\x1e').filter(r => r.trim())) {
    const [hash, subject, datetime] = record.trim().split('\x1f');
    if (!hash || !datetime) continue;

    const date  = datetime.slice(0, 10);
    const short = hash.slice(0, 8);
    const stats = numstatByHash.get(short) ?? { added: 0, deleted: 0 };

    if (!byDate.has(date)) byDate.set(date, new Map());
    const repoMap = byDate.get(date);

    if (!repoMap.has(name)) {
      repoMap.set(name, { currentBranch, commits: 0, added: 0, deleted: 0, timestamps: [], subjects: [] });
    }

    const r = repoMap.get(name);
    r.commits++;
    r.added    += stats.added;
    r.deleted  += stats.deleted;
    r.timestamps.push(datetime);
    if (subject) r.subjects.push(subject.trim());
  }
}

console.log(`Found ${byDate.size} days with activity.\nBuilding data.json...`);

const days = [...byDate.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, repoMap]) => {
    const repos = [...repoMap.entries()].map(([name, r]) => ({
      name,
      branch:  r.subjects.map(branchFromMerge).find(b => b !== null) ?? r.currentBranch,
      commits: r.commits,
      added:   r.added,
      deleted: r.deleted,
    }));

    const allTimestamps = [...repoMap.values()]
      .flatMap(r => r.timestamps)
      .map(t => new Date(t))
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b);

    return {
      date,
      commits:     repos.reduce((s, r) => s + r.commits, 0),
      added:       repos.reduce((s, r) => s + r.added,   0),
      deleted:     repos.reduce((s, r) => s + r.deleted, 0),
      firstCommit: allTimestamps.length ? fmt(allTimestamps[0])                         : null,
      lastCommit:  allTimestamps.length ? fmt(allTimestamps[allTimestamps.length - 1])  : null,
      repos,
    };
  });

const dataFile = join(STAGING_DIR, 'data.json');
writeFileSync(dataFile, JSON.stringify({ updated: new Date().toISOString(), days }, null, 2));
console.log(`Written ${days.length} entries to ${dataFile}`);

// Push
console.log('Pushing data.json...');
run(`git -C "${STAGING_DIR}" pull --rebase origin main 2>/dev/null`);
run(`git -C "${STAGING_DIR}" add data.json`);
run(`git -C "${STAGING_DIR}" -c user.name="${GH_PERSONAL}" -c user.email="${GH_PERSONAL}@users.noreply.github.com" commit -m "chore: seed data.json from full git history"`);
const pushResult = run(`git -C "${STAGING_DIR}" push "${LOGS_REPO}" main 2>&1`);

if (pushResult.includes('error') || pushResult.includes('fatal')) {
  console.error(`Push failed: ${pushResult}`);
  process.exit(1);
}

console.log(`\nDone. data.json pushed to github.com/${GH_PERSONAL}/work-logs\n`);
