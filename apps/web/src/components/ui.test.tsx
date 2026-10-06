// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./ui";
import { ReportView } from "./scan-app";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const report = {
  repo: { owner: "acme", name: "store", commitSha: "a".repeat(40) },
  scannedAt: "2026-10-06T00:00:00.000Z",
  stack: {
    node: true,
    frameworks: ["nextjs"],
    supabase: true,
    packageManager: "pnpm",
    packageCount: 12,
    malformedPackageJson: false,
  },
  score: 82,
  scoreVersion: 1,
  scoreBand: "Good",
  categoryBreakdown: [
    "security",
    "data",
    "reliability",
    "observability",
    "quality",
  ].map((category) => ({
    category,
    score: 82,
    deduction: 18,
    cap: 40,
    findingCount: category === "security" ? 1 : 0,
    severityCounts: {
      critical: 0,
      high: category === "security" ? 1 : 0,
      medium: 0,
      low: 0,
      info: 0,
    },
  })),
  findings: [
    {
      id: "SEC-004:app/api/data/route.ts:2",
      checkId: "SEC-004",
      severity: "high",
      category: "security",
      title: "CORS accepts every origin",
      explanation: "Restrict access to origins that need this API.",
      evidence: [
        {
          file: "app/api/data/route.ts",
          lineStart: 2,
          lineEnd: 2,
          snippet: "origin: *",
        },
      ],
      fix: {
        description: "Use the configured origin.",
        patch: "+origin: process.env.APP_ORIGIN",
        validated: true,
      },
      confidence: 0.9,
    },
  ],
  osvStatus: "skipped",
} as const;

describe("shared UI button", () => {
  it("keeps its accessible label and disabled state", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Start scan</Button>);
    const button = screen.getByRole("button", { name: "Start scan" });
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("renders an accessible score summary and verified finding fix", async () => {
    render(<ReportView report={report as never} />);
    expect(screen.getByRole("heading", { name: "acme/store" })).toBeTruthy();
    expect(
      screen.getByRole("img", { name: /82 out of 100, Good/ }),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: /Show fix.*Verified/ }),
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Patch for CORS accepts every origin")
          .textContent,
      ).toContain("APP_ORIGIN"),
    );
    expect(screen.getByText("commit pinned")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("button", { name: "Markdown report" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "JSON report" })).toBeTruthy();
  });
});
