# M2 — Security and reliability checks

## Checklist

- [x] Add Zod finding schema and pure check/context contracts in shared/scanner.
- [x] Implement SEC-001 through SEC-006 as separate pure checks.
- [x] Implement REL-001 through REL-004 as separate pure checks.
- [x] Use AST parsing for route handlers and dangerous JavaScript patterns.
- [x] Add co-located tests and `missing-auth` / `leaky-secrets` fixture repos.
- [x] Document detection scope, fix template IDs, and false-positive limits.
- [x] Run `pnpm verify` and update quality/debt/goal docs.
- [x] Commit M2 (`6b13226`).

## Decision log

- 2026-10-06: Store finding Zod schema in `packages/shared`; importing external Zod is allowed while shared remains free of workspace dependencies.
- 2026-10-06: Keep checks independently callable and deterministic. The pipeline runner and scoring are deferred to M3.
- 2026-10-06: Use `ts-morph` to parse targeted route and JavaScript/TypeScript files in memory; parse no repository code by execution.
- 2026-10-06: Use explicit heuristics for framework route locations and common auth/validation wrappers; catalog false-positive notes describe proxy and shared middleware gaps.

## Verification

- `pnpm verify`: passed. Typecheck, ESLint, dependency-cruiser (40 modules, no violations), unit tests (44), golden scaffold test (1), and all package builds including Next.js production build passed.
- The Next.js build continues to print the known non-blocking ESLint-plugin notice recorded in `docs/TECH_DEBT.md`.
