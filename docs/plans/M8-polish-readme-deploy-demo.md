# M8 — Polish, README, deployment, and demo

## Checklist

- [x] Write resume-grade README with product pitch, image placeholders, Mermaid architecture, deterministic-vs-LLM boundary, check table, scoring, setup, benchmark, limits, and roadmap.
- [x] Add Vercel app configuration for the scan function duration and document monorepo root/source settings.
- [x] Add `.env.example` and confirm local app startup works without secrets.
- [x] Add a one-command local demo script with clear sample flow and stop instructions.
- [x] Review and repair user-visible empty, loading, error, small-screen, keyboard, and reduced-motion states.
- [x] Keep AGENTS.md under 100 lines and make commands and doc pointers accurate.
- [x] Run `pnpm verify`, e2e, benchmark, and a no-secrets local startup smoke test.
- [x] Update goal, quality/debt/docs as needed.

## Decision log

- 2026-10-06: Configure Vercel with `apps/web` as the project root and require the platform's include-source-outside-root option because `packages/scanner` and `packages/shared` are workspace dependencies.
- 2026-10-06: Use one demo command that starts the real local app; the URL list and mocked e2e fixture remain separate benchmark/test inputs.
- 2026-10-06: Register the Next.js recommended ESLint rules directly in flat config. The Next 15 build-time detector still emits its informational warning because it only recognizes legacy config metadata.

## Verification

- `pnpm install --frozen-lockfile`: passed.
- `pnpm verify`: passed; 99 modules / 177 dependency edges, 103 unit tests, 7 golden tests, all package builds. Next 15 still emits its informational plugin detector warning; Next rules run under ESLint.
- `pnpm test:e2e`: passed in Chromium.
- `pnpm benchmark`: passed on two public repositories; median 5.37 seconds, 22/22 displayed patches validated.
- `pnpm demo` with optional credentials and `DATABASE_URL` cleared: served the landing page with HTTP 200.
- Live `POST /api/scan` through the local app against the public Next.js + Supabase sample: HTTP 200, score 20, 119 findings, 21 verified fixes; completed in about 12 seconds including dev-server compilation.
- M8 commit: `5053e05`.
