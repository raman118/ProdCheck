import { describe, expect, it } from "vitest";
import { ScanProgressSchema, ScanRequestSchema } from "./scan";

describe("scan API schemas", () => {
  it("accepts only the explicit bounded scan request object", () => {
    expect(
      ScanRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
      }).success,
    ).toBe(true);
    expect(
      ScanRequestSchema.safeParse({ repositoryUrl: "x".repeat(2_001) }).success,
    ).toBe(false);
    expect(
      ScanRequestSchema.safeParse({
        repositoryUrl: "https://github.com/owner/repo",
        token: "secret",
      }).success,
    ).toBe(false);
  });

  it("validates progress payloads before they enter the SSE stream", () => {
    expect(
      ScanProgressSchema.safeParse({
        stage: "checking",
        message: "Checking",
        checkId: "SEC-001",
        current: 1,
        total: 19,
        progress: 30,
      }).success,
    ).toBe(true);
    expect(
      ScanProgressSchema.safeParse({
        stage: "checking",
        message: "Checking",
        checkId: "SEC-001",
        current: 0,
        total: 19,
        progress: 30,
      }).success,
    ).toBe(false);
  });
});
