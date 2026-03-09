# worklog

Automated daily work log generator. Pulls your git commits and GitHub activity, summarises them with Claude, and pushes a markdown log to [programmingMohit/work-logs](https://github.com/programmingMohit/work-logs).

---

## How It Works

1. Scans all repos in `~/Desktop/Nimbly` for commits made today (by `mohit.chakraborty@hellonimbly.com`)
2. Fetches today's GitHub events from `MohitChakrabortyNimbly` (PRs, pushes, reviews, etc.)
3. Sends the data to Claude (`claude-sonnet-4-6`) which writes a structured log entry
4. You review and approve (interactive mode) or it pushes silently (auto mode)
5. Log is committed and pushed to `programmingMohit/work-logs` under `YYYY/MM/YYYY-MM-DD.md`

---

## Usage

### On-demand (interactive)

```bash
worklog
```

Flow:
```
Gathering today's activity (2026-03-06)...
  Git commits:    7
  GitHub events:  12

Generating log with Claude... done.

────────────────────────────────────────────────────────────────
## Work Log — 2026-03-06

### Summary
...

### Tasks & Changes
...
────────────────────────────────────────────────────────────────

Save & push? [Y/n/e(dit)]:
```

| Input | Action |
|---|---|
| `Y` or Enter | Push log as-is |
| `n` | Discard — nothing is saved or pushed |
| `e` | Open in `$EDITOR`, save and push after you close |

---

### Automatic (end-of-day cron)

Runs every weekday at **6pm** automatically. No interaction required — generates the log and pushes it silently.

Cron logs are written to `~/.worklog/cron.log`. To check:

```bash
tail -50 ~/.worklog/cron.log
```

To change the cron time:

```bash
crontab -e
# Change "0 18" to your preferred time, e.g. "30 17" for 5:30pm
```

---

## Output Format

Each log lives at:
```
github.com/programmingMohit/work-logs/blob/main/YYYY/MM/YYYY-MM-DD.md
```

Example entry:
```markdown
## Work Log — 2026-03-06

### Summary
Focused on the audit-lite mobile app today. Merged a PR fixing the offline
sync bug and started work on the new department filter feature.

### Tasks & Changes
- **Fix offline sync race condition** (`audit-lite`): resolved state update
  ordering bug causing data loss on reconnect — #284
- **Department filter UI** (`audit-admin`): added filter dropdown to the
  audit list view, wired to Redux store — FZ-412

### Notes
Department filter backend endpoint not yet deployed to staging. Will unblock
tomorrow once api-departments is updated.
```

If you run `worklog` more than once in a day, new entries are **appended** to the existing file (separated by `---`), not overwritten.

---

## Environment Variables

Set in `~/.zshrc`:

| Variable | Purpose |
|---|---|
| `PERSONAL_GITHUB_TOKEN` | PAT for `programmingMohit` — pushes to `work-logs` repo |

Claude summarisation uses the `claude` CLI (Claude Code team plan) — no separate API key needed.

---

## File Locations

| Path | Purpose |
|---|---|
| `~/worklog/worklog.mjs` | Main script |
| `~/worklog/package.json` | Node dependencies |
| `~/.worklog/` | Local clone of `programmingMohit/work-logs` (staging area) |
| `~/.worklog/cron.log` | Cron run output |

---

## Troubleshooting

**"No activity found for today"**
You haven't pushed any commits or had GitHub activity since midnight local time. The log won't generate if there's nothing to summarise.

**Claude generation fails**
Make sure `claude` CLI is installed and you're logged in: `claude --version`

**Push fails**
Check `PERSONAL_GITHUB_TOKEN` is set and hasn't expired: `echo ${PERSONAL_GITHUB_TOKEN:+ok}`
Tokens are fine-grained and may need renewal — regenerate at github.com → Settings → Developer Settings → Personal access tokens.

**Cron didn't run**
macOS requires Terminal/iTerm to have Full Disk Access for cron to work.
Check: System Settings → Privacy & Security → Full Disk Access → enable your terminal app.
Then check `~/.worklog/cron.log` for errors.
