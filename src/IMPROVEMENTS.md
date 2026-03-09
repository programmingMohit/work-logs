# Work Logging — Improvements & Scope

## Open Issues

### Real Issues

**1. `pushLog` merge conflicts are swallowed**
`ensureRepo()` runs `git pull --rebase` before every push. If there's a conflict (e.g. you manually pushed something), `run()` swallows the error and the subsequent commit/push silently fails or produces garbage state.

**2. `worklog regen` passes `githubEvents: []`**
For dates within the last 90 days, GitHub Events API has data. Regen silently skips it and the AI gets an incomplete picture. Should attempt to fetch events for the target date the same way the backfill does.

**3. Calendar sync failure is silent**
If Calendar.app hasn't synced recent events (bad network, app not open), `getCalendarEvents` returns `[]` with no warning. You'd get a log with no Meetings section and never know why. Should log a warning when AppleScript returns empty on a weekday.

**4. `worklog status` is slow**
It scans every repo's entire git history on every run to build the commit date set. With years of history across many repos this will get progressively slower. Should limit to a recent window (e.g. last 90 days) or accept a `--from` flag.

### Missing Features

**5. `worklog preview` (dry-run)**
No way to see what commits and events will be included before the AI runs. A `worklog preview` that prints the raw activity data — commits, GitHub events, calendar events — without calling AI would let you catch missing data before burning quota.

**6. Meeting stats not in `data.json`**
Calendar events are fetched and passed to the AI but never persisted to `data.json`. The dashboard has no visibility into meeting load — a "meetings per week" overlay on the trend chart or a "busiest meeting days" stat would be genuinely useful, especially for spotting weeks where meetings ate into coding time.

**7. Repo bar chart is all-time only**
The Repositories chart shows total commits since Dec 2023. Repos you worked on heavily in early 2024 permanently dominate. A toggle for "All time / Last 90 days" would make it more useful for understanding current focus.

### Nice-to-Haves

**8. `worklog.mjs` is getting large (~850 lines)**
One file doing git scanning, calendar, AI, git push, 6 CLI commands, and rollups. Not broken but starting to be hard to navigate. Splitting into `lib/git.mjs`, `lib/calendar.mjs`, `lib/ai.mjs` would make it maintainable long-term.

**9. `worklog note --date` flag**
Running `worklog note` at 00:15 appends to the new day's log. If you meant to note something from the previous day's work session, there's no way to specify a date. `worklog note --date 2026-03-06 "text"` would cover it.

**10. Dashboard not mobile-friendly**
The two-column grid, heatmap, and trend chart don't scale well on phone screens. Low priority but the GitHub Pages URL is something you might open on your phone to check stats.

---

## Priority Order

| Priority | Item |
|----------|------|
| High | Fix `pushLog` swallowing merge conflicts |
| High | `worklog regen` should fetch GitHub events for the date |
| High | Warn when calendar returns empty on a weekday |
| Medium | `worklog status` — limit history scan to recent window |
| Medium | `worklog preview` dry-run |
| Medium | Persist calendar events in `data.json` + dashboard meeting stats |
| Medium | Repo chart all-time / 90-day toggle |
| Low | `worklog note --date` flag |
| Low | `worklog.mjs` module split |
| Low | Mobile dashboard |
