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

# Midnight fallback — auto-push without interaction
NODE=$(~/.nvm/nvm-exec which node 2>/dev/null || which node)
"$NODE" /Users/mohitchakraborty/worklog/worklog.mjs --auto \
  >> "$HOME/.worklog/cron.log" 2>&1
