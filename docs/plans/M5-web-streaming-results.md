# M5 — Web UI, streaming scan, and results

## Checklist

- [x] Define shared scan request/progress/result schemas and a deterministic scanner orchestration function.
- [x] Add a strict public GitHub URL scan API with IP rate limiting and server-sent progress events.
- [x] Build a responsive accessible landing page with URL entry, examples, dark mode, and clear product explanation.
- [x] Build results UI with score gauge/band, category breakdown, severity-sorted findings, evidence, and verified diff view/copy/download.
- [x] Add Markdown and JSON report export from scan results.
- [x] Add mocked component/API tests and Playwright e2e for submitting a fixture, seeing score, and inspecting a fix.
- [x] Update architecture/security/quality/debt docs for delivered web behavior.
- [x] Run `pnpm verify` and e2e.
- [x] Update goal and commit M5.

## Decision log

- 2026-10-06: Use the Web Streams API for SSE so streaming does not require a third-party framework dependency.
- 2026-10-06: Keep scan orchestration server-only and pass progress callbacks through bounded snapshot fetch, stack detection, checks, fix validation, and scoring.
- 2026-10-06: Use a local in-memory IP window limiter for the first web milestone; M7 will add deployment-aware abuse hardening.
- 2026-10-06: Render patch text as escaped text and use validated unified diffs; React text nodes render scanned content without HTML injection.
- 2026-10-06: Keep result records in session storage for this milestone. Durable public report lookup is M6's persistence responsibility.

## Verification

- `pnpm verify`: passed after M5 implementation; final run is recorded at commit time.
- `pnpm test:e2e`: passed in Chromium. It computes a report from the `missing-auth` fixture, mocks the SSE transport, and verifies the score and validated Next health-route patch.
- `pnpm verify`: typecheck, ESLint, dependency-cruiser (83 modules, no violations), 86 unit tests, 7 golden tests, and all three workspace builds passed. The only warning is the existing Next ESLint-plugin notice.
