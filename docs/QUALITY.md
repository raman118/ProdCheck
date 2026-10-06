# Quality status

Grades describe delivered code and known gaps.

| Module             | Grade | Current state                                                                                                                    | Known gaps                                                                       |
| ------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/web`         | A-    | Production-ready responsive dark/light marketing and report UI, tokenized design system, fixture-backed preview/sample report, animated and accessible interactions, SSE, persistence, shared limits, redaction, history, badge, exports, Vercel config | The report schema keeps the immutable commit SHA but not the original branch label; add branch metadata in a future report-schema revision. Configure canonical repository/docs URLs when a project remote is chosen; validate Vercel Postgres pooler and proxy IP header behavior before deployment |
| `packages/scanner` | B     | Bounded snapshots, all 19 checks, OSV adapter, scorer, validated templates, optional bounded LLM explanations                    | Heuristic checks/templates are intentionally selective; LLM stays off by default |
| `packages/shared`  | B     | Zod finding, score, report/history, request, SSE progress, and global redaction helpers                                          | Redaction patterns cannot guarantee detection of every unknown secret format     |
| `scripts`          | B     | Six exact fixtures/golden tests, deterministic fixture-report generator, benchmark metrics tests, and a two-repository benchmark runner | Benchmark list is small and should be curated for representative samples         |
| CI                 | B     | GitHub Actions verification and Chromium Playwright e2e; Next rules are directly loaded by flat ESLint config                    | Next 15 build emits an informational flat-config detector warning                |

`pnpm verify` is the required local gate. The benchmark currently covers two repositories; see `benchmarks/urls.txt` and `benchmarks/results.md`.

The redesign uses Geist Sans/Mono via `next/font/local`, CSS custom properties mirrored into Tailwind v4 theme tokens, lucide-react icons, and Framer Motion with reduced-motion handling. The hero preview and sample finding are generated from the `missing-auth` and `mixed` scanner fixtures by `scripts/generate-demo-report.ts`; the proof strip reads `benchmarks/results.json` and retains seeded numbers for an empty benchmark artifact. The production build renders all sections visibly before scroll interaction so screenshots and no-script fallbacks do not depend on an IntersectionObserver firing.
