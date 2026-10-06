# Local demo

Run this from the repository root:

```sh
pnpm install
pnpm demo
```

Open `http://localhost:3000`, choose the `vercel/nextjs-subscription-payments` example, and start a scan. The scan resolves a public GitHub commit, streams progress, then opens the saved result with findings, category scores, history, and validated fixes. No keys or database setup are required; local scan history is kept in `.data/prodcheck.db`.

To stop the server, press `Ctrl+C` in the terminal running `pnpm demo`. For a deterministic, network-free UI walkthrough, run `pnpm test:e2e`; Playwright mocks the GitHub scan and opens a fixture report with a verified patch.
