## Monthly Summary — April 2026

### Highlights
- Drove a broad set of production fixes across PDF/reporting flows, including client-timezone-aware issue PDFs, signature/layout improvements, report download timeout handling, and report PDF photo offset fixes.
- Shipped end-to-end org-level `maxPhotoLimit` support across shared schemas and admin settings, coordinating updates in `nimbly-common`, `entity-node`, `audit-functions`, and `audit-admin`.
- Improved reliability and recovery in reporting/admin flows by adding the Reports Hub failed-request modal, hardening observability around anchor flow events, and stabilizing CI/deploy workflows.
- Delivered multiple questionnaire and admin UX fixes, including bulk export `.xlsx` handling, conditional-question photo source behavior, and removal of invalid archive/soft-delete flows.
- Closed several backend correctness issues in scoring and assignment logic, including QC dashboard denominator fixes and category-level auto-assignment member resolution, with one follow-up revert after review.

### By Repository
- **`admin-lite`:** questionnaire bulk export `.xlsx` fix, conditional-question photo source cleanup, removed invalid archive flow, deploy OOM mitigation, 26 commits, +1438/-1159 lines
- **`audit-admin`:** CI/Corepack fixes, PDF request timezone support, issue PDF filter copy fix, org `maxPhotoLimit` setting, Reports Hub failed-request modal, deploy/test stability tweaks, 14 commits, +675/-1873 lines
- **`audit-lite`:** questionnaire render-loop investigation/revert, issue-review fixes, observability improvements, questionnaire span-removal follow-up, iPad UI work started, 11 commits, +1042/-725 lines
- **`audit-functions`:** org schema `maxPhotoLimit` support, lockfile/npm ci repair, report PDF photo offset fix, 7 commits, +167/-9570 lines
- **`api-report-issues`:** category-level auto-assignment member resolution updates and follow-up revert, 6 commits, +66/-51 lines
- **`api-statistics`:** QC dashboard scoring fix to exclude open questions from the denominator, 4 commits, +80/-68 lines
- **`entity-node`:** org schema `maxPhotoLimit` support and release/dependency updates, 4 commits, +98/-6371 lines
- **`nimbly-common`:** released shared package updates needed for downstream schema work, 1 commit, +25/-1593 lines
- **`nimbly-go-api`:** issue PDF client-timezone rendering, department/attachment fixes, and signature section redesign, 5 commits, +171/-99 lines
- **`nimbly-web-api`:** report download timeout failure handling and bulk-download hardening, 6 commits, +372/-65 lines

### Stats
- Days worked: 18
- Total commits: 84
- Total lines: +4134 / -21574
- PRs: [#47](https://github.com/Nimbly-Technologies/api-report-issues/pull/47), [#49](https://github.com/Nimbly-Technologies/api-report-issues/pull/49), [#93](https://github.com/Nimbly-Technologies/nimbly-go-api/pull/93), [#94](https://github.com/Nimbly-Technologies/nimbly-go-api/pull/94), [#95](https://github.com/Nimbly-Technologies/nimbly-go-api/pull/95), [#96](https://github.com/Nimbly-Technologies/nimbly-go-api/pull/96), [#268](https://github.com/Nimbly-Technologies/admin-lite/pull/268), [#275](https://github.com/Nimbly-Technologies/admin-lite/pull/275), [#279](https://github.com/Nimbly-Technologies/admin-lite/pull/279), [#280](https://github.com/Nimbly-Technologies/admin-lite/pull/280), [#312](https://github.com/Nimbly-Technologies/api-statistics/pull/312), [#384](https://github.com/Nimbly-Technologies/nimbly-web-api/pull/384), [#413](https://github.com/Nimbly-Technologies/audit-functions/pull/413), [#421](https://github.com/Nimbly-Technologies/audit-functions/pull/421), [#1501](https://github.com/Nimbly-Technologies/audit-lite/pull/1501), [#1533](https://github.com/Nimbly-Technologies/audit-lite/pull/1533), [#1534](https://github.com/Nimbly-Technologies/audit-lite/pull/1534), [#1536](https://github.com/Nimbly-Technologies/audit-lite/pull/1536), [#1545](https://github.com/Nimbly-Technologies/audit-lite/pull/1545), [#1559](https://github.com/Nimbly-Technologies/audit-lite/pull/1559), [#1568](https://github.com/Nimbly-Technologies/audit-lite/pull/1568), [#1576](https://github.com/Nimbly-Technologies/audit-lite/pull/1576), [#2891](https://github.com/Nimbly-Technologies/audit-admin/pull/2891), [#2904](https://github.com/Nimbly-Technologies/audit-admin/pull/2904), [#2907](https://github.com/Nimbly-Technologies/audit-admin/pull/2907), [#2908](https://github.com/Nimbly-Technologies/audit-admin/pull/2908), [#2920](https://github.com/Nimbly-Technologies/audit-admin/pull/2920), [#2933](https://github.com/Nimbly-Technologies/audit-admin/pull/2933), [#2953](https://github.com/Nimbly-Technologies/audit-admin/pull/2953)

### In Progress
`audit-lite` questionnaire infinite render-loop follow-up remained open on `fix/questionnaire-infinite-render-loops`; `audit-lite` iPad UI fixes were started under PR [#1545](https://github.com/Nimbly-Technologies/audit-lite/pull/1545); `nimbly-web-api` report download timeout work was still in review under PR [#384](https://github.com/Nimbly-Technologies/nimbly-web-api/pull/384); flaky `QuestionnaireQuestionTag` test skipping in `audit-admin` needs a proper root-cause fix.