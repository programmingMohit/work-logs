## Monthly Summary — September 2026

### Highlights
- **Built out the ADR-078 durable submit outbox in `audit-lite`.** The stack runs from #1953 to #1983, plus the Phase 6 tests in #1985. Tapping Complete now saves the report on the device first and queues it for submission. The work covers:
  - sending queued reports in the background and locking a report while its submission is queued
  - a new submission screen with uploading, failed and rejected states
  - notifications for submission state
  - a release flag that switches the outbox off and restores the old submit path unchanged

  On 09-18 the whole stack was rebased and force-pushed after conflicts on #1970.
- **Fixed the bugs found in offline field testing and merged the fixes.** #2040 retries submissions that never reached the server, handles dropped signatures correctly and adds a separate screen for server rejections. #2046 adds tracing spans, Sentry errors for real defects and counters to track the rollout. The fixes came from testing on a physical device, using Proxyman breakpoints and flight-recorder logs from field phones.
- **Made uploads more reliable.** #2065 (merged) fixes four bugs:
  - a question row that stopped responding
  - a report delivered with five attachment keys that had no uploaded files behind them
  - a Retake prompt shown for no reason after the app was killed mid-upload
  - the delivering submit not being recorded

  #2064 holds an upload when the session has expired and resumes it after the user logs in again, instead of marking the attachment failed.
- **Fixed a crash on app launch.** It was traced to Freshchat CS-reply notifications (#2026), which triggered expo-updates error recovery and killed the process about 3 seconds after start. The change was reverted in #2033.
- **Fixed a check-in telemetry probe (#1977).** It was subtracting the Android nav bar twice, which produced 21,580 false `checkin_button_offscreen` events in one release against a baseline of about 1,042.

### By Repository
- **`audit-lite`:** Built the ADR-078 outbox stack and the submission screen, fixed the field-testing bugs, added outbox tracing and Sentry reporting, reverted the launch crash, fixed the upload path, fixed the telemetry probe and corrected the docs from yarn to pnpm (#1950). Also wrote an analysis of the force-upgrade "already submitted" sync errors and a manual test checklist for the outbox. **99 commits, +43,545 / -15,230 lines**
- **`mongo-postgress-sync-jobs`:** Reviewed PR #13. 0 commits, +0/-0
- **`compass`:** Reviewed PR #109. 0 commits, +0/-0
- **`nimbly-cloud`:** Reviewed PR #239, which moves `schedulerStatistic` from gen1 Cloud Functions to Cloud Run. 0 commits, +0/-0
- **`api-users`:** Submitted a review on 09-02; the PR number wasn't recorded. 0 commits, +0/-0
- **`worklog` (personal):** The log job now runs on its own, the gcalcli login no longer expires every 7 days, the commit-collection bug was fixed and the `ytb` standup generator was built. No commits recorded.

### Stats
- Days worked: 17
- Total commits: 99 (about 92 unique; 66 of them are from the 09-18 stack rebase)
- Total lines: +43,545 / -15,230 (09-18 alone is +33,525 / -12,583, mostly from the rebase)
- PRs (authored, `audit-lite`): [#1950](https://github.com/Nimbly-Technologies/audit-lite/pull/1950), [#1953](https://github.com/Nimbly-Technologies/audit-lite/pull/1953), [#1956](https://github.com/Nimbly-Technologies/audit-lite/pull/1956), [#1962](https://github.com/Nimbly-Technologies/audit-lite/pull/1962), [#1970](https://github.com/Nimbly-Technologies/audit-lite/pull/1970), [#1977](https://github.com/Nimbly-Technologies/audit-lite/pull/1977), [#1978](https://github.com/Nimbly-Technologies/audit-lite/pull/1978), [#1980](https://github.com/Nimbly-Technologies/audit-lite/pull/1980), [#1982](https://github.com/Nimbly-Technologies/audit-lite/pull/1982), [#1983](https://github.com/Nimbly-Technologies/audit-lite/pull/1983), [#1985](https://github.com/Nimbly-Technologies/audit-lite/pull/1985), [#2033](https://github.com/Nimbly-Technologies/audit-lite/pull/2033), [#2037](https://github.com/Nimbly-Technologies/audit-lite/pull/2037), [#2039](https://github.com/Nimbly-Technologies/audit-lite/pull/2039), [#2040](https://github.com/Nimbly-Technologies/audit-lite/pull/2040), [#2046](https://github.com/Nimbly-Technologies/audit-lite/pull/2046), [#2056](https://github.com/Nimbly-Technologies/audit-lite/pull/2056), [#2064](https://github.com/Nimbly-Technologies/audit-lite/pull/2064), [#2065](https://github.com/Nimbly-Technologies/audit-lite/pull/2065)
- PRs (reviewed): [mongo-postgress-sync-jobs#13](https://github.com/Nimbly-Technologies/mongo-postgress-sync-jobs/pull/13), [compass#109](https://github.com/Nimbly-Technologies/compass/pull/109), [nimbly-cloud#239](https://github.com/Nimbly-Technologies/nimbly-cloud/pull/239)

### In Progress
- **ADR-078 stack:** #1953 to #1983 and #1985 were still open as of 09-18. The 11/11 PR hasn't been raised. #1978 has requested changes that haven't been committed.
- **#2064** (holding uploads on an expired session) is open.
- **#2056** (hiding attachment progress for reports with no attachments) is open. Link Fizzy card 1776 to it before merge.
- **#2033** (the Freshchat revert) is waiting to merge. The CS-reply notification feature needs a new approach that doesn't trigger expo-updates error recovery.
- **Submission stuck at 54/54:** the fix is to use one definition of "uploaded" in `derive-submission-state.ts`. Why the submission stopped (Bug 2) is still unknown.
- **ADR-078 manual test checklist:** written, but the test passes haven't been run.
- **Sentry `AUDIT-LITE-V2-67N` / issue 7735846489:** follow up on the fix PR, and track 2.16.x users against the new OTA adoption command in PostHog.
- **"Sync with server" error toast:** the cause isn't confirmed. It may need a fix card if `syncReport` turns out to have regressed.
- **Backlog (P2):** tapping the "Sending Paused" notification should open that report's submission screen.
- **Docs and tooling:** the PostHog feature-flag guide for QA needs real screenshots and a commit. `ytb.mjs` in `worklog` isn't committed.
- **Check #1822** (ADR-054 background questionnaire prefetch): there was activity on 09-23, but what happened wasn't recorded.

The commit and line totals count what each day logged, so they include duplicates. The 09-18 rebase re-lists the 09-03 and 09-17 commits under new hashes, and the 09-25 squash-merges of #2040 and #2046 repeat work from 09-22 and 09-23. Days from 09-07 to 09-10 have pushes but no commit data, so those commits are missing from the totals.