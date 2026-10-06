# Web design overhaul

## Checklist

- [x] Define shared color, type, spacing, radius, shadow, glow, and motion tokens; load a local-safe font through `next/font`.
- [x] Rebuild the landing page with the responsive sticky header, validated scan form, product preview, benchmark proof, how-it-works, check catalog, deterministic-versus-AI explainer, interactive sample report, FAQ, final CTA, and product footer.
- [x] Refine the live results page with a sticky repository summary, score overview, category scores, finding navigation, evidence, and verified patch actions while preserving scan/history/export behavior.
- [x] Add or update focused UI tests for input validation, example scan actions, sample report tabs, FAQ, and result interactions.
- [x] Update `docs/QUALITY.md` with the web module grade, current state, and remaining design gaps.
- [x] Run `pnpm verify` after each implementation step; run e2e after the redesign and resolve failures before completion.

## Decision log

- 2026-10-06: Keep all presentation work inside `apps/web`; scanner checks, deterministic findings, scoring, and patch validation stay unchanged.
- 2026-10-06: Use CSS variables in `globals.css` as the source of truth and expose them to Tailwind v4 with `@theme inline`.
- 2026-10-06: Prefer inline Lucide-style SVG icons and CSS transitions over adding runtime animation/icon packages. Use IntersectionObserver for lightweight reveal motion and honor `prefers-reduced-motion`.
- 2026-10-06: Build preview and sample-report content from the checked-in `missing-auth` fixture report so visible proof reflects actual scanner output.
- 2026-10-06: Read benchmark proof from the generated benchmark JSON where possible and use the documented benchmark seed only when that artifact is unavailable.
- 2026-10-06: The supplied results-page requirements end mid-sentence after “Hero card: large”; infer the rest from existing result behavior and the shared visual system, preserving all current result actions.
- 2026-10-06: The persisted report has no branch-name field. Keep report identity pinned to the canonical commit SHA and show that exact state rather than deriving a possibly incorrect branch label; record branch metadata as a future schema gap.
- 2026-10-06: No Git remote is configured in this checkout, so the GitHub affordance points to GitHub itself. Replace it with the canonical project URL when publishing.

## Verification log

- 2026-10-06: Baseline `pnpm verify` passed before UI changes (103 unit tests, 7 golden tests, architecture checks, and production build).
- 2026-10-06: Visual-token setup passed `pnpm verify` (103 unit tests, 7 golden tests, architecture checks, and production build).
- 2026-10-06: Landing-page implementation passed `pnpm verify` after replacing the unavailable Lucide brand export with a small GitHub mark and removing unused imports (103 unit tests, 7 golden tests, 101 modules / 180 dependency edges, production build).
- 2026-10-06: Results redesign, fixture-backed sample report, interactive controls, and UI tests passed `pnpm verify` (107 unit tests, 7 golden tests, 103 modules / 182 dependency edges, production build).
- 2026-10-06: `pnpm test:e2e` passed in Chromium after using an absolute URL for the isolated browser-context badge request.
- 2026-10-06: Final production capture review found and fixed initially transparent scroll-reveal sections; no-scroll screenshots now retain complete content. Final verification pending after this polish pass.
- 2026-10-06: Final `pnpm test:e2e` passed in Chromium after stopping stale local Next servers so Playwright could own its test server.
- 2026-10-06: Final `pnpm verify` passed after capture-safe motion and fixture-report refinements: 107 unit tests, 7 golden tests, 104 modules / 183 dependency edges, and optimized Next production build.
