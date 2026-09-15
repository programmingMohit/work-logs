# Work Log

**📖 Read it here: <https://programmingmohit.github.io/work-logs/>**

A daily record of what I worked on, generated automatically and committed here.

## What's in this repo

```
2023/ 2024/ 2025/ 2026/   one Markdown file per day, YYYY/MM/YYYY-MM-DD.md
index.html                the site served at the URL above
data.json                 every log parsed into JSON — what index.html reads
src/                      snapshot of the generator that writes all of this
```

372 daily logs so far, from 2023-12-27 onward.

## How a day gets written

A launchd agent runs at **17:00 on weekdays**, generates the day's log, commits it,
and pushes. It notifies on success and on failure, so a silent break isn't possible.
Days with no recorded activity are skipped rather than committed empty.

Each log is assembled from four sources:

| Source | What it contributes |
|---|---|
| Local git | commits across every checkout, with diff stats |
| GitHub | pushes, PRs, reviews, issues |
| Google Calendar | meetings attended, via `gcalcli` |
| Claude Code | sessions, and what was worked on in them |

The generator lives outside this repo, at `~/worklog/`; `src/` here is a copy of it.
See `~/worklog/README.md` for setup, the schedule, and troubleshooting.

## Reading a log

Each file opens with a one-line diff summary and a written summary of the day,
followed by sections for commits, meetings, and sessions — whichever had activity.
