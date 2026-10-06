# M6 — Persistence, history, badge, and exports

## Checklist

- [x] Define the storage interface and Drizzle schema for immutable report versions keyed by owner/repo/commit SHA.
- [x] Implement local SQLite and production Postgres/Supabase adapters selected by environment configuration.
- [x] Persist completed scans and load reports by public owner/repo/commit route, including after a fresh browser session.
- [x] Add repository scan history and a deterministic "+N since previous scan" summary.
- [x] Add an SVG badge endpoint with correct content type, caching, and escaped values.
- [x] Keep JSON and Markdown exports available from public reports and add tests for stored serialization.
- [x] Test both adapters, schema bootstrap, cache lookup, history ordering/diff, and badge output.
- [x] Update architecture/security/quality/debt docs and local run guidance.
- [x] Run `pnpm verify` and e2e.
- [x] Update goal and commit M6 (feature commit `f3f7da5`, documentation follow-up `a2388e2`).

## Decision log

- 2026-10-06: Use Drizzle for both backends behind one `ScanStore`; local mode uses a file-backed SQLite database, production mode uses `DATABASE_URL` with Postgres/Supabase.
- 2026-10-06: Keep scan records immutable per commit and return the newest scan first for repository history.
- 2026-10-06: Compute new finding count by exact stable finding id comparison with the immediately previous scan for the same repository.
- 2026-10-06: Render the score badge as standalone escaped SVG with a conservative public cache lifetime.
- 2026-10-06: Bootstrap schema version 1 idempotently from each adapter at first use, so `pnpm dev` needs no separate database setup. Keep DDL portable and test both dialects against local engines.

## Verification

- `pnpm verify`: passed. Typecheck, ESLint, dependency-cruiser (93 modules, no violations), 90 unit tests, 7 golden tests, and all package builds passed. The existing Next ESLint-plugin notice remains.
- `pnpm test:e2e`: passed in Chromium. A real fixture-derived report is seeded in local SQLite; the mocked scan result then opens from a fresh browser context and the SVG badge returns the stored score.
