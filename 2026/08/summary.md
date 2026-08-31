## Monthly Summary — August 2026

### Highlights
- Landed a cross-repo password-policy consolidation: moved validation into `nimbly-common`, made `passwordConfiguration` a real persisted field, and aligned `audit-admin`, `api-organizations`, `api-users`, and `api-bulk-operations` to one source of truth.
- Reduced `audit-lite` observability cost and noise by org-gating high-volume questionnaire flow events in Sentry and suppressing offline `ClientBlockedError` reporting.
- Improved `audit-lite` background-upload reliability with fixes for offline misclassification, park/redrive deadlock, orphan cleanup, and backgrounding-aware timeouts; also added a harness that reproduces the OF-50 token-race data loss.
- Shipped product and platform work in `audit-lite`, including ADR-054 Phase 2 native background-task surface, feature-gated home info pills, overview tracking, Android media-permission compliance, and Maestro CI cleanup.

### By Repository
- **`audit-lite`:** observability throttling, background-upload reliability fixes, OF-50 reproduction harness, home/overview product work, ADR-054 Phase 2 native surface, Android/CI permission fixes, 17 commits, +2168/-290 lines
- **`audit-admin`:** moved password-policy read/write to Mongo-backed `passwordConfiguration`, 2 commits, +1748/-302 lines
- **`nimbly-common`:** introduced shared password-policy validation and added `HOME_CARD_INFO_PILLS`, 2 commits, +0/-0 lines
- **`entity-node`:** declared `passwordConfiguration` on `OrganizationSchema`, 1 commit, +0/-0 lines
- **`api-organizations`:** enforced a single write path for `passwordConfiguration`, 1 commit, +0/-0 lines
- **`api-users`:** switched to shared `validatePassword` and reviewed follow-up PRs, 1 commit, +0/-0 lines
- **`api-bulk-operations`:** switched bulk user creation to shared `validatePassword`, 1 commit, +0/-0 lines
- **`api-attachment-gallery`:** fixed gallery-V2 orgs to read today's count from Postgres, 1 commit, +0/-0 lines
- **`nimbly-go-api`:** reviewed gateway auth routing to `api-auth-v3`, 0 commits, +0/-0 lines
- **`api-auth`:** reviewed backend auth changes, 0 commits, +0/-0 lines

### Stats
- Days worked: 15
- Total commits: 25
- Total lines: +4840 / -986
- PRs: [#1827](https://github.com/Nimbly-Technologies/audit-lite/pull/1827), [#1830](https://github.com/Nimbly-Technologies/audit-lite/pull/1830), [#1835](https://github.com/Nimbly-Technologies/audit-lite/pull/1835), [#143](https://github.com/Nimbly-Technologies/nimbly-go-api/pull/143), [#637](https://github.com/Nimbly-Technologies/nimbly-common/pull/637), [#3101](https://github.com/Nimbly-Technologies/audit-admin/pull/3101), [#525](https://github.com/Nimbly-Technologies/entity-node/pull/525), [#138](https://github.com/Nimbly-Technologies/api-organizations/pull/138), [#240](https://github.com/Nimbly-Technologies/api-users/pull/240), [#250](https://github.com/Nimbly-Technologies/api-bulk-operations/pull/250), [#126](https://github.com/Nimbly-Technologies/api-attachment-gallery/pull/126), [#1850](https://github.com/Nimbly-Technologies/audit-lite/pull/1850), [#1851](https://github.com/Nimbly-Technologies/audit-lite/pull/1851), [#1860](https://github.com/Nimbly-Technologies/audit-lite/pull/1860), [#1870](https://github.com/Nimbly-Technologies/audit-lite/pull/1870), [#1871](https://github.com/Nimbly-Technologies/audit-lite/pull/1871), [#1872](https://github.com/Nimbly-Technologies/audit-lite/pull/1872), [#1874](https://github.com/Nimbly-Technologies/audit-lite/pull/1874), [#1876](https://github.com/Nimbly-Technologies/audit-lite/pull/1876), [#1877](https://github.com/Nimbly-Technologies/audit-lite/pull/1877), [#1883](https://github.com/Nimbly-Technologies/audit-lite/pull/1883), [#1892](https://github.com/Nimbly-Technologies/audit-lite/pull/1892), [#128](https://github.com/Nimbly-Technologies/api-auth/pull/128), [#251](https://github.com/Nimbly-Technologies/api-users/pull/251), [#254](https://github.com/Nimbly-Technologies/api-users/pull/254), [#1901](https://github.com/Nimbly-Technologies/audit-lite/pull/1901), [#253](https://github.com/Nimbly-Technologies/api-users/pull/253), [#255](https://github.com/Nimbly-Technologies/api-users/pull/255), [#1909](https://github.com/Nimbly-Technologies/audit-lite/pull/1909), [#1914](https://github.com/Nimbly-Technologies/audit-lite/pull/1914), [#1915](https://github.com/Nimbly-Technologies/audit-lite/pull/1915), [#1916](https://github.com/Nimbly-Technologies/audit-lite/pull/1916), [#1940](https://github.com/Nimbly-Technologies/audit-lite/pull/1940)

### In Progress
- `audit-lite` OF-50 remained unfixed at month end; PR [#1830](https://github.com/Nimbly-Technologies/audit-lite/pull/1830) reproduced the token-race data loss and left the standing regression target in place for the eventual fix.
- `audit-lite` PRs [#1916](https://github.com/Nimbly-Technologies/audit-lite/pull/1916), [#1940](https://github.com/Nimbly-Technologies/audit-lite/pull/1940), and [#1948](https://github.com/Nimbly-Technologies/audit-lite/pull/1948) were still open or actively iterating at month end.