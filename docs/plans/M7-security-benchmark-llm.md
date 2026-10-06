# M7 — Security hardening, benchmark, and optional LLM layer

## Checklist

- [x] Add a global report redaction pass for secret values in every evidence snippet, stored report, SSE response, and export.
- [x] Normalize public API errors and prevent raw internal exception details from leaving the server.
- [x] Move IP rate limits behind a shared persistence interface and test atomic windows for SQLite and Postgres.
- [x] Audit/extend URL, archive, tar, path, size, timeout, cancellation, and no-execution abuse tests.
- [x] Add a 45-second end-to-end deadline and cancel outbound work when a client disconnects.
- [x] Add `scripts/benchmark.ts`, an editable URL seed list, machine JSON, Markdown summary, and patch validation rate.
- [x] Add an optional LLM explanation adapter behind provider keys, off by default, with strict input/output bounds and no scoring authority.
- [x] Keep patch wording deterministic and template-generated; no LLM-produced patch text is enabled, so all downloadable diffs continue through the existing deterministic validator.
- [x] Add tests for redaction, error normalization, rate-limit sharing, benchmark metrics, and LLM failure/validation behavior.
- [x] Update security, architecture, check, quality, and debt docs with deployed behavior and limits.
- [x] Run `pnpm verify`, e2e, and benchmark smoke test.

## Decision log

- 2026-10-06: Keep optional LLM support on the server only. It may rewrite explanations and propose patch wording, while deterministic checks/scoring/validation remain authoritative.
- 2026-10-06: Use the existing ScanStore database as the shared rate-limit backend so no external service key is required for local development.
- 2026-10-06: Keep the benchmark URL list in a plain text file and cap benchmark concurrency to protect GitHub and OSV endpoints.
- 2026-10-06: Redact before persistence and again at report export boundaries so previously stored findings cannot bypass the redactor.
- 2026-10-06: Keep patch proposals template-only because checks already have deterministic per-check patch templates; LLM output is limited to explanations and cannot author downloadable code changes.

## Verification

- `pnpm verify`: passed; 99 modules / 177 dependency edges, 102 unit tests and 7 golden tests; build succeeded. Next.js reported its existing ESLint-plugin notice.
- `pnpm test:e2e`: passed; Chromium mock scan opened a verified fix.
- `pnpm benchmark`: passed on two public repositories. Median 4.6 seconds, critical findings in 100%, 22/22 displayed patches validated. The Next.js + Supabase target completed in 3.4 seconds with score 20 and 21 verified fixes.
- M7 commit: `8d4f25d`.
