import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import {
  createSqliteClient,
  createSqliteScanStore,
} from "../src/lib/db/sqlite-store";
import { loadMissingAuthReport } from "./fixture-report";

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseUrl = config.projects[0]?.use.baseURL as string | undefined;
  if (!baseUrl) throw new Error("Playwright baseURL must be configured.");
  await mkdir(resolve(process.cwd(), "../../.data"), { recursive: true });
  const store = await createSqliteScanStore(
    createSqliteClient("file:../../.data/prodcheck.db"),
  );
  await store.saveReport(await loadMissingAuthReport());
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(baseUrl);
  await page.goto(`${baseUrl}/results/setup/repo/${"a".repeat(40)}`);
  await page
    .getByRole("heading", { name: /not cached in this browser/ })
    .waitFor();
  await browser.close();
}
