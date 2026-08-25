import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import AdminComponentLibraryPage from "../component-library";

function renderPage() {
  return render(
    <BrowserRouter>
      <AdminComponentLibraryPage />
    </BrowserRouter>
  );
}

describe("Admin Component Showcase Page (/admin/component-library)", () => {
  it("renders page header, dev harness badge, and mock data disclosure banner", () => {
    renderPage();
    expect(screen.getByText("Admin Component Showcase")).toBeDefined();
    expect(screen.getByText("Dev & QA Harness")).toBeDefined();
    expect(screen.getByText(/Design Preview — Mock Data/i)).toBeDefined();
  });

  it("renders all 12 component navigation pills in catalog bar", () => {
    renderPage();
    const expectedComponents = [
      "StatCard",
      "MetricCard",
      "StatusBadge",
      "SearchBar",
      "FilterBar",
      "DataTable",
      "EmptyState",
      "LoadingState",
      "DetailDrawer",
      "ChartCard",
      "PageHeader",
      "MockDataBanner",
    ];

    for (const name of expectedComponents) {
      expect(screen.getByText(name)).toBeDefined();
    }
  });

  it("renders StatCard with 5 states (Default, Loading, Empty, Error, Variants)", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /statcard/i }));

    expect(screen.getByText("1. StatCard")).toBeDefined();
    expect(screen.getByText("Active Users")).toBeDefined();
    expect(screen.getByText("4,820")).toBeDefined();
    expect(screen.getByText("Archived Tournaments")).toBeDefined();
    expect(screen.getByText("Cluster Latency Sync")).toBeDefined();
    expect(screen.getByText("Weekly Growth")).toBeDefined();
  });

  it("renders MetricCard with 5 states (Default, Loading, Empty, Error, Variants)", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /metriccard/i }));

    expect(screen.getByText("2. MetricCard")).toBeDefined();
    expect(screen.getByText("Node Memory Pool")).toBeDefined();
    expect(screen.getByText("Cold Storage Quota")).toBeDefined();
    expect(screen.getByText("Event Loop Lag")).toBeDefined();
    expect(screen.getByText("Mesh WebRTC Audio Relays")).toBeDefined();
  });

  it("renders StatusBadge with 5 states and size variations", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /statusbadge/i }));

    expect(screen.getByText("3. StatusBadge")).toBeDefined();
    expect(screen.getByText("Critical Outage")).toBeDefined();
    expect(screen.getByText("Fleet Healthy")).toBeDefined();
  });

  it("renders SearchBar with interactive query testing", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /searchbar/i }));

    expect(screen.getByText("4. SearchBar")).toBeDefined();
    const interactiveInput = screen.getByPlaceholderText(/Type here to test interactive search/i);
    fireEvent.change(interactiveInput, { target: { value: "TestQuery123" } });

    await waitFor(() => {
      expect(screen.getByText(/"TestQuery123"/)).toBeDefined();
    });
  });

  it("SearchBar loading+disabled demo uses SearchBar's real, supported disabled prop — not an unsupported one", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /searchbar/i }));

    // Regression for the build blocker: this demo used to pass `disabled`
    // to SearchBar before SearchBarProps declared it, which is a TS2322
    // compile error `tsc` catches but no runtime test previously asserted
    // against. Confirms the prop is both accepted AND behaviorally real —
    // the native input is actually disabled, not just silently ignored.
    const syncingInput = screen.getByPlaceholderText(
      "Searching database records...",
    ) as HTMLInputElement;
    expect(syncingInput.disabled).toBe(true);
    expect(syncingInput.getAttribute("aria-disabled")).toBe("true");

    // A disabled SearchBar must not expose its clear button — there is
    // nothing a disabled, non-interactive field should let you clear.
    // Scoped to this specific SearchBar instance: other demos on the same
    // tab (e.g. the non-disabled "Default State" one) legitimately show
    // their own clear button.
    const syncingSearchBar = syncingInput.closest("div") as HTMLElement;
    expect(within(syncingSearchBar).queryByTitle("Clear search")).toBeNull();
  });

  it("renders FilterBar with interactive game filter dropdowns", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /filterbar/i }));

    expect(screen.getByText("5. FilterBar")).toBeDefined();
    expect(screen.getByLabelText("Game Tile")).toBeDefined();
    expect(screen.getByLabelText("User Status")).toBeDefined();
  });

  it("renders DataTable across Default, Loading, Empty, and Error states", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /datatable/i }));

    expect(screen.getByText("6. DataTable")).toBeDefined();
    expect(screen.getAllByText("Kethan Kumar").length).toBeGreaterThan(0);
    expect(screen.getByText("No matching players found")).toBeDefined();
    expect(screen.getByText("Query Execution Failed")).toBeDefined();
  });

  it("renders EmptyState with standard and action-driven variants", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /emptystate/i }));

    expect(screen.getByText("7. EmptyState")).toBeDefined();
    expect(screen.getByText("No matching rooms found")).toBeDefined();
    expect(screen.getByText("Telemetry Gateway Unreachable")).toBeDefined();
  });

  it("renders LoadingState variants (table, cards, chart)", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /loadingstate/i }));

    expect(screen.getByText("8. LoadingState")).toBeDefined();
  });

  it("renders DetailDrawer with open and close triggers", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /detaildrawer/i }));

    expect(screen.getByText("9. DetailDrawer")).toBeDefined();
    const trigger = screen.getByText(/Open User Profile/i);
    fireEvent.click(trigger);

    expect(await screen.findByText("Account Security & Access")).toBeDefined();
    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Account Security & Access")).toBeNull();
    });
  });

  it("renders ChartCard with timeframe range selection", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /chartcard/i }));

    expect(screen.getByText("10. ChartCard")).toBeDefined();
    expect(screen.getByText("Player Concurrency")).toBeDefined();
  });

  it("renders PageHeader variants with custom badges and breadcrumbs", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /pageheader/i }));

    expect(screen.getByText("11. PageHeader")).toBeDefined();
    expect(screen.getByText("BHALYAM Production Fleet")).toBeDefined();
  });

  it("renders MockDataBanner with mock and mixed data disclosures", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /mockdatabanner/i }));

    expect(screen.getByText("12. MockDataBanner")).toBeDefined();
    expect(screen.getAllByText(/Design Preview — Mock Data/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Partially Live — Mixed Data/i)).toBeDefined();
  });
});
