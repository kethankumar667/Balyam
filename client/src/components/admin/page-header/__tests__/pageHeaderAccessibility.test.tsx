import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PageHeader from "../index";

function renderHeader(props: Partial<React.ComponentProps<typeof PageHeader>> = {}) {
  return render(
    <BrowserRouter>
      <PageHeader title="Command Center Overview" {...props} />
    </BrowserRouter>,
  );
}

describe("PageHeader — route focus management (Phase 2 §4)", () => {
  it("regression: focus moves to the page heading on mount — each /admin/* route is its own top-level route, so mounting this component IS a navigation event; without this, focus stays on whatever sidebar link was clicked", async () => {
    renderHeader();
    const heading = screen.getByRole("heading", { level: 1, name: "Command Center Overview" });
    await waitFor(() => {
      expect(document.activeElement).toBe(heading);
    });
  });

  it("the heading is programmatically focusable (tabIndex=-1) without being a normal Tab stop", () => {
    renderHeader();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.getAttribute("tabindex")).toBe("-1");
  });

  it("regression: a visible focus ring is present on the heading — 'no outline suppression' means focus:outline-none must pair with a focus-visible replacement", () => {
    renderHeader();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.className).toContain("focus-visible:ring-2");
  });
});

describe("PageHeader — breadcrumb accessibility (Phase 2 §5)", () => {
  it("regression: the current page's breadcrumb has aria-current=page — previously no crumb, including the last one, was ever marked current", () => {
    renderHeader({
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Feature Flags" }],
    });
    const current = screen.getByText("Feature Flags");
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("non-current crumbs are not marked aria-current", () => {
    renderHeader({
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Feature Flags" }],
    });
    const parent = screen.getByText("Admin");
    expect(parent.getAttribute("aria-current")).toBeNull();
  });

  it("breadcrumb links with an href render as real, keyboard-reachable <a> elements", () => {
    renderHeader({
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Feature Flags" }],
    });
    const link = screen.getByRole("link", { name: "Admin" });
    expect(link.getAttribute("href")).toBe("/admin");
  });
});
