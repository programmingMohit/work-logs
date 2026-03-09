#!/bin/bash

TODAY=$(date +%Y-%m-%d)
YEAR=$(date +%Y)
MONTH=$(date +%m)
LOG_PATH="$HOME/.worklog/$YEAR/$MONTH/$TODAY.md"
WORKLOG_DIR="$HOME/.worklog"

# Sync local with remote if possible, then check
if [ -d "$WORKLOG_DIR/.git" ]; then
  git -C "$WORKLOG_DIR" pull --rebase origin main > /dev/null 2>&1
fi

# Already logged today — nothing to do
if [ -f "$LOG_PATH" ]; then
  exit 0
fi

# Don't open if worklog is already running
if pgrep -f "worklog.mjs" > /dev/null 2>&1; then
  exit 0
fi

# Notify before opening so it's hard to miss
osascript -e 'display notification "Click to review your work log for today." with title "Worklog" subtitle "Time to log your day" sound name "Glass"'

# Open a new Terminal window and run worklog interactively
osascript -e 'tell application "Terminal" to do script "node ~/worklog/worklog.mjs"'
