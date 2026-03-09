#!/usr/bin/env node

/**
 * worklog backfill
 *
 * Generates work log entries for every past day with git activity,
 * then pushes them all to programmingMohit/work-logs in a single commit.
 *
 * Usage:
 *   node ~/worklog/backfill.mjs
 *   node ~/worklog/backfill.mjs --from 2025-01-01
 *   node ~/worklog/backfill.mjs --from 2025-01-01 --to 2025-06-30
 *   node ~/worklog/backfill.mjs --dry-run   # preview days, no API calls
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Config ───────────────────────────────────────────────────────────────────

const NIMBLY_DIR   = join(homedir(), 'Desktop/Nimbly');
const STAGING_DIR  = join(homedir(), '.worklog');
const GH_WORK_USER = 'MohitChakrabortyNimbly';
const GH_PERSONAL  = 'programmingMohit';
const LOGS_REPO = `git@github-programmingMohit:${GH_PERSONAL}/work-logs.git`;
const GIT_AUTHORS    = '--author="mohit.chakraborty@hellonimbly.com" --author="MohitChakrabortyNimbly"';
const DELAY_MS     = 800; // between Claude calls to avoid rate limiting

const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const fromIdx   = args.indexOf('--from');
const toIdx     = args.indexOf('--to');
const FROM_DATE = fromIdx !== -1 ? args[fromIdx + 1] : null;
const TO_DATE   = toIdx   !== -1 ? args[toIdx + 1]   : null;

// 90 days ago — GitHub Events API limit
const eventsHorizon = new Date();
eventsHorizon.setDate(eventsHorizon.getDate() - 90);
const EVENTS_HORIZON = eventsHorizon.toISOString().split('T')[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();
  } catch {
    return '';
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function progress(current, total, date) {
  const pct = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  process.stdout.write(`\r  [${bar}] ${pct}%  ${current}/${total}  ${date}   `);
}

// ─── Data Collection ──────────────────────────────────────────────────────────

function getAllCommitsByDate() {
  const repos = run(
    `find "${NIMBLY_DIR}" -maxdepth 2 -name ".git" -type d -not -path "*/node_modules/*" 2>/dev/null`
  ).split('\n').filter(Boolean).map(p => p.replace('/.git', ''));

  // Map of date -> [commit, ...]
  const byDate = new Map();

  for (const repo of repos) {
    const name = repo.split('/').pop();
    const gitLog = run(
      `git -C "${repo}" log ${GIT_AUTHORS} --format="%H%x1f%s%x1f%ai%x1e" 2>/dev/null`
    );
    if (!gitLog) continue;

    // Extract GitHub repo URL for building PR links (e.g. https://github.com/Nimbly-Technologies/audit-admin)
    const remoteUrl = run(`git -C "${repo}" remote get-url origin 2>/dev/null`)
      .replace(/\.git$/, '')
      .replace(/^git@github\.com:/, 'https://github.com/');

    for (const record of gitLog.split('\x1e').filter(r => r.trim())) {
      const [hash, subject, datetime] = record.trim().split('\x1f');
      if (!hash || !subject || !datetime) continue;

      const date = datetime.slice(0, 10); // YYYY-MM-DD

      if (FROM_DATE && date < FROM_DATE) continue;
      if (TO_DATE   && date > TO_DATE)   continue;

      // Extract PR number from commit message e.g. "(#2871)" or "#2871"
      const prMatch = subject.match(/#(\d+)/);
      const prNumber = prMatch ? parseInt(prMatch[1]) : null;
      const prUrl = prNumber && remoteUrl ? `${remoteUrl}/pull/${prNumber}` : null;

      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push({
        repo: name,
        repoUrl: remoteUrl || null,
        hash: hash.slice(0, 8),
        subject: subject.trim(),
        date: datetime.trim(),
        pr: prNumber ? { number: prNumber, url: prUrl } : null,
      });
    }
  }

  return byDate;
}

function getGitHubEventsByDate() {
  // Fetch all available events (max ~300 via pagination)
  const raw = run(`gh api "/users/${GH_WORK_USER}/events?per_page=100" 2>/dev/null`);
  if (!raw) return new Map();

  let events;
  try { events = JSON.parse(raw); } catch { return new Map(); }

  const byDate = new Map();

  for (const e of events) {
    const date = e.created_at.slice(0, 10);
    if (FROM_DATE && date < FROM_DATE) continue;
    if (TO_DATE   && date > TO_DATE)   continue;

    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({
      type: e.type,
      repo: e.repo.name,
      created_at: e.created_at,
      detail: summarizeEvent(e),
    });
  }

  return byDate;
}

function summarizeEvent({ type, payload }) {
  switch (type) {
    case 'PushEvent':
      return { commits: payload.commits?.map(c => ({ sha: c.sha.slice(0, 8), message: c.message })) };
    case 'PullRequestEvent':
      return { action: payload.action, number: payload.pull_request?.number, title: payload.pull_request?.title, url: payload.pull_request?.html_url };
    case 'PullRequestReviewEvent':
      return { action: payload.action, number: payload.pull_request?.number, title: payload.pull_request?.title, url: payload.pull_request?.html_url };
    case 'IssueCommentEvent':
      return { action: payload.action, issue: payload.issue?.title, number: payload.issue?.number };
    case 'CreateEvent':
    case 'DeleteEvent':
      return { ref_type: payload.ref_type, ref: payload.ref };
    default:
      return {};
  }
}

// ─── AI ───────────────────────────────────────────────────────────────────────

function sendFailureEmail(entryDate, codexError, claudeError) {
  const subject = `Worklog Backfill — Could not generate log for ${entryDate}`;
  const body = [
    `Hi Mohit,`,
    ``,
    `The backfill could not generate a work log for ${entryDate}.`,
    `Both AI providers failed:`,
    ``,
    `  • codex:  ${codexError}`,
    `  • claude: ${claudeError}`,
    ``,
    `What to do:`,
    `  Re-run the backfill once the limits reset:`,
    `  node ~/worklog/backfill.mjs --from ${entryDate} --to ${entryDate}`,
    ``,
    `— worklog backfill`,
  ].join('\n');

  const script = `tell application "Mail"
    set m to make new outgoing message with properties {subject:"${subject.replace(/"/g, '\\"')}", content:"${body.replace(/"/g, '\\"')}", visible:false}
    tell m
      make new to recipient with properties {address:"programming.mohit@gmail.com"}
    end tell
    send m
  end tell`;
  spawnSync('osascript', ['-e', script], { encoding: 'utf8' });
}

function callAI(prompt, entryDate = 'unknown') {
  // Try codex first
  const codexResult = spawnSync('codex', ['exec', prompt], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120000,
  });
  if (!codexResult.error && codexResult.status === 0) {
    const raw = codexResult.stdout;
    const start = raw.indexOf('\ncodex\n');
    const end   = raw.lastIndexOf('\ntokens used');
    if (start !== -1 && end !== -1) return raw.slice(start + 7, end).trim();
    return raw.trim();
  }

  // Fallback to claude
  const claudeResult = spawnSync('claude', ['-p', prompt], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120000,
  });
  if (!claudeResult.error && claudeResult.status === 0) {
    return claudeResult.stdout.trim();
  }

  // Both failed — email and throw
  const reason = [
    `codex: ${codexResult.stderr?.trim() || codexResult.error?.message || 'unknown error'}`,
    `claude: ${claudeResult.stderr?.trim() || claudeResult.error?.message || 'unknown error'}`,
  ].join('\n');
  sendFailureEmail(
    entryDate,
    codexResult.stderr?.trim() || codexResult.error?.message || 'unknown error',
    claudeResult.stderr?.trim() || claudeResult.error?.message || 'unknown error',
  );
  throw new Error(`AI generation failed. Email sent.\n${reason}`);
}

function generateEntry(date, commits, events) {
  const context = JSON.stringify({ date, commits, githubEvents: events }, null, 2);

  const prompt = `Generate a professional daily work log for ${date} based on the git and GitHub activity below.

Format exactly as:

## Work Log — ${date}

### Summary
[2-3 sentences summarising the day]

### Tasks & Changes

#### [Task/feature name]
- **Repo:** \`repo-name\`
- **What was done:** [outcome-focused description]
- **Commits:**
  - \`abc1234\` — [commit message verbatim]
  - \`def5678\` — [commit message verbatim]
- **PR:** [#number — PR title](url)  ← only if PR data exists
- **Tickets:** [FZ-123](url) · [Notion](url)  ← only if found in commit messages

[Repeat the above block for each logical task]

### Notes
[in-progress items, blockers, next steps — omit entire section if nothing notable]

Rules:
- ALWAYS include every commit hash and commit message verbatim
- ALWAYS include PR number, title, and URL when present
- Group commits that belong to the same feature/fix into one task block
- Extract Fizzy card refs (app.fizzy.do URLs or FZ-123 patterns) from commit messages
- Extract Notion links (notion.so/...) from commit messages
- Omit Tickets line entirely if no ticket refs found
- Omit PR line entirely if no PR data

Activity:
\`\`\`json
${context}
\`\`\``;

  return callAI(prompt, date);
}

// ─── Repo Management ──────────────────────────────────────────────────────────

function ensureRepo() {
  if (!existsSync(STAGING_DIR)) {
    console.log('Cloning work-logs repo...');
    run(`git clone "${LOGS_REPO}" "${STAGING_DIR}"`);
  } else {
    run(`git -C "${STAGING_DIR}" pull --rebase origin main 2>/dev/null`);
  }
}

function logExists(date) {
  const [y, m] = date.split('-');
  const remotePath = `${y}/${m}/${date}.md`;
  const localPath  = join(STAGING_DIR, y, m, `${date}.md`);

  // Fetch latest remote state
  let fetchOk = false;
  try {
    execSync(`git -C "${STAGING_DIR}" fetch origin main`, { stdio: 'pipe' });
    fetchOk = true;
  } catch { /* fall through to local */ }

  if (fetchOk) {
    try {
      execSync(`git -C "${STAGING_DIR}" show origin/main:${remotePath}`, { stdio: 'pipe' });
      // Remote has the file — sync local so it's up to date
      run(`git -C "${STAGING_DIR}" pull --rebase origin main 2>/dev/null`);
      return true;
    } catch {
      return false; // file doesn't exist on remote
    }
  }

  // Remote not accessible — fall back to local
  return existsSync(localPath);
}

function writeEntry(date, content) {
  const [y, m] = date.split('-');
  const dir = join(STAGING_DIR, y, m);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${date}.md`), content);
}

function pushAll(from, to) {
  run(`git -C "${STAGING_DIR}" add .`);
  const msg = from === to ? `backfill: ${from}` : `backfill: ${from} to ${to}`;
  run(`git -C "${STAGING_DIR}" -c user.name="${GH_PERSONAL}" -c user.email="${GH_PERSONAL}@users.noreply.github.com" commit -m "${msg}"`);
  run(`git -C "${STAGING_DIR}" push "${LOGS_REPO}" main`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!DRY_RUN && !process.env.NIMBLY_PERSONAL_GITHUB_TOKEN) {
    console.error('Error: NIMBLY_PERSONAL_GITHUB_TOKEN not set.');
    process.exit(1);
  }

  console.log('\nScanning repos for commit history...');
  const commitsByDate = getAllCommitsByDate();

  console.log('Fetching GitHub events (last 90 days)...');
  const eventsByDate  = getGitHubEventsByDate();

  // Only include dates that have at least one commit (skip event-only days)
  const allDates = [...commitsByDate.keys()].sort();

  if (allDates.length === 0) {
    console.log('No activity found for the given date range.');
    process.exit(0);
  }

  // Sync local staging area
  if (!DRY_RUN) ensureRepo();

  // Determine which dates need processing
  const todo   = allDates.filter(d => DRY_RUN || !logExists(d));
  const skip   = allDates.filter(d => !DRY_RUN && logExists(d));

  console.log(`\nDate range : ${allDates[0]}  →  ${allDates[allDates.length - 1]}`);
  console.log(`Total days : ${allDates.length}`);
  console.log(`Already done : ${skip.length}`);
  console.log(`To generate  : ${todo.length}`);

  if (DRY_RUN) {
    console.log('\n-- DRY RUN -- dates that would be generated:');
    todo.forEach(d => {
      const c = commitsByDate.get(d)?.length ?? 0;
      const e = eventsByDate.get(d)?.length ?? 0;
      console.log(`  ${d}  commits=${c}  events=${e}`);
    });
    return;
  }

  if (todo.length === 0) {
    console.log('\nAll days already have log entries. Nothing to do.');
    process.exit(0);
  }

  console.log('\nGenerating entries...\n');

  let generated = 0;
  for (let i = 0; i < todo.length; i++) {
    const date    = todo[i];
    const commits = commitsByDate.get(date) ?? [];
    const events  = eventsByDate.get(date)  ?? [];

    progress(i + 1, todo.length, date);

    try {
      const entry = generateEntry(date, commits, events);
      writeEntry(date, entry);
      generated++;
    } catch (err) {
      process.stdout.write('\n');
      console.error(`  Error on ${date}: ${err.message}`);
      // continue with next day
    }

    if (i < todo.length - 1) await sleep(DELAY_MS);
  }

  process.stdout.write('\n\n');
  console.log(`Generated ${generated}/${todo.length} entries.`);

  if (generated === 0) {
    console.log('Nothing to push.');
    process.exit(0);
  }

  console.log('Pushing to work-logs...');
  pushAll(todo[0], todo[todo.length - 1]);
  console.log(`\nDone. View at: https://github.com/${GH_PERSONAL}/work-logs\n`);
}

main().catch(err => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
