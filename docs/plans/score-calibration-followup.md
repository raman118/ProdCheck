# Score calibration follow-up

## Findings from public repository review

- [x] QUA-004 does not penalize a ranged manifest dependency when parsed lockfile data resolves that package to an exact version.
- [x] QUA-001 recognizes conventional `test`, `tests`, and `spec` directories.
- [x] SEC-001 recognizes Stripe webhook signature verification; REL-002 accepts a raw Stripe body after signature verification.
- [x] SEC-002 treats a committed dotenv file as a high-severity exposure risk. Recognized live credential formats remain critical.
- [x] DATA-002 keeps unconditional policies on private tables critical and treats read-only policies on conventionally named public catalogs as low-severity review items.

These changes are based on scans of `vercel/nextjs-subscription-payments`, `ixartz/Next-js-Boilerplate`, and `expressjs/express`. Public repositories can contain stale dependencies or archived demos, so their overall scores are not universal production-readiness labels. The scanner still needs representative app benchmarks and manual confirmation of context-sensitive findings.

The scores before these changes were 20, 32, and 76 respectively. The rescans returned 53, 42, and 80. The Vercel sample still has 81 OSV findings, and the boilerplate has 75; those scores remain low because of dependency advisories and other unresolved checks. Online advisory data can change between scans.

## Verification

- `pnpm verify`: passed (typecheck, lint, architecture, 112 unit tests, 7 golden tests, and production builds).
- `pnpm test:e2e`: passed (1 Playwright scan flow).
