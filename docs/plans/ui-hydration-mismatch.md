# UI hydration mismatch fix

## Decision

Keep reveal components' server HTML and first browser render identical by rendering them with `initial={false}` and enabling `whileInView` only after hydration. Apply the browser's reduced-motion preference to the post-hydration transition duration. This preserves the progressive reveal while avoiding server/client style differences.

## Verification

- Playwright captures browser console errors on the landing page and fails on hydration warnings.
- `pnpm test:e2e`: passed.
- `pnpm verify`: passed, including typecheck, lint, architecture, unit and golden tests, and production build.
