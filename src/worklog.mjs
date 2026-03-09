#!/usr/bin/env node

import { execSync, spawnSync } from 'child_process';

function sendFailureEmail(codexError, claudeError) {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const subject = `Worklog — Could not generate log for ${date}`;
  const body = [
    `Hi Mohit,`,
    ``,
    `Your daily work log for ${date} could not be generated automatically.`,
    `Both AI providers failed:`,
    ``,
    `  • codex:  ${codexError}`,
    `  • claude: ${claudeError}`,
    ``,
    `What to do:`,
    `  Run 'worklog' manually once the limits reset.`,
    `  Full logs at: ~/.worklog/cron.log`,
    ``,
    `— worklog`,
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

function callAI(prompt) {
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
    codexResult.stderr?.trim() || codexResult.error?.message || 'unknown error',
    claudeResult.stderr?.trim() || claudeResult.error?.message || 'unknown error',
  );
  throw new Error(`AI generation failed. Email sent.\n${reason}`);
}
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as rl from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// ─── Config ───────────────────────────────────────────────────────────────────

const NIMBLY_DIR     = join(homedir(), 'Desktop/Nimbly');
const STAGING_DIR    = join(homedir(), '.worklog');
const GH_WORK_USER   = 'MohitChakrabortyNimbly';
const GH_PERSONAL    = 'programmingMohit';
const LOGS_REPO = `git@github-programmingMohit:${GH_PERSONAL}/work-logs.git`;
const GIT_AUTHORS    = '--author="mohit.chakraborty@hellonimbly.com" --author="MohitChakrabortyNimbly"';
const AUTO_MODE      = process.argv.includes('--auto');

// today in local time as YYYY-MM-DD
const today = new Date().toLocaleDateString('en-CA');
const [year, month] = today.split('-');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, ...opts }).trim();
  } catch {
    return '';
  }
}

function log(msg) {
  process.stdout.write(msg + '\n');
}

// ─── Data Collection ──────────────────────────────────────────────────────────

function getGitRepos() {
  const result = run(
    `find "${NIMBLY_DIR}" -maxdepth 2 -name ".git" -type d -not -path "*/node_modules/*" 2>/dev/null`
  );
  return result.split('\n').filter(Boolean).map(p => p.replace('/.git', ''));
}

function getTodaysActivity() {
  const repos = getGitRepos();
  const commits = [];
  const repoStats = [];

  for (const repo of repos) {
    const name = repo.split('/').pop();
    const gitLog = run(
      `git -C "${repo}" log --since="midnight" ${GIT_AUTHORS} --format="%H%x1f%s%x1f%ai%x1e" 2>/dev/null`
    );
    if (!gitLog) continue;

    const remoteUrl = run(`git -C "${repo}" remote get-url origin 2>/dev/null`)
      .replace(/\.git$/, '')
      .replace(/^git@github\.com:/, 'https://github.com/');

    const branch = run(`git -C "${repo}" branch --show-current 2>/dev/null`);

    // Lines added/deleted across today's commits
    const numstat = run(
      `git -C "${repo}" log --since="midnight" ${GIT_AUTHORS} --numstat --format="" 2>/dev/null`
    );
    let added = 0, deleted = 0;
    for (const line of numstat.split('\n').filter(Boolean)) {
      const [a, d] = line.split('\t');
      if (a !== '-') added   += parseInt(a) || 0;
      if (d !== '-') deleted += parseInt(d) || 0;
    }

    const repoCommits = [];
    for (const record of gitLog.split('\x1e').filter(r => r.trim())) {
      const [hash, subject, date] = record.trim().split('\x1f');
      if (!hash || !subject) continue;
      const prMatch = subject.match(/#(\d+)/);
      const prNumber = prMatch ? parseInt(prMatch[1]) : null;
      const commit = {
        repo: name,
        repoUrl: remoteUrl || null,
        hash: hash.slice(0, 8),
        subject: subject.trim(),
        date: date?.trim(),
        pr: prNumber ? { number: prNumber, url: remoteUrl ? `${remoteUrl}/pull/${prNumber}` : null } : null,
      };
      commits.push(commit);
      repoCommits.push(commit);
    }

    repoStats.push({ repo: name, branch, commits: repoCommits.length, added, deleted });
  }

  // First and last commit times across all repos
  const timestamps = commits
    .map(c => new Date(c.date))
    .filter(d => !isNaN(d))
    .sort((a, b) => a - b);

  const fmt = d => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const firstCommitTime = timestamps.length ? fmt(timestamps[0]) : null;
  const lastCommitTime  = timestamps.length ? fmt(timestamps[timestamps.length - 1]) : null;

  const totalAdded   = repoStats.reduce((s, r) => s + r.added, 0);
  const totalDeleted = repoStats.reduce((s, r) => s + r.deleted, 0);

  return { commits, repoStats, firstCommitTime, lastCommitTime, totalAdded, totalDeleted };
}

function getGitHubEvents() {
  const todayISO = `${today}T00:00:00Z`;
  const raw = run(`gh api "/users/${GH_WORK_USER}/events?per_page=100" 2>/dev/null`);
  if (!raw) return [];

  let events;
  try {
    events = JSON.parse(raw);
  } catch {
    return [];
  }

  return events
    .filter(e => e.created_at >= todayISO)
    .map(e => ({ type: e.type, repo: e.repo.name, created_at: e.created_at, detail: summarizeEvent(e) }));
}

function summarizeEvent({ type, payload }) {
  switch (type) {
    case 'PushEvent':
      return { commits: payload.commits?.map(c => ({ sha: c.sha.slice(0, 8), message: c.message })) };
    case 'PullRequestEvent':
      return { action: payload.action, number: payload.pull_request?.number, title: payload.pull_request?.title, url: payload.pull_request?.html_url };
    case 'PullRequestReviewEvent':
      return { action: payload.action, number: payload.pull_request?.number, title: payload.pull_request?.title };
    case 'IssueCommentEvent':
      return { action: payload.action, issue: payload.issue?.title, number: payload.issue?.number };
    case 'CreateEvent':
    case 'DeleteEvent':
      return { ref_type: payload.ref_type, ref: payload.ref };
    default:
      return {};
  }
}

function getActivityForDate(date) {
  const repos = getGitRepos();
  const commits = [];
  const repoStats = [];

  for (const repo of repos) {
    const name = repo.split('/').pop();
    const gitLog = run(
      `git -C "${repo}" log ${GIT_AUTHORS} --after="${date} 00:00:00" --before="${date} 23:59:59" --format="%H%x1f%s%x1f%ai%x1e" 2>/dev/null`
    );
    if (!gitLog) continue;

    const remoteUrl = run(`git -C "${repo}" remote get-url origin 2>/dev/null`)
      .replace(/\.git$/, '')
      .replace(/^git@github\.com:/, 'https://github.com/');

    const branch = run(`git -C "${repo}" branch --show-current 2>/dev/null`);

    const numstat = run(
      `git -C "${repo}" log ${GIT_AUTHORS} --after="${date} 00:00:00" --before="${date} 23:59:59" --numstat --format="" 2>/dev/null`
    );
    let added = 0, deleted = 0;
    for (const line of numstat.split('\n').filter(Boolean)) {
      const [a, d] = line.split('\t');
      if (a !== '-') added   += parseInt(a) || 0;
      if (d !== '-') deleted += parseInt(d) || 0;
    }

    const repoCommits = [];
    for (const record of gitLog.split('\x1e').filter(r => r.trim())) {
      const [hash, subject, commitDate] = record.trim().split('\x1f');
      if (!hash || !subject) continue;
      const prMatch = subject.match(/#(\d+)/);
      const prNumber = prMatch ? parseInt(prMatch[1]) : null;
      const commit = {
        repo: name, repoUrl: remoteUrl || null,
        hash: hash.slice(0, 8), subject: subject.trim(), date: commitDate?.trim(),
        pr: prNumber ? { number: prNumber, url: remoteUrl ? `${remoteUrl}/pull/${prNumber}` : null } : null,
      };
      commits.push(commit);
      repoCommits.push(commit);
    }

    if (repoCommits.length > 0) {
      repoStats.push({ repo: name, branch, commits: repoCommits.length, added, deleted });
    }
  }

  const timestamps = commits.map(c => new Date(c.date)).filter(d => !isNaN(d)).sort((a, b) => a - b);
  const fmt = d => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    commits, repoStats,
    firstCommitTime: timestamps.length ? fmt(timestamps[0]) : null,
    lastCommitTime:  timestamps.length ? fmt(timestamps[timestamps.length - 1]) : null,
    totalAdded:   repoStats.reduce((s, r) => s + r.added, 0),
    totalDeleted: repoStats.reduce((s, r) => s + r.deleted, 0),
  };
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

const WORK_CALENDARS = ['Work', 'mohit.chakraborty@hellonimbly.com', 'Deployment Calendar', 'Go-Live & Training Schedule'];

function getCalendarEvents(date) {
  const [y, m, d] = date.split('-').map(Number);

  const script = `
tell application "Calendar"
  set targetDate to current date
  set year of targetDate to ${y}
  set month of targetDate to ${m}
  set day of targetDate to ${d}
  set time of targetDate to 0
  set nextDate to targetDate + 86400
  set workCals to {${WORK_CALENDARS.map(c => `"${c}"`).join(', ')}}
  set output to ""
  repeat with calName in workCals
    try
      set cal to calendar calName
      set calEvents to (every event of cal whose start date >= targetDate and start date < nextDate)
      repeat with ev in calEvents
        set output to output & (summary of ev) & "|" & ((start date of ev) as string) & "|" & ((end date of ev) as string) & "
"
      end repeat
    end try
  end repeat
  return output
end tell`;

  const result = spawnSync('osascript', ['-e', script], { encoding: 'utf8' });
  if (result.error || result.status !== 0 || !result.stdout.trim()) return [];

  return result.stdout.trim().split('\n').filter(Boolean).map(line => {
    const [title, startStr, endStr] = line.split('|');
    if (!title) return null;

    const startDate = new Date(startStr);
    const endDate   = new Date(endStr);
    const fmt = dt => isNaN(dt) ? startStr : dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const duration = (!isNaN(startDate) && !isNaN(endDate))
      ? Math.round((endDate - startDate) / 60000) + ' min'
      : null;

    return { title: title.trim(), start: fmt(startDate), end: fmt(endDate), duration };
  }).filter(Boolean);
}

// ─── Claude Summarization ─────────────────────────────────────────────────────

function generateWorkLog(activity, events, calendarEvents = []) {
  const { commits, repoStats, firstCommitTime, lastCommitTime, totalAdded, totalDeleted } = activity;
  const context = JSON.stringify({ date: today, commits, repoStats, githubEvents: events, calendarEvents }, null, 2);

  const statsLine = [
    firstCommitTime && lastCommitTime ? `${firstCommitTime} – ${lastCommitTime}` : null,
    `+${totalAdded} / -${totalDeleted} lines`,
    repoStats.map(r => `\`${r.repo}\` (${r.branch})`).join(', '),
  ].filter(Boolean).join(' · ');

  const prompt = `Generate a professional daily work log for ${today} based on the git and GitHub activity below.

Format exactly as:

## Work Log — ${today}

> ${statsLine}

### Summary
[2-3 sentences summarising the day]

### Tasks & Changes

#### [Task/feature name]
- **Repo:** \`repo-name\` · branch: \`branch-name\`
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
- Use the branch name from repoStats for each repo
- ALWAYS include every commit hash and commit message verbatim
- ALWAYS include PR number, title, and URL when present (from commit pr field or githubEvents)
- Group commits that belong to the same feature/fix into one task block
- Extract Fizzy card refs (app.fizzy.do URLs or FZ-123 patterns) from commit messages
- Extract Notion links (notion.so/...) from commit messages
- Omit Tickets line entirely if no ticket refs found
- Omit PR line entirely if no PR data
- If calendarEvents is non-empty, add a ### Meetings section after Tasks & Changes listing each meeting with its time and duration

Activity data:
\`\`\`json
${context}
\`\`\``;

  return callAI(prompt);
}

function generateRollup(type, dailyLogs) {
  if (dailyLogs.length === 0) return null;

  const now = new Date();
  const label = type === 'week'
    ? `Week ending ${today}`
    : now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const combined = dailyLogs.map(({ date, content }) => `### ${date}\n${content}`).join('\n\n---\n\n');

  const prompt = `Generate a ${type === 'week' ? 'weekly' : 'monthly'} work summary for ${label}.

Format exactly as:

## ${type === 'week' ? 'Weekly' : 'Monthly'} Summary — ${label}

### Highlights
- [3-5 bullet points of most impactful work]

### By Repository
- **\`repo-name\`:** [key contributions, N commits, +X/-Y lines]

### Stats
- Days worked: X
- Total commits: X
- Total lines: +X / -Y
- PRs: [list #number links]

### In Progress
[anything started but not finished — omit if nothing]

Daily logs to summarise:
${combined}`;

  return callAI(prompt);
}

// ─── Dashboard Sync ───────────────────────────────────────────────────────────

function syncDashboard() {
  const src = join(homedir(), 'worklog', 'index.html');
  const dst = join(STAGING_DIR, 'index.html');
  if (!existsSync(src)) return;

  const srcContent = readFileSync(src, 'utf8');
  const dstContent = existsSync(dst) ? readFileSync(dst, 'utf8') : null;

  if (srcContent !== dstContent) {
    writeFileSync(dst, srcContent);
    log('Dashboard synced.');
  }
}

// ─── Remote Push ──────────────────────────────────────────────────────────────

function ensureRepo() {
  if (!existsSync(STAGING_DIR)) {
    log('Cloning work-logs repo...');
    run(`git clone "${LOGS_REPO}" "${STAGING_DIR}"`);
  } else {
    run(`git -C "${STAGING_DIR}" pull --rebase origin main 2>/dev/null`);
  }
}

function updateDataJson(activity) {
  const dataFile = join(STAGING_DIR, 'data.json');

  let data = { updated: null, days: [] };
  if (existsSync(dataFile)) {
    try { data = JSON.parse(readFileSync(dataFile, 'utf8')); } catch { /* start fresh */ }
  }

  // Replace today's entry if it exists, otherwise append
  const entry = {
    date:        today,
    commits:     activity.commits.length,
    added:       activity.totalAdded,
    deleted:     activity.totalDeleted,
    firstCommit: activity.firstCommitTime,
    lastCommit:  activity.lastCommitTime,
    repos:       activity.repoStats.map(r => ({
      name:    r.repo,
      branch:  r.branch,
      commits: r.commits,
      added:   r.added,
      deleted: r.deleted,
    })),
  };

  data.days = data.days.filter(d => d.date !== today);
  data.days.push(entry);
  data.days.sort((a, b) => a.date.localeCompare(b.date));
  data.updated = new Date().toISOString();

  writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function pushLog(content, activity) {
  ensureRepo();

  const dir = join(STAGING_DIR, year, month);
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, `${today}.md`);
  let final = content;

  if (existsSync(filePath)) {
    final = readFileSync(filePath, 'utf8') + '\n\n---\n\n' + content;
    log('Appended to existing entry.');
  }

  writeFileSync(filePath, final);
  updateDataJson(activity);
  syncDashboard();

  run(`git -C "${STAGING_DIR}" add .`);
  run(`git -C "${STAGING_DIR}" -c user.name="${GH_PERSONAL}" -c user.email="${GH_PERSONAL}@users.noreply.github.com" commit -m "worklog: ${today}"`);

  const pushResult = run(`git -C "${STAGING_DIR}" push "${LOGS_REPO}" main 2>&1`);
  if (pushResult.includes('error') || pushResult.includes('fatal')) {
    throw new Error(`Push failed: ${pushResult}`);
  }

  log(`Pushed → https://github.com/${GH_PERSONAL}/work-logs/blob/main/${year}/${month}/${today}.md`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function maybeGenerateRollup(type) {
  run(`git -C "${STAGING_DIR}" pull --rebase origin main 2>/dev/null`);
  const now = new Date();
  const isFriday         = now.getDay() === 5;
  const tomorrow         = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const isLastDayOfMonth = tomorrow.getMonth() !== now.getMonth();

  if (type === 'week'  && !isFriday)        return;
  if (type === 'month' && !isLastDayOfMonth) return;

  const startDate = type === 'week'
    ? (() => { const d = new Date(now); d.setDate(d.getDate() - 4); return d.toLocaleDateString('en-CA'); })()
    : `${year}-${month}-01`;

  const files = run(`find "${STAGING_DIR}" -name "*.md" -not -name "summary.md" -not -name "week-*.md" -not -name "README.md" 2>/dev/null`);
  const dailyLogs = files.split('\n').filter(Boolean)
    .map(f => ({ file: f, date: f.match(/(\d{4}-\d{2}-\d{2})\.md$/)?.[1] }))
    .filter(({ date }) => date && date >= startDate && date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ file, date }) => ({ date, content: readFileSync(file, 'utf8') }));

  if (dailyLogs.length === 0) return;

  process.stdout.write(`Generating ${type} rollup...`);
  const rollup = generateRollup(type, dailyLogs);
  if (!rollup) return;
  log(' done.');

  const fileName = type === 'week' ? `week-${today}.md` : 'summary.md';
  writeFileSync(join(STAGING_DIR, year, month, fileName), rollup);
}

async function main() {
  log(`\nGathering today's activity (${today})...`);

  const activity       = getTodaysActivity();
  const events         = getGitHubEvents();
  const calendarEvents = getCalendarEvents(today);

  log(`  Git commits:    ${activity.commits.length}`);
  log(`  GitHub events:  ${events.length}`);
  log(`  Calendar events:${calendarEvents.length}`);
  if (activity.firstCommitTime) log(`  Active:         ${activity.firstCommitTime} – ${activity.lastCommitTime}`);
  if (activity.totalAdded || activity.totalDeleted) log(`  Lines:          +${activity.totalAdded} / -${activity.totalDeleted}\n`);
  else log('');

  if (activity.commits.length === 0 && events.length === 0 && calendarEvents.length === 0) {
    log('No activity found for today. Nothing to log.');
    process.exit(0);
  }

  process.stdout.write('Generating log with Claude...');
  let entry;
  try {
    entry = generateWorkLog(activity, events, calendarEvents);
    log(' done.\n');
  } catch (err) {
    log(`\nError: ${err.message}`);
    process.exit(1);
  }

  const divider = '─'.repeat(64);

  if (AUTO_MODE) {
    log(divider);
    log(entry);
    log(divider);
    await maybeGenerateRollup('week');
    await maybeGenerateRollup('month');
    pushLog(entry, activity);
    return;
  }

  // interactive: show preview, prompt
  log(divider);
  log(entry);
  log(divider + '\n');

  const readline = rl.createInterface({ input, output });
  const answer = (await readline.question('Save & push? [Y/n/e(dit)]: ')).trim().toLowerCase();
  readline.close();

  if (answer === 'n') {
    log('Discarded.');
    return;
  }

  if (answer === 'e') {
    const tmpFile = `/tmp/worklog-${today}.md`;
    writeFileSync(tmpFile, entry);
    spawnSync(process.env.EDITOR || 'nano', [tmpFile], { stdio: 'inherit' });
    entry = readFileSync(tmpFile, 'utf8');
  }

  await maybeGenerateRollup('week');
  await maybeGenerateRollup('month');
  pushLog(entry, activity);
}

// ─── worklog view [date] ──────────────────────────────────────────────────────

async function cmdView() {
  const dateArg = process.argv[process.argv.indexOf('view') + 1];
  const date    = dateArg || today;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    process.stderr.write(`Invalid date: ${date}. Use YYYY-MM-DD.\n`);
    process.exit(1);
  }

  const [y, m] = date.split('-');
  const filePath = join(STAGING_DIR, y, m, `${date}.md`);

  // If not found locally, pull and retry
  if (!existsSync(filePath)) {
    run(`git -C "${STAGING_DIR}" pull --rebase origin main 2>/dev/null`);
  }

  if (!existsSync(filePath)) {
    process.stderr.write(`No log found for ${date}.\n`);
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf8');

  // Use glow if available, otherwise print raw markdown
  const glowPath = run('which glow 2>/dev/null');
  if (glowPath) {
    spawnSync(glowPath, [filePath], { stdio: 'inherit' });
  } else {
    process.stdout.write(content + '\n');
  }
}

// ─── worklog status ───────────────────────────────────────────────────────────

async function cmdStatus() {
  log('\nWorklog System Status\n' + '─'.repeat(40));

  // Last pushed log
  const allLogs = run(`find "${STAGING_DIR}" -name "*.md" -not -name "summary.md" -not -name "week-*.md" -not -name "README.md" 2>/dev/null`);
  const logDates = allLogs.split('\n').filter(Boolean)
    .map(f => f.match(/(\d{4}-\d{2}-\d{2})\.md$/)?.[1])
    .filter(Boolean)
    .sort();

  const lastLog   = logDates[logDates.length - 1] ?? 'none';
  const daysSince = lastLog !== 'none'
    ? Math.floor((new Date(today) - new Date(lastLog)) / 86400000)
    : '—';

  log(`Last log pushed : ${lastLog} (${daysSince} day${daysSince === 1 ? '' : 's'} ago)`);
  log(`Total logs      : ${logDates.length}`);

  // Days with commits but no log — scan each repo individually
  const repos = run(
    `find "${NIMBLY_DIR}" -maxdepth 2 -name ".git" -type d -not -path "*/node_modules/*" 2>/dev/null`
  ).split('\n').filter(Boolean).map(p => p.replace('/.git', ''));

  const commitDateSet = new Set();
  for (const repo of repos) {
    const out = run(`git -C "${repo}" log ${GIT_AUTHORS} --format="%ai" 2>/dev/null`);
    out.split('\n').filter(Boolean).forEach(d => commitDateSet.add(d.slice(0, 10)));
  }
  const commitDates = [...commitDateSet].filter(d => d <= today).sort();
  const missing = commitDates.filter(d => !logDates.includes(d));
  if (missing.length > 0) {
    log(`\nDays with commits but no log (${missing.length}):`);
    missing.slice(-10).forEach(d => log(`  ${d}`));
    if (missing.length > 10) log(`  ... and ${missing.length - 10} more`);
  } else {
    log(`Missing logs    : none`);
  }

  // Launch Agents
  log('\nLaunch Agents:');
  const agents = ['com.mohit.worklog.interactive', 'com.mohit.worklog.midnight'];
  for (const label of agents) {
    const loaded = run(`launchctl list "${label}" 2>/dev/null`);
    const status = loaded ? '✓ loaded' : '✗ not loaded';
    log(`  ${label} — ${status}`);
  }

  // Node path
  const nodePath = run('~/.nvm/nvm-exec which node 2>/dev/null || which node');
  log(`\nNode            : ${nodePath}`);
  log(`Staging dir     : ${STAGING_DIR}`);
  log(`Last data.json  : ${run(`node -e "const f=require('fs');const d=JSON.parse(f.readFileSync('${STAGING_DIR}/data.json','utf8'));console.log(d.updated)" 2>/dev/null`) || 'unknown'}`);
  log('');
}

// ─── worklog regen [date] ─────────────────────────────────────────────────────

async function cmdRegen() {
  const regenIdx = process.argv.indexOf('regen');
  const dateArg  = process.argv[regenIdx + 1];
  const date     = dateArg || today;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    process.stderr.write(`Invalid date: ${date}. Use YYYY-MM-DD.\n`);
    process.exit(1);
  }

  const [y, m] = date.split('-');
  const filePath = join(STAGING_DIR, y, m, `${date}.md`);

  ensureRepo();

  if (existsSync(filePath)) {
    log(`Deleting existing log for ${date}...`);
    run(`git -C "${STAGING_DIR}" rm -f "${filePath}" 2>/dev/null`);
  }

  log(`Scanning commits for ${date}...`);
  const activity       = getActivityForDate(date);
  const calendarEvents = getCalendarEvents(date);

  if (activity.commits.length === 0) {
    log('No commits found for this date. Nothing to regenerate.');
    process.exit(0);
  }

  log(`  ${activity.commits.length} commits across ${activity.repoStats.length} repo(s)`);
  if (calendarEvents.length) log(`  ${calendarEvents.length} calendar event(s)`);

  // Reuse generateWorkLog but override today with the target date
  const context = JSON.stringify({ date, commits: activity.commits, repoStats: activity.repoStats, githubEvents: [], calendarEvents }, null, 2);
  const { totalAdded, totalDeleted, firstCommitTime, lastCommitTime, repoStats } = activity;
  const statsLine = [
    firstCommitTime && lastCommitTime ? `${firstCommitTime} – ${lastCommitTime}` : null,
    `+${totalAdded} / -${totalDeleted} lines`,
    repoStats.map(r => `\`${r.repo}\` (${r.branch})`).join(', '),
  ].filter(Boolean).join(' · ');

  const prompt = `Generate a professional daily work log for ${date} based on the git activity below.

Format exactly as:

## Work Log — ${date}

> ${statsLine}

### Summary
[2-3 sentences summarising the day]

### Tasks & Changes

#### [Task/feature name]
- **Repo:** \`repo-name\` · branch: \`branch-name\`
- **What was done:** [outcome-focused description]
- **Commits:**
  - \`abc1234\` — [commit message verbatim]
- **PR:** [#number — PR title](url)  ← only if PR data exists
- **Tickets:** [FZ-123](url)  ← only if found in commit messages

### Notes
[in-progress items, blockers — omit if nothing notable]

Rules:
- ALWAYS include every commit hash and message verbatim
- Group commits by logical task
- Omit PR/Tickets lines if no data

Activity:
\`\`\`json
${context}
\`\`\``;

  process.stdout.write('Regenerating with AI...');
  const entry = callAI(prompt);
  log(' done.\n');

  const divider = '─'.repeat(64);
  log(divider);
  log(entry);
  log(divider + '\n');

  const readline = rl.createInterface({ input, output });
  const answer = (await readline.question('Save & push? [Y/n]: ')).trim().toLowerCase();
  readline.close();

  if (answer === 'n') {
    // Restore the deleted file from git if we removed it
    run(`git -C "${STAGING_DIR}" checkout HEAD -- "${filePath}" 2>/dev/null`);
    log('Discarded. Original restored.');
    return;
  }

  mkdirSync(join(STAGING_DIR, y, m), { recursive: true });
  writeFileSync(filePath, entry);
  syncDashboard();
  run(`git -C "${STAGING_DIR}" add .`);
  run(`git -C "${STAGING_DIR}" -c user.name="${GH_PERSONAL}" -c user.email="${GH_PERSONAL}@users.noreply.github.com" commit -m "regen: ${date}"`);
  const pushResult = run(`git -C "${STAGING_DIR}" push "${LOGS_REPO}" main 2>&1`);
  if (pushResult.includes('error') || pushResult.includes('fatal')) {
    throw new Error(`Push failed: ${pushResult}`);
  }
  log(`Pushed → https://github.com/${GH_PERSONAL}/work-logs/blob/main/${y}/${m}/${date}.md`);
}

// ─── worklog note "..." ───────────────────────────────────────────────────────

async function cmdNote() {
  const noteIdx = process.argv.indexOf('note');
  const note    = process.argv.slice(noteIdx + 1).join(' ').trim();

  if (!note) {
    process.stderr.write('Usage: worklog note "your note here"\n');
    process.exit(1);
  }

  const [y, m] = today.split('-');
  const dir      = join(STAGING_DIR, y, m);
  const filePath = join(dir, `${today}.md`);

  // Sync with remote first
  ensureRepo();
  mkdirSync(dir, { recursive: true });

  const bullet = `- ${note}`;
  const timestamp = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (existsSync(filePath)) {
    let content = readFileSync(filePath, 'utf8');

    if (content.includes('### Notes')) {
      // Append bullet under existing Notes section
      content = content.replace(/### Notes\n/, `### Notes\n${bullet}\n`);
    } else {
      // Add Notes section at the end
      content = content.trimEnd() + `\n\n### Notes\n${bullet}\n`;
    }

    writeFileSync(filePath, content);
  } else {
    // No log yet today — create a minimal one with just the note
    writeFileSync(filePath, `## Work Log — ${today}\n\n### Notes\n${bullet}\n`);
  }

  syncDashboard();
  run(`git -C "${STAGING_DIR}" add .`);
  run(`git -C "${STAGING_DIR}" -c user.name="${GH_PERSONAL}" -c user.email="${GH_PERSONAL}@users.noreply.github.com" commit -m "note: ${today} — ${note.slice(0, 60)}"`);
  const pushResult = run(`git -C "${STAGING_DIR}" push "${LOGS_REPO}" main 2>&1`);
  if (pushResult.includes('error') || pushResult.includes('fatal')) {
    throw new Error(`Push failed: ${pushResult}`);
  }

  log(`[${timestamp}] Note added & pushed.`);
}

// ─── worklog edit [date] ──────────────────────────────────────────────────────

async function cmdEdit() {
  const dateArg = process.argv[process.argv.indexOf('edit') + 1];
  const date    = dateArg || today;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    process.stderr.write(`Invalid date: ${date}. Use YYYY-MM-DD.\n`);
    process.exit(1);
  }

  const [y, m] = date.split('-');
  const filePath = join(STAGING_DIR, y, m, `${date}.md`);

  // Sync with remote first
  ensureRepo();

  if (!existsSync(filePath)) {
    process.stderr.write(`No log found for ${date}.\n`);
    process.exit(1);
  }

  // Open in editor
  const editor = process.env.EDITOR || 'nano';
  log(`Opening ${date} in ${editor}...`);
  spawnSync(editor, [filePath], { stdio: 'inherit' });

  // Confirm push
  const readline = rl.createInterface({ input, output });
  const answer = (await readline.question('Push changes? [Y/n]: ')).trim().toLowerCase();
  readline.close();

  if (answer === 'n') {
    run(`git -C "${STAGING_DIR}" checkout -- "${filePath}"`);
    log('Changes discarded.');
    return;
  }

  syncDashboard();
  run(`git -C "${STAGING_DIR}" add .`);
  run(`git -C "${STAGING_DIR}" -c user.name="${GH_PERSONAL}" -c user.email="${GH_PERSONAL}@users.noreply.github.com" commit -m "edit: ${date}"`);
  const pushResult = run(`git -C "${STAGING_DIR}" push "${LOGS_REPO}" main 2>&1`);
  if (pushResult.includes('error') || pushResult.includes('fatal')) {
    throw new Error(`Push failed: ${pushResult}`);
  }
  log(`Pushed → https://github.com/${GH_PERSONAL}/work-logs/blob/main/${y}/${m}/${date}.md`);
}

// ─── worklog push [date] ──────────────────────────────────────────────────────

async function cmdPush() {
  const pushIdx = process.argv.indexOf('push');
  const dateArg = process.argv[pushIdx + 1];
  const date    = (dateArg && /^\d{4}-\d{2}-\d{2}$/.test(dateArg)) ? dateArg : today;

  const [y, m] = date.split('-');
  const filePath = join(STAGING_DIR, y, m, `${date}.md`);

  ensureRepo();

  if (!existsSync(filePath)) {
    process.stderr.write(`No log found for ${date}.\n`);
    process.exit(1);
  }

  // Build a minimal activity object from data.json if available (for data.json update)
  const dataFile = join(STAGING_DIR, 'data.json');
  let activity = { commits: [], totalAdded: 0, totalDeleted: 0, firstCommitTime: null, lastCommitTime: null, repoStats: [] };
  if (existsSync(dataFile)) {
    try {
      const data = JSON.parse(readFileSync(dataFile, 'utf8'));
      const existing = data.days.find(d => d.date === date);
      if (existing) {
        activity = {
          commits:         Array(existing.commits).fill({}),
          totalAdded:      existing.added,
          totalDeleted:    existing.deleted,
          firstCommitTime: existing.firstCommit,
          lastCommitTime:  existing.lastCommit,
          repoStats:       existing.repos || [],
        };
      }
    } catch { /* use empty activity */ }
  }

  updateDataJson(activity);
  syncDashboard();
  run(`git -C "${STAGING_DIR}" add .`);
  run(`git -C "${STAGING_DIR}" -c user.name="${GH_PERSONAL}" -c user.email="${GH_PERSONAL}@users.noreply.github.com" commit -m "worklog: ${date}"`);
  const pushResult = run(`git -C "${STAGING_DIR}" push "${LOGS_REPO}" main 2>&1`);
  if (pushResult.includes('error') || pushResult.includes('fatal')) {
    throw new Error(`Push failed: ${pushResult}`);
  }
  log(`Pushed → https://github.com/${GH_PERSONAL}/work-logs/blob/main/${y}/${m}/${date}.md`);
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

if (process.argv.includes('regen')) {
  cmdRegen().catch(err => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(1);
  });
} else if (process.argv.includes('note')) {
  cmdNote().catch(err => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(1);
  });
} else if (process.argv.includes('status')) {
  cmdStatus().catch(err => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(1);
  });
} else if (process.argv.includes('view')) {
  cmdView().catch(err => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(1);
  });
} else if (process.argv.includes('edit')) {
  cmdEdit().catch(err => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(1);
  });
} else if (process.argv.includes('push')) {
  cmdPush().catch(err => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(1);
  });
} else {
  main().catch(err => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(1);
  });
}
