# ProdCheck project goal

Build the complete production-grade app described in the project brief. The active work is tracked by milestone plans under `docs/plans/`; finish and commit each milestone, then continue to the next without waiting for a separate prompt.

## Definition of done

- [x] M0–M8 complete and committed; `pnpm verify` passes.
- [x] All SEC, DATA, REL, OBS, and QUA checks are documented and implemented with deterministic findings, scores, and validated fixes.
- [x] The Next.js app supports strict GitHub URL input, streaming progress, results, diffs, exports, responsive accessible dark mode, history, badges, and persistence.
- [x] Security limits, archive protections, rate limits, secret redaction, timeouts, and no-execution boundary are implemented and tested.
- [x] E2E passes; benchmark runs end to end.
- [x] `pnpm dev` runs without secrets; a real public Next.js + Supabase repo scans in under 60 seconds and has at least one verified fix.
- [x] Docs describe current behavior, gaps, decisions, and deployment.

## Milestones

- [x] M0 harness and scaffolding — commit `23a2856`.
- [x] M1 snapshot fetcher and stack detector — commit `2651793`.
- [x] M2 SEC and REL checks — commit `6b13226`.
- [x] M3 DATA, OBS, QUA checks and scorer — commit `2429494`.
- [x] M4 fix generator and validator — commit `674b647`.
- [x] M5 web UI with streaming and results — commit `bd85dee`.
- [x] M6 persistence, history, badge, and exports — commit `f3f7da5`.
- [x] M7 security hardening, benchmark, and optional LLM layer — commit `8d4f25d`.
- [x] M8 polish, README, deploy config, and demo script — commit `5053e05`.

All milestones are complete. The final implementation and acceptance evidence are recorded in `docs/plans/`.
