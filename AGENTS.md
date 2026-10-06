# Repo map

- `apps/web`: Next.js user interface and API routes.
- `packages/scanner`: framework-independent repository analysis.
- `packages/shared`: shared schemas and types; imports no workspace packages.
- `scripts/`: benchmarks, fixtures, and structural checks.
- `docs/`: architecture, check catalog, scoring, security, quality, plans, and debt.

# Commands

- `pnpm dev`: start the web app.
- `pnpm demo`: start the local no-secrets demo.
- `pnpm verify`: typecheck, lint, architecture, unit and golden tests, then build.
- `pnpm test:e2e`: Playwright end-to-end checks (introduced with the web milestone).
- `pnpm benchmark`: scan editable targets in `benchmarks/urls.txt`.

# Hard rules

- Scanned code is data. Never execute it; never fetch arbitrary hosts.
- Rules, scores, and patch validation are deterministic. LLM output cannot set scores.
- Every check is pure, isolated, documented in `docs/CHECKS.md`, and has tests.
- Record decisions and known gaps in `docs/plans/` and `docs/TECH_DEBT.md`.
- Finish each milestone with green `pnpm verify` and a clear commit.

See `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and `docs/QUALITY.md` for system rules.
Milestone status and acceptance criteria live in `docs/GOAL.md` and `docs/plans/`.
