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

# Already logged today with full content — nothing to do
# Skip only if log exists AND has sections beyond just Notes
if [ -f "$LOG_PATH" ]; then
  if grep -qE "^### (Summary|Tasks)" "$LOG_PATH"; then
    exit 0
  fi
fi

# Don't open if worklog is already running
if pgrep -f "worklog.mjs" > /dev/null 2>&1; then
  exit 0
fi

# Notify before opening so it's hard to miss
osascript -e 'display notification "Click to review your work log for today." with title "Worklog" subtitle "Time to log your day" sound name "Glass"'

# Open a new Terminal window and run worklog interactively
osascript -e 'tell application "Terminal" to do script "unset CLAUDECODE && /Users/mohitchakraborty/.nvm/versions/node/v22.17.0/bin/node ~/worklog/worklog.mjs"'
