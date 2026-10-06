# M0 — Harness and scaffolding

## Checklist

- [x] Create root map, workspace packages, and build/typecheck/lint/architecture/test commands.
- [x] Establish the system-of-record docs and milestone plan.
- [x] Add dependency-cruiser boundaries with actionable errors.
- [x] Add a minimal Next.js App Router shell and CI verification workflow.
- [x] Run `pnpm verify` and fix failures.
- [x] Commit the milestone.

## Decision log

- 2026-10-06: Interpret “shared imports nothing” as no workspace-package imports. Shared schemas may use external Zod in a later milestone; a zero-dependency shared package would conflict with the required Zod schemas.
- 2026-10-06: Keep exact scoring caps for M3 so they can be fixed by golden tests alongside the scorer.
- 2026-10-06: Start with a minimal Next.js shell so the required build gate exercises the web package from M0.
- 2026-10-06: Approve only esbuild's install build script in workspace settings; pnpm 11 blocks unapproved dependency scripts by default.
- 2026-10-06: Architecture checks target workspace packages, while shared can import its own local modules and external dependencies.

## Verification

- `pnpm verify`: passed. Typecheck, ESLint, dependency-cruiser (5 modules, no violations), unit test (1), golden scaffold test (1), and all three package builds including Next.js production build completed successfully.
- Next.js added `lib` and `isolatedModules` to the web TypeScript config during its first production build; strict mode remains inherited from the root config.
