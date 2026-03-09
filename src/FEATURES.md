# Work Logging — Features

## Daily Log Generation

- Scans all git repos under `~/Desktop/Nimbly` for today's commits
- Filters by author: `mohit.chakraborty@hellonimbly.com` and `MohitChakrabortyNimbly`
- Fetches GitHub Events API for `MohitChakrabortyNimbly` (PRs, reviews, comments, pushes)
- Collects per-repo stats: branch name, lines added/deleted, commit count
- Records first and last commit timestamps across all repos
- Groups commits by logical task/feature in the generated log
- Extracts PR numbers, titles, and URLs from commit messages and GitHub events
- Extracts Fizzy ticket refs (`FZ-123`, `app.fizzy.do` URLs) from commit messages
- Extracts Notion links (`notion.so/...`) from commit messages
- Fetches calendar events from macOS Calendar app (AppleScript) for the log date — work calendars: `Work`, `mohit.chakraborty@hellonimbly.com`, `Deployment Calendar`, `Go-Live & Training Schedule`
- Generates structured markdown via AI summarization with fallback chain:
  1. `codex exec` (primary)
  2. `claude -p` (fallback if codex is rate-limited or down)
  3. Email notification to `programming.mohit@gmail.com` if both fail

## Log Format

Each daily log (`YYYY/MM/YYYY-MM-DD.md`) contains:
- Stats line: active hours, lines added/deleted, repos + branches
- Summary: 2-3 sentence overview of the day
- Tasks & Changes: one block per logical task with repo, branch, commits (verbatim), PR link, ticket links
- Meetings: list of calendar events with time and duration (omitted if no events)
- Notes: blockers, in-progress items, next steps (omitted if nothing notable)

## Scheduling (macOS Launch Agents)

- **5pm–11pm hourly**: pulls remote to sync local, checks if log exists, opens a Terminal window with the interactive worklog prompt if not
- **00:00 midnight**: pulls remote to sync local, auto-pushes silently (`--auto` mode) if still no log for today
- Guards against duplicate Terminal windows — skips if `worklog.mjs` is already running (`pgrep` check)
- Once a log is pushed for the day, all subsequent triggers exit silently
- Missed triggers fire on next Mac wake (launchd behavior)

## Interactive CLI

| Command | Description |
|---------|-------------|
| `worklog` | Generate, preview, and push today's log |
| `worklog status` | Show system health: last log, missing days, Launch Agent status, node path, data.json age |
| `worklog view [YYYY-MM-DD]` | View a past log (defaults to today). Pulls from remote if not found locally. Renders via `glow` |
| `worklog edit [YYYY-MM-DD]` | Edit a past log (defaults to today). Pulls from remote, opens in `$EDITOR`, prompts to push on save. Discarding reverts the file cleanly |
| `worklog regen [YYYY-MM-DD]` | Delete and regenerate a log entry via AI. Shows preview, prompts to push. Discarding restores the original. Defaults to today |
| `worklog note "text"` | Append a quick note to today's log and push immediately. Adds a `### Notes` section if one doesn't exist. Creates a minimal log if none exists yet |
| `worklog --auto` | Non-interactive mode used by midnight trigger — generates and pushes without prompting |

### Interactive prompt options
- `Y` — saves and pushes
- `n` — discards
- `e` — opens log in `$EDITOR` for manual edits before pushing
- If a log already exists for today, new entry is **appended** with a `---` divider (not overwritten)

## Rollups

- **Weekly summary**: auto-generated on Fridays, saved as `YYYY/MM/week-YYYY-MM-DD.md`
- **Monthly summary**: auto-generated on the last day of the month, saved as `YYYY/MM/summary.md`
- Both include: highlights, per-repo breakdown, stats (days worked, commits, lines, PRs), in-progress items

## Remote Storage

- All logs pushed to `programmingMohit/work-logs` (GitHub) via SSH (`github-programmingMohit` host alias)
- Directory structure: `YYYY/MM/YYYY-MM-DD.md`
- `data.json` updated on every push with structured metadata for dashboard consumption
- `index.html` source of truth lives in `~/worklog/index.html` — synced to `~/.worklog/` on every push (only when content differs); survives repo wipes and reclones
- Existence checks are remote-first: fetches `origin/main` and checks via `git show` before deciding to generate; falls back to local if remote is unreachable

## Dashboard (GitHub Pages)

- Live at: https://programmingmohit.github.io/work-logs/
- Contribution heatmap (GitHub-style)
- Weekly trend chart (SVG) with Commits / Lines toggle — Lines view shows added (solid green) and deleted (dashed red) on the same chart
- Repo breakdown bar chart
- Stats summary: active days, total commits, lines added/deleted
- All days list — click any day to open the full log inline. Filter by date or repo name (press `/` to focus, `Escape` to clear)
- Markdown rendered via `marked.js`
- Dark minimal theme, pure HTML/JS (no build step)

## Backfill

- `worklog-backfill` alias runs `~/worklog/backfill.mjs`
- Scans full git history across all repos, groups commits by date
- Skips dates with no commits and dates already logged (remote-first existence check)
- Supports `--dry-run`, `--from YYYY-MM-DD`, `--to YYYY-MM-DD` flags
- Pushes all generated entries in a single bulk commit
- Same AI fallback chain as daily log (codex → claude → email)

## Data Seeding

- `node ~/worklog/build-data-json.mjs` rebuilds `data.json` from raw git history (no AI)
- Useful after a backfill to seed the dashboard without re-running AI generation
- Branch names inferred from merge commit messages (e.g. `Merge pull request #N from org/feature/branch`); falls back to current branch if no merge commit found

## Failure Notifications

If both AI providers fail, an email is sent to `programming.mohit@gmail.com` via Mail.app with:
- The date the log failed for
- Both error messages from codex and claude
- Exact command to re-run (backfill) or alias to use (worklog)

## Logs

- Launchd output: `~/.worklog/launchd.log`
- Auto-push (midnight) output: `~/.worklog/cron.log`
