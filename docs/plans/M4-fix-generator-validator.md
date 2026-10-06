# M4 — Fix generator and validator

## Checklist

- [x] Add deterministic templates for CORS, security headers, RLS, health route, and exact dependency pinning.
- [x] Generate unified diffs without executing or importing target repository code.
- [x] Validate patch size (32 KiB), allowed paths, five-file limit, clean application, TypeScript/JavaScript syntax, and no new network calls.
- [x] Attach fixes only after validation and set `validated: true` only on success.
- [x] Add positive and negative validator tests plus golden assertions for at least one verified fix.
- [x] Document supported templates, limitations, and fix validation rules.
- [x] Run `pnpm verify` and update debt/quality docs.
- [x] Commit M4.

## Decision log

- 2026-10-06: Use `jsdiff` unified patches and `ts-morph` syntax diagnostics; patches apply to in-memory text only.
- 2026-10-06: Allow edits only to known app config/route files, SQL migrations, package manifests, `.env.example`, and `.gitignore`, with strict traversal and count/size caps.
- 2026-10-06: Initial verified templates cover deterministic cases with enough repository context. Findings requiring provider-specific credentials or inferred business rules keep a missing fix rather than receive a misleading patch.
- 2026-10-06: Reject newly added executable network calls regardless of template; static URLs in header values are permitted.
- 2026-10-06: Keep templates selective where owner identity, route layout, lockfile version, or config shape cannot be inferred safely. A verified patch is mechanically safe to apply, not a proof of runtime correctness.

## Verification

- `pnpm verify`: passed. Typecheck, ESLint, dependency-cruiser (72 modules, no violations), 80 unit tests, 7 golden tests, and all package builds passed.
- The `missing-auth` golden fixture receives at least one verified health-route fix; focused tests cover CORS, owner-aware RLS, path traversal, patch mismatch, network-call rejection, and syntax rejection.
- The Next.js build retains the documented notice that its ESLint plugin is not detected.
