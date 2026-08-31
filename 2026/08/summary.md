## Monthly Summary — August 2026

### Highlights
- Reduced `audit-lite` Sentry noise materially by org-gating high-volume questionnaire flow anchors, targeting an estimated ~97% drop in steady-state quota burn while preserving full capture for flagged orgs.
- Completed the password-policy consolidation across `nimbly-common`, `entity-node`, `api-organizations`, `api-users`, `api-bulk-operations`, and `audit-admin`, moving enforcement to shared validation plus Mongo-backed `passwordConfiguration`.
- Spent much of the month hardening `audit-lite` background upload and offline flows: revived the submit-flow harness, reproduced OF-50 token-race data loss, fixed offline misclassification/deadlock cases, shipped backgrounding-aware timeout/orphan handling, and landed ADR-054 Phase 2.
- Shipped several user-facing `audit-lite` improvements: `HOME_CARD_INFO_PILLS` gating, home header button restyle, overview PostHog tracking, clearer unsynced-work dialog copy, and issue-comment sheet reliability fixes.
- Closed the month with Android and CI compliance fixes in `audit-lite`, removing broad `READ_MEDIA_*` usage for Play acceptance and cleaning stale Maestro permission grants.

### By Repository
- **`audit-lite`:** observability, offline/background-upload reliability, ADR-054 Phase 2, home/overview UX, Android/CI fixes, 17 commits, +2168/-290 captured lines
- **`audit-admin`:** moved password policy read/write to Mongo-backed `passwordConfiguration`, 2 commits, +1748/-302 lines
- **`nimbly-common`:** introduced shared password-policy validation and the `HOME_CARD_INFO_PILLS` feature flag, 2 commits, +131/-1 captured lines
- **`entity-node`:** added `passwordConfiguration` to `OrganizationSchema`, 1 commit, +0/-0 captured lines
- **`api-organizations`:** enforced a single write path for `passwordConfiguration`, 1 commit, +0/-0 captured lines
- **`api-users`:** replaced local password validation with shared `validatePassword`, 1 commit, +0/-0 captured lines
- **`api-bulk-operations`:** switched bulk-user flows to shared `validatePassword`, 1 commit, +0/-0 captured lines
- **`api-attachment-gallery`:** made today’s gallery count respect the gallery V2/Postgres path, 1 commit, +0/-0 captured lines

### Stats
- Days worked: 15
- Total commits: 26
- Total lines: +4840 / -986
- PRs: [#1827](https://github.com/Nimbly-Technologies/audit-lite/pull/1827), [#1830](https://github.com/Nimbly-Technologies/audit-lite/pull/1830), [#1835](https://github.com/Nimbly-Technologies/audit-lite/pull/1835), [#637](https://github.com/Nimbly-Technologies/nimbly-common/pull/637), [#3101](https://github.com/Nimbly-Technologies/audit-admin/pull/3101), [#525](https://github.com/Nimbly-Technologies/entity-node/pull/525), [#138](https://github.com/Nimbly-Technologies/api-organizations/pull/138), [#240](https://github.com/Nimbly-Technologies/api-users/pull/240), [#250](https://github.com/Nimbly-Technologies/api-bulk-operations/pull/250), [#126](https://github.com/Nimbly-Technologies/api-attachment-gallery/pull/126), [#1850](https://github.com/Nimbly-Technologies/audit-lite/pull/1850), [#1851](https://github.com/Nimbly-Technologies/audit-lite/pull/1851), [#1860](https://github.com/Nimbly-Technologies/audit-lite/pull/1860), [#1870](https://github.com/Nimbly-Technologies/audit-lite/pull/1870), [#1871](https://github.com/Nimbly-Technologies/audit-lite/pull/1871), [#1872](https://github.com/Nimbly-Technologies/audit-lite/pull/1872), [#1874](https://github.com/Nimbly-Technologies/audit-lite/pull/1874), [#1876](https://github.com/Nimbly-Technologies/audit-lite/pull/1876), [#1877](https://github.com/Nimbly-Technologies/audit-lite/pull/1877), [#1883](https://github.com/Nimbly-Technologies/audit-lite/pull/1883), [#1892](https://github.com/Nimbly-Technologies/audit-lite/pull/1892), [#1901](https://github.com/Nimbly-Technologies/audit-lite/pull/1901), [#1909](https://github.com/Nimbly-Technologies/audit-lite/pull/1909), [#1914](https://github.com/Nimbly-Technologies/audit-lite/pull/1914), [#1915](https://github.com/Nimbly-Technologies/audit-lite/pull/1915), [#1916](https://github.com/Nimbly-Technologies/audit-lite/pull/1916), [#1940](https://github.com/Nimbly-Technologies/audit-lite/pull/1940)

### In Progress
Open at month end from the logs: `audit-lite` report sync ops table ([#1940](https://github.com/Nimbly-Technologies/audit-lite/pull/1940)) and `audit-lite` PR [#1948](https://github.com/Nimbly-Technologies/audit-lite/pull/1948). OF-50 remained in reproduction/contract-test state after [#1830](https://github.com/Nimbly-Technologies/audit-lite/pull/1830), and ADR-054 had later phases still outstanding.