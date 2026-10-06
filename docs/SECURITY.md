# Security and abuse controls

- Parse only `github.com/{owner}/{repo}` and optional `/tree/{branch}` URLs. Resolve archive URLs from GitHub API responses; never accept arbitrary hosts, IP literals, redirects to untrusted hosts, or user-controlled fetch targets.
- Fetch archives into memory with a 50 MB compressed and expanded budget, 5,000 file cap, path traversal checks, decompression limits, and a 45-second whole-scan deadline.
- Skip `node_modules`, build output, binaries, and unnecessary lockfile content. Never execute scanned code.
- Apply an atomic SQLite/Postgres limit of five scan requests per HMAC-fingerprinted IP per ten minutes, cap request bodies at 4 KiB and each body read at five seconds, and time-bound GitHub and OSV requests. `RATE_LIMIT_SECRET` is preferred as the HMAC key; production may use `DATABASE_URL` when it is not configured.
- GitHub archive redirects are followed manually and only to `api.github.com`, `github.com`, or `codeload.github.com`; OSV requests use the fixed `api.osv.dev` endpoint with a 5-second deadline, 500-package batches, and a 2 MB response cap.
- SEC-002 masks detected secret values, showing at most the first four characters. A global report pass redacts evidence, titles, and explanations before persistence and again when reports are loaded/exported. If redaction would alter a patch, that patch is omitted.
- `POST /api/scan` applies a 45-second scanner deadline, a five-second body-read deadline, and aborts outbound requests when the client disconnects. Public errors map to fixed safe messages.
- Vercel configuration gives the scan function a 60-second platform ceiling; configure `apps/web` as the project root and include workspace source files outside that root.
- Optional explanation rewriting is disabled by default and requires `PRODCHECK_LLM_ENABLED=true` plus an OpenAI or Anthropic key. The request contains finding metadata only, has a three-second deadline, validates bounded response text and known finding IDs, and never changes findings, score, or patches.
- Treat archive names, file contents, and LLM responses as untrusted input. Validate all generated patches before display or download.
- Require `DATABASE_URL` in production; report lookups are parameterized and loaded JSON is parsed against the shared report schema. Badge SVG contains a validated numeric score and fixed text, with `nosniff` and short shared-cache headers.

Implementation and abuse tests are introduced in the relevant milestones; missing controls belong in `docs/TECH_DEBT.md` until complete.
