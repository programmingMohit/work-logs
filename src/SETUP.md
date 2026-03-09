# Worklog — Dev Setup Guide

Automated daily work log system. Scans your git repos for commits, pulls your GitHub activity and macOS calendar events, sends it all to an AI, and pushes a structured markdown log to a GitHub repo. Runs automatically every weekday evening, with a midnight fallback.

---

## Prerequisites

- macOS (uses AppleScript for Calendar + Terminal automation)
- [Node.js](https://nodejs.org) via [nvm](https://github.com/nvm-sh/nvm) — `node --version` should work
- [GitHub CLI](https://cli.github.com) — `gh auth login` should be done
- One AI CLI available: [`claude`](https://docs.anthropic.com/en/docs/claude-code) (Claude Code) and/or [`codex`](https://github.com/openai/codex) (OpenAI Codex CLI)
- [`glow`](https://github.com/charmbracelet/glow) — optional, for pretty markdown rendering in `worklog view`

---

## 1. Clone this repo

```bash
git clone https://github.com/YOUR_USERNAME/worklog.git ~/worklog
```

---

## 2. Create a GitHub repo for your logs

Create a new **public** repo called `work-logs` on GitHub (under your personal account).

Then clone it to `~/.worklog`:

```bash
git clone git@github.com:YOUR_USERNAME/work-logs.git ~/.worklog
```

> `~/.worklog` is the local staging area — logs are written here before being pushed.

---

## 3. SSH host alias (if using separate GitHub accounts)

If your work and personal GitHub accounts are separate, add a host alias in `~/.ssh/config`:

```
Host github-YOUR_PERSONAL
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_personal   # path to your personal key
```

Then use `git@github-YOUR_PERSONAL:YOUR_USERNAME/work-logs.git` as the remote URL (see step 5).

If you only have one GitHub account, you can skip this and use `git@github.com:YOUR_USERNAME/work-logs.git` directly.

---

## 4. Adapt `worklog.mjs` to your setup

Edit `~/worklog/worklog.mjs` — update the config block at the top:

```js
// ─── Config ───────────────────────────────────────────────────────────────────

const NIMBLY_DIR     = join(homedir(), 'Desktop/YourProjects'); // dir containing your git repos
const STAGING_DIR    = join(homedir(), '.worklog');             // leave as-is
const GH_WORK_USER   = 'YourWorkGitHubUsername';               // GitHub user for fetching events
const GH_PERSONAL    = 'YourPersonalGitHubUsername';           // GitHub user for pushing logs
const LOGS_REPO      = `git@github.com:${GH_PERSONAL}/work-logs.git`; // or use host alias
const GIT_AUTHORS    = '--author="your@work.email.com" --author="YourWorkGitHubUsername"';
```

Also update `WORK_CALENDARS` (line ~276) with the names of your work calendars:

```js
const WORK_CALENDARS = ['Work', 'your@work.email.com'];
```

Open macOS Calendar → check the exact calendar names in the sidebar and match them here.

---

## 5. Adapt `backfill.mjs` (same config changes)

Edit `~/worklog/backfill.mjs` — same `NIMBLY_DIR`, `GH_WORK_USER`, `GH_PERSONAL`, `LOGS_REPO`, `GIT_AUTHORS` block at the top.

---

## 6. Adapt `auto-push-worklog.sh`

Update the hardcoded path on line 21:

```bash
"$NODE" /Users/YOUR_USERNAME/worklog/worklog.mjs --auto \
```

Change `/Users/YOUR_USERNAME/worklog/worklog.mjs` to your actual path.

---

## 7. Add the `worklog` shell alias

Add to `~/.zshrc` (or `~/.bashrc`):

```bash
alias worklog='node ~/worklog/worklog.mjs'
alias worklog-backfill='node ~/worklog/backfill.mjs'
```

Then reload:

```bash
source ~/.zshrc
```

---

## 8. Install Launch Agents (auto-scheduling)

The two `.plist` files in `~/Library/LaunchAgents/` drive the automation:

| Agent | Schedule | What it does |
|---|---|---|
| `com.YOUR_USERNAME.worklog.interactive` | Mon–Fri, 5pm–11pm hourly | Sends a macOS notification + opens Terminal to run `worklog` interactively |
| `com.YOUR_USERNAME.worklog.midnight` | Mon–Fri, 11:50pm | Auto-pushes the log silently if you never ran `worklog` manually |

### Create the interactive agent

Create `~/Library/LaunchAgents/com.YOUR_USERNAME.worklog.interactive.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.YOUR_USERNAME.worklog.interactive</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/YOUR_USERNAME/worklog/open-worklog.sh</string>
  </array>

  <key>StartCalendarInterval</key>
  <array>
    <!-- Monday through Friday, 5pm–11pm -->
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>17</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>19</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>21</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>22</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>17</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>19</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>21</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>22</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>17</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>19</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>21</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>22</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>17</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>19</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>21</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>22</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>17</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>18</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>19</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>21</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>22</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>0</integer></dict>
  </array>

  <key>StandardOutPath</key>
  <string>/Users/YOUR_USERNAME/.worklog/launchd.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/YOUR_USERNAME/.worklog/launchd.log</string>
</dict>
</plist>
```

### Create the midnight agent

Create `~/Library/LaunchAgents/com.YOUR_USERNAME.worklog.midnight.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.YOUR_USERNAME.worklog.midnight</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/YOUR_USERNAME/worklog/auto-push-worklog.sh</string>
  </array>

  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>50</integer></dict>
    <dict><key>Weekday</key><integer>2</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>50</integer></dict>
    <dict><key>Weekday</key><integer>3</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>50</integer></dict>
    <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>50</integer></dict>
    <dict><key>Weekday</key><integer>5</integer><key>Hour</key><integer>23</integer><key>Minute</key><integer>50</integer></dict>
  </array>

  <key>StandardOutPath</key>
  <string>/Users/YOUR_USERNAME/.worklog/launchd.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/YOUR_USERNAME/.worklog/launchd.log</string>
</dict>
</plist>
```

### Load both agents

```bash
launchctl load ~/Library/LaunchAgents/com.YOUR_USERNAME.worklog.interactive.plist
launchctl load ~/Library/LaunchAgents/com.YOUR_USERNAME.worklog.midnight.plist
```

To reload after any edits:

```bash
launchctl unload ~/Library/LaunchAgents/com.YOUR_USERNAME.worklog.interactive.plist
launchctl load   ~/Library/LaunchAgents/com.YOUR_USERNAME.worklog.interactive.plist
```

---

## 9. macOS permissions

The automation uses AppleScript to control Calendar and Terminal. macOS will prompt you the first time — approve both.

If it doesn't prompt (or if it silently fails), grant permissions manually:

- **System Settings → Privacy & Security → Automation** — enable Terminal → Calendar
- **System Settings → Privacy & Security → Full Disk Access** — enable your terminal app (required for launchd to work when the screen is locked)

---

## 10. Failure notifications

If both AI providers fail (rate limit / not installed), `worklog` sends an email via Mail.app.

Update the recipient email in `worklog.mjs` line ~8:

```js
make new to recipient with properties {address:"your@email.com"}
```

---

## Verify the setup

```bash
worklog status
```

Output should show:
- Last log pushed date
- Both Launch Agents as `✓ loaded`
- Correct Node path
- Staging dir pointing to `~/.worklog`

---

## CLI reference

| Command | Description |
|---|---|
| `worklog` | Generate, preview, and push today's log |
| `worklog status` | System health: last log, missing days, agent status |
| `worklog view [YYYY-MM-DD]` | View a past log (renders via `glow` if installed) |
| `worklog edit [YYYY-MM-DD]` | Edit a log in `$EDITOR`, prompts to push |
| `worklog regen [YYYY-MM-DD]` | Delete and regenerate a log entry via AI |
| `worklog note "text"` | Append a quick note to today's log and push immediately |
| `worklog --auto` | Non-interactive — used by the midnight agent |
| `worklog-backfill` | Generate logs for all past days with commits but no log |
| `worklog-backfill --dry-run` | Preview what would be generated, no API calls |
| `worklog-backfill --from YYYY-MM-DD --to YYYY-MM-DD` | Backfill a specific date range |

### Interactive prompt options

```
Save & push? [Y/n/e(dit)]:
```

| Input | Action |
|---|---|
| `Y` or Enter | Push as-is |
| `n` | Discard, nothing saved |
| `e` | Open in `$EDITOR`, push after close |

---

## File structure

```
~/worklog/
  worklog.mjs            # main script
  backfill.mjs           # backfill past days
  build-data-json.mjs    # rebuild data.json from raw git history (no AI)
  open-worklog.sh        # interactive trigger (called by launchd)
  auto-push-worklog.sh   # midnight auto-push (called by launchd)
  index.html             # dashboard source of truth (synced to ~/.worklog on every push)
  package.json

~/.worklog/              # local clone of your work-logs repo
  YYYY/MM/YYYY-MM-DD.md  # daily logs
  YYYY/MM/week-YYYY-MM-DD.md  # weekly rollups (auto on Fridays)
  YYYY/MM/summary.md     # monthly rollup (auto on last day of month)
  data.json              # structured metadata for dashboard
  index.html             # dashboard (GitHub Pages)
  cron.log               # midnight agent output
  launchd.log            # interactive agent output

~/Library/LaunchAgents/
  com.YOUR_USERNAME.worklog.interactive.plist
  com.YOUR_USERNAME.worklog.midnight.plist
```

---

## Troubleshooting

**"No activity found for today"**
No commits or GitHub events since midnight. Nothing to log — run it tomorrow after committing.

**AI generation fails**
- `claude`: run `claude --version` — if missing, install Claude Code.
- `codex`: run `codex --version` — if missing, either install it or ignore (claude is the fallback).
- Both failing → check `~/.worklog/cron.log` for the exact error.

**Push fails**
Verify your SSH key works: `ssh -T git@github.com` (or `ssh -T git@github-YOUR_PERSONAL` if using a host alias).

**Launch agents not firing**
- Check they're loaded: `launchctl list | grep worklog`
- Check logs: `tail -50 ~/.worklog/launchd.log`
- Grant Full Disk Access to your terminal app (System Settings → Privacy & Security → Full Disk Access).
- launchd fires missed triggers on next Mac wake, so if your Mac was asleep at the scheduled time it'll run when it wakes.

**Calendar events missing**
- Make sure the calendar names in `WORK_CALENDARS` exactly match what appears in macOS Calendar's sidebar.
- Grant Calendar access: System Settings → Privacy & Security → Automation → Terminal → Calendar.
