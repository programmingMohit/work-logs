## Monthly Summary — July 2026

### Highlights
- **Shipped confidence-gated geofencing end-to-end** (ADR-036 / ADR-044) across `audit-lite` and `api-schedules` — server-driven `isLocationRequiredForCheckIn`, release-flag gating for auditor signalling, and the geofence UI (PRs #1730, #424).
- **Executed the ADR-020 observability rework**: introduced the `captureFlowEvent` primitive, migrated questionnaire business-logic spans onto it, then fixed Sentry issue titling and tagged every EAS OTA update as its own release — net *less* instrumentation code with sharper crash attribution (#1761, #1768, #1782, #1783).
- **Built the Sentry→Fizzy card assignment sync in `nimblee`** — card creation on assign, assignee sync on re-assign, plus three hardening passes (stale-reservation reclaim, no cache poisoning on transient errors, abort on partial failure) (#77).
- **Killed a 30s socket timeout on the dashboard issue-health RCR count** in `api-statistics` by removing a dead `$addFields` stage, with new coverage on the `countDocuments` vs pipeline branches (#368).
- **Sustained reliability sweep on `audit-lite`**: gateway config retry/backoff, offline `dayjs.tz()` Intl crash, questionnaire poll nullish/no-update hardening, site-filter debounce, and stuck "Submitting" comment sheets (#1746, #1745, #1794, #1827).

### By Repository
- **`audit-lite`:** Geofencing feature, ADR-020 flow-event telemetry, ADR-054 background prefetch PoC, release-sanity staging lane, and 6+ reliability fixes. 31 commits, ~+4900 / -2500 lines.
- **`nimblee`:** Sentry issue → Fizzy card creation/assignee sync with failure-mode hardening. 5 commits, ~+1200 / -20 lines (est.).
- **`api-statistics`:** Dashboard RCR-count timeout fix, pipeline branch coverage, lint/format cleanup. 5 commits, ~+180 / -40 lines (est.).
- **`api-file-repository`:** ADR-053 — migrated org reads from Firebase RTDB to MongoDB, with timezone resolver extraction, unit + pact tests. 6 commits, +150 / -39 lines.
- **`audit-functions`:** Distinct MongoDB `appName` per Cloud Function, camelCase labels matching deployed names. 4 commits, ~+60 / -60 lines (est.).
- **`audit-admin`:** Stale-deploy chunk-load error recovery, no-fix policy admin setting, `HEALTH_SCORE_PEER_COMPARISON` UI gate. 3 commits, ~+90 / -30 lines (est.).
- **`api-schedules`:** Geofence-confidence-capture merge + `noFixPolicyInheritance` test formatting. 2 commits, ~+20 / -10 lines (est.).
- **`admin-lite`:** `HEALTH_SCORE_PEER_COMPARISON` toggle in the Feature Access screen. 1 commit, +18 / -0 lines.

*Per-repo line counts are exact only for single-repo days; mixed-repo days (07-01, 07-03, 07-07, 07-17, 07-21, 07-27) are apportioned by estimate.*

### Stats
- Days worked: 15
- Total commits: 57 (unique hashes; squash-merge duplicates of branch commits on `master` counted once)
- Total lines: +6,951 / -3,061
- PRs: [audit-lite #1730](https://github.com/Nimbly-Technologies/audit-lite/pull/1730), [#1743](https://github.com/Nimbly-Technologies/audit-lite/pull/1743), [#1745](https://github.com/Nimbly-Technologies/audit-lite/pull/1745), [#1746](https://github.com/Nimbly-Technologies/audit-lite/pull/1746), [#1761](https://github.com/Nimbly-Technologies/audit-lite/pull/1761), [#1762](https://github.com/Nimbly-Technologies/audit-lite/pull/1762), [#1768](https://github.com/Nimbly-Technologies/audit-lite/pull/1768), [#1782](https://github.com/Nimbly-Technologies/audit-lite/pull/1782), [#1783](https://github.com/Nimbly-Technologies/audit-lite/pull/1783), [#1794](https://github.com/Nimbly-Technologies/audit-lite/pull/1794), [#1822](https://github.com/Nimbly-Technologies/audit-lite/pull/1822), [#1827](https://github.com/Nimbly-Technologies/audit-lite/pull/1827); [audit-admin #3047](https://github.com/Nimbly-Technologies/audit-admin/pull/3047), [#3054](https://github.com/Nimbly-Technologies/audit-admin/pull/3054), [#3079](https://github.com/Nimbly-Technologies/audit-admin/pull/3079); [api-statistics #368](https://github.com/Nimbly-Technologies/api-statistics/pull/368); [api-schedules #424](https://github.com/Nimbly-Technologies/api-schedules/pull/424); [api-file-repository #56](https://github.com/Nimbly-Technologies/api-file-repository/pull/56); [nimblee #77](https://github.com/Nimbly-Technologies/nimblee/pull/77); [admin-lite #323](https://github.com/Nimbly-Technologies/admin-lite/pull/323); [audit-functions #491](https://github.com/Nimbly-Technologies/audit-functions/pull/491). Reviews given: [nimbly-go-api #128](https://github.com/Nimbly-Technologies/nimbly-go-api/pull/128), [#139](https://github.com/Nimbly-Technologies/nimbly-go-api/pull/139).

### In Progress
- **[#1822](https://github.com/Nimbly-Technologies/audit-lite/pull/1822) — ADR-054 background questionnaire prefetch (PoC), open.** `expo-background-task` + native config plugin, route-independent prefetch params, deep-linked completion notifications. Real-device scheduling behaviour (especially iOS budget throttling) is unvalidated.
- **[#1827](https://github.com/Nimbly-Technologies/audit-lite/pull/1827) — issue Activity tab comment-sheet fixes, open, awaiting review.** Layout fix verified on hardware (SM-M346B); the failed-submit path is not device-verified (needs a mid-flight timeout to reproduce). Three sibling comment sheets still lack real regression harnesses — offered as follow-up.
- **Health-score peer-comparison removal holdout — shipped but not concluded.** The flag only persists for `custom`-package orgs; `starter`/`pro`/`enterprise` need the key added to the `nimbly-common` `FeaturesType` enum. Success is measured by *absence* of CS demand, so it needs a check-in window and an eventual removal pass to strip the flag.
- **[#491](https://github.com/Nimbly-Technologies/audit-functions/pull/491) — MongoDB per-function `appName`;** merge status not captured in the daily logs.

`★ Insight ─────────────────────────────────────`
- **The commit count needs a caveat, not a bigger number.** Squash-merge repos make the same work appear twice: the branch commits (e.g. `dbfa61fa`/`1a8e429d`/`5a62ab6a` on 07-07) and again as one squashed commit on `master` (`6de3f3ee` on 07-13). Counting both inflates output by ~40% for July. The 57 figure counts unique hashes and treats the 07-27 log's `95bda19`/`27be3b1`/`10cc86c` as re-reports of the 07-21 commits, not new ones.
- **Two of the month's three biggest features were net-negative in lines** (ADR-020: +1,551/-1,833). For observability work that's the healthy signature — scattered spans consolidating into one `captureFlowEvent` primitive. Judging that work by lines added would read it as a slow month.
- **The month has a visible rhythm:** land a large feature, then immediately close its reliability edges. Geofencing (#1730) → four fixes the same session; `captureFlowEvent` (#1761) → Sentry titling fix (#1783) a day later; Fizzy sync (#77) → three hardening commits on the same branch. That's the pattern a raw commit list flattens away.
`─────────────────────────────────────────────────`