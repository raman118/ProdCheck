# M3 — Data, quality checks, and scorer

## Checklist

- [x] Parse bounded lockfile dependency/version summaries without retaining lockfile text.
- [x] Implement DATA-001 through DATA-004 as separate pure checks.
- [x] Implement OBS-001 and QUA-001 through QUA-004 as separate pure checks.
- [x] Add an OSV batch client with strict host/time/size limits and deterministic offline fallback data.
- [x] Implement versioned deterministic scoring and category breakdown.
- [x] Add six hand-built fixture repos and golden tests asserting exact findings and scores.
- [x] Update the check catalog, scoring, architecture, security, quality, and debt docs.
- [x] Run `pnpm verify` and update the goal.
- [x] Commit M3 (`2429494`).

## Decision log

- 2026-10-06: Keep all detection functions pure. Dependency parsing and advisory lookup happen before checks and are passed through check context.
- 2026-10-06: Use descending per-check diminishing multipliers `1, 0.5, 0.25, 0.125, ...`; cap category deductions at Security 40, Data 35, Reliability 30, Observability 20, Quality 20.
- 2026-10-06: Sort findings deterministically by severity, check id, path, and line before score/report output; round final score to the nearest integer.
- 2026-10-06: Keep OSV network calls outside the check. On offline failure use a small checked-in advisory fixture and mark lookup status so reports can explain the fallback.

## Verification

- `pnpm verify`: passed. Typecheck includes scripts, ESLint, dependency-cruiser (69 modules, no violations), unit tests (76), golden tests (7), and all package builds including Next.js production build passed.
- Six repository snapshots lock exact finding ids and scores: clean-production 100, vulnerable-nextjs-supabase 84, missing-auth 51, leaky-secrets 41, open-rls 63, mixed 0.
- The Next.js build has the previously recorded ESLint-plugin notice; it does not fail verification.
