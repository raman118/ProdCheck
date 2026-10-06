# M1 — Snapshot fetcher and stack detector

## Checklist

- [x] Define strict public GitHub URL parsing and snapshot contracts.
- [x] Fetch repository metadata and tarball through GitHub hosts only, with deadlines and byte caps.
- [x] Parse bounded gzip tar archives into a virtual snapshot, rejecting unsafe paths and limiting file count.
- [x] Detect Node, Next.js, React, and Supabase deterministically from manifests and file paths.
- [x] Add URL, archive, cap, and stack detector unit tests.
- [x] Run `pnpm verify`, update docs and debt, and commit the milestone.

## Decision log

- 2026-10-06: Use the GitHub REST repository and commit endpoints to resolve the default branch and immutable commit SHA before requesting the tarball.
- 2026-10-06: Parse gzip tar headers in the scanner without extracting to disk or executing repository content; reject unsupported archive extensions rather than trusting their metadata.
- 2026-10-06: Apply the 50 MB limit to both compressed archive input and expanded tar bytes, plus the 5,000 regular-file cap.
- 2026-10-06: Record lockfile paths in metadata and omit full lockfile text from the snapshot; vulnerability checks will consume only bounded parsed package/version data.
- 2026-10-06: Detect package manifests recursively to support apps in workspaces.

## Verification

- `pnpm verify`: passed. Typecheck, ESLint, dependency-cruiser (14 modules, no violations), unit tests (21), golden test (1), and all package builds including Next.js production build passed.
- GitHub transport tests use an injected fetch implementation to verify metadata/commit resolution, redirect host enforcement, token stripping across hosts, and download caps without relying on a live network.
