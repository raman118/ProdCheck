import { describe, expect, it } from "vitest";
import { lookupOsvAdvisories } from "./osv-client";
import type { LockedDependency } from "../snapshot/types";

const dependencies: LockedDependency[] = [
  { name: "sample", version: "1.0.0", lockfile: "package-lock.json" },
];

describe("lookupOsvAdvisories", () => {
  it("sends a bounded npm batch and normalizes online advisory data", async () => {
    let requestBody = "";
    const fetchMock = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://api.osv.dev/v1/querybatch");
      requestBody = String(init?.body);
      return Response.json({
        results: [
          {
            vulns: [
              {
                id: "GHSA-sample",
                summary: "Sample vulnerability",
                affected: [
                  {
                    ranges: [
                      { events: [{ introduced: "0" }, { fixed: "1.0.1" }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    }) as typeof fetch;
    const result = await lookupOsvAdvisories(dependencies, {
      fetchImpl: fetchMock,
    });
    expect(result.status).toBe("online");
    expect(result.advisories[0]).toMatchObject({
      id: "GHSA-sample",
      fixedVersion: "1.0.1",
    });
    expect(JSON.parse(requestBody).queries[0].package.ecosystem).toBe("npm");
  });

  it("uses the checked-in fallback fixture when OSV is unavailable", async () => {
    const fetchMock = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    const result = await lookupOsvAdvisories(
      [{ name: "lodash", version: "4.17.20", lockfile: "pnpm-lock.yaml" }],
      { fetchImpl: fetchMock },
    );
    expect(result.status).toBe("offline");
    expect(result.advisories[0]?.id).toBe("GHSA-35jh-r3h4-6jhm");
  });

  it("falls back after its deadline and skips empty dependency lists", async () => {
    const fetchMock = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      })) as typeof fetch;
    const timedOut = await lookupOsvAdvisories(
      [{ name: "lodash", version: "4.17.20", lockfile: "pnpm-lock.yaml" }],
      { fetchImpl: fetchMock, timeoutMs: 5 },
    );
    const empty = await lookupOsvAdvisories([], { fetchImpl: fetchMock });
    expect(timedOut.status).toBe("offline");
    expect(empty.status).toBe("skipped");
  });

  it("does not turn caller cancellation into an offline success", async () => {
    const controller = new AbortController();
    const fetchMock = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
        controller.abort();
      })) as typeof fetch;
    await expect(
      lookupOsvAdvisories(dependencies, {
        fetchImpl: fetchMock,
        signal: controller.signal,
      }),
    ).rejects.toThrow("Repository scan was canceled.");
  });
});
