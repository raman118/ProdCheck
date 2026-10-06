// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type FormEvent } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MarketingPage } from "./marketing-page";

beforeAll(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds: number[] = [];
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        void callback;
        void options;
      }
      disconnect() {}
      observe(target: Element) {
        void target;
      }
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
      unobserve(target: Element) {
        void target;
      }
    },
  );
});

afterEach(cleanup);

function renderPage() {
  const onChange = vi.fn();
  const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) =>
    event.preventDefault(),
  );
  const onStart = vi.fn();
  function ControlledPage() {
    const [url, setUrl] = useState("");
    return (
      <MarketingPage
        url={url}
        onChange={(value) => {
          onChange(value);
          setUrl(value);
        }}
        onSubmit={onSubmit}
        onStart={onStart}
        busy={false}
        error=""
        light={false}
        onThemeToggle={vi.fn()}
      />
    );
  }
  render(
    <ControlledPage />,
  );
  return { onChange, onSubmit, onStart };
}

describe("marketing page", () => {
  it("starts a scan when a seeded example is selected", async () => {
    const user = userEvent.setup();
    const { onChange, onStart } = renderPage();
    await user.click(
      screen.getByRole("button", {
        name: "vercel/nextjs-subscription-payments",
      }),
    );
    expect(onChange).toHaveBeenCalledWith(
      "https://github.com/vercel/nextjs-subscription-payments",
    );
    expect(onStart).toHaveBeenCalledWith(
      "https://github.com/vercel/nextjs-subscription-payments",
    );
  });

  it("shows an inline error for non-GitHub URLs", async () => {
    const user = userEvent.setup();
    renderPage();
    const inputs = screen.getAllByLabelText("Public GitHub repository URL");
    await user.type(inputs[0]!, "https://example.com/owner/repo");
    expect(
      screen.getAllByText(/public github\.com\/owner\/repo URL/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Scan repository" })[0]?.hasAttribute("disabled"),
    ).toBe(true);
  });

  it("renders the fixture report tabs and full check catalog", async () => {
    const user = userEvent.setup();
    renderPage();
    const sample = screen.getByRole("tablist", {
      name: "Sample finding details",
    }).parentElement!;
    await user.click(within(sample).getByRole("tab", { name: "Evidence" }));
    await waitFor(() =>
      expect(within(sample).getByRole("tabpanel").textContent).toMatch(
        /package\.json/,
      ),
    );
    expect(screen.getAllByText("19 checks · 5 categories").length).toBe(2);
    expect(screen.getByText("SEC-006")).not.toBeNull();
  });

  it("exposes an accessible FAQ answer when expanded", async () => {
    const user = userEvent.setup();
    renderPage();
    const question = screen.getAllByText("Does ProdCheck execute my code?")[0]!;
    await user.click(question);
    expect(
      screen.getByText(/never installs dependencies or runs repository code/)
        .textContent,
    ).toMatch(/never installs dependencies or runs repository code/);
  });
});
