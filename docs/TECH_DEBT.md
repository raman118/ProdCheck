# Technical debt

- M2 auth and rate-limit markers are text heuristics; global middleware, wrappers, or comments can cause false positives or false negatives.
- M2's SQL interpolation check is line-based, and sanitizer flow is local to one file. Replace heuristic gaps only when additional syntax support has meaningful fixtures.
- Security header detection scans repository config only and can warn when a CDN or hosting dashboard supplies headers externally.
- M3 SQL migration/index checks use bounded regex parsing; composite indexes, complex joins, and dynamic query construction need more fixtures before broader claims.
- M3 OSV offline fallback contains one known fixture advisory and is not a substitute for a successful online lookup.
- M3 lockfile adapters support common npm, pnpm, Yarn, and Bun text formats; binary Bun lockfiles are presence-only until a safe parser is added.
- M4 fix templates cover only recognized CORS syntax, plain-object Next config, clear owner-column RLS, Next app/pages health routes, and exact pins backed by parsed lockfiles. Existing config helpers/custom headers and app-specific auth/validation require human edits; `validated` proves patch mechanics and syntax, not runtime behavior.
- M5's global setup precompiles the dynamic result route before the mocked Playwright test because Next dev compiles dynamic routes on first request; production build routes are unaffected.
- M6 Postgres connections are capped at five per server process but still need deployment validation against the chosen Supabase pooler. SQLite is for local use only; production refuses to start persistence without `DATABASE_URL`.
- M6 schema bootstrap is an embedded idempotent version-1 migration. Future schema changes need explicit forward migrations and a tested rollback/backup procedure.
- SEC-002 and the global report redactor cover known formats, entropy-qualified assignments, and common credential names; novel secret formats may still escape detection.
- Database-backed rate limiting is shared across instances using the same `DATABASE_URL`, but Vercel proxy header trust and Supabase connection-pool behavior need deployment validation.
- LLM rewrites only explanations; patch wording remains deterministic templates. Optional provider latency is capped at three seconds and errors fall back to templates.
- Benchmark results currently cover two public repositories; benchmark percentages are not representative until the editable URL list is expanded.
- Next.js 15's build-time lint detector does not recognize the repository's ESLint flat-config plugin registration and prints an informational warning. The Next recommended plugin rules are loaded directly by `eslint.config.js` and run cleanly in `pnpm lint`.
