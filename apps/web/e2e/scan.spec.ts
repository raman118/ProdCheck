import { expect, test } from "@playwright/test";
import { loadMissingAuthReport } from "./fixture-report";

test("scans a mocked fixture repository and opens its verified fix", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrated|hydration/i.test(message.text()))
      hydrationErrors.push(message.text());
  });

  const report = await loadMissingAuthReport();
  const healthFinding = report.findings.find(
    (finding) => finding.checkId === "REL-004" && finding.fix?.validated,
  );
  expect(healthFinding).toBeTruthy();

  await page.route("**/api/scan", async (route) => {
    const events = [
      {
        stage: "fetching",
        message: "Fetching fixture repository",
        progress: 5,
      },
      {
        stage: "detecting",
        message: "Detecting frameworks and services",
        progress: 25,
      },
      {
        stage: "complete",
        message: "Production scan complete",
        progress: 100,
        report,
      },
    ];
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: events
        .map((event) => `event: progress\ndata: ${JSON.stringify(event)}\n\n`)
        .join(""),
    });
  });

  await page.goto("/");
  await page
    .getByLabel("Public GitHub repository URL")
    .first()
    .fill("https://github.com/prodcheck-fixture/missing-auth");
  await page.getByRole("button", { name: "Scan repository" }).first().click();
  await expect(page).toHaveURL(/\/results\/prodcheck-fixture\/missing-auth\//);
  await expect(
    page.getByRole("heading", { name: "prodcheck-fixture/missing-auth" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: new RegExp(`${report.score} out of 100`) }),
  ).toBeVisible();
  await expect(page.getByText("commit pinned")).toBeVisible();
  await expect(page.getByRole("button", { name: "Re-scan" })).toBeVisible();
  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("button", { name: "Markdown report" })).toBeVisible();
  await page.getByRole("button", { name: "Export" }).click();
  const healthCard = page
    .locator(".finding")
    .filter({ hasText: healthFinding!.title });
  await healthCard.getByRole("button", { name: /Show fix.*Verified/ }).click();
  await expect(
    page.getByLabel(`Patch for ${healthFinding!.title}`),
  ).toContainText("+++ app/api/health/route.ts");
  const publicUrl = page.url();
  const browser = page.context().browser();
  if (!browser)
    throw new Error("Playwright browser context was not available.");
  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  await freshPage.goto(publicUrl);
  await expect(
    freshPage.getByRole("heading", { name: "prodcheck-fixture/missing-auth" }),
  ).toBeVisible();
  const badgeUrl = new URL(
    "/api/badge/prodcheck-fixture/missing-auth.svg",
    publicUrl,
  );
  const badge = await freshPage.request.get(badgeUrl.toString());
  expect(badge.headers()["content-type"]).toContain("image/svg+xml");
  expect(await badge.text()).toContain(`ProdCheck score ${report.score}/100`);
  await freshContext.close();
  expect(hydrationErrors).toEqual([]);
});
