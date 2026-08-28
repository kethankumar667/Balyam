import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DataTable, { type Column } from "../index";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "u1", name: "Kethan Kumar" },
  { id: "u2", name: "Priya Patel" },
];

const COLUMNS: Column<Row>[] = [
  { kind: "property", key: "name", header: "Name" },
];

describe("DataTable — keyboard accessibility (ADMIN-A11Y-001)", () => {
  it("regression: a clickable row is reachable by Tab (tabIndex=0, role=button) — previously it had neither", () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        onRowClick={() => {}}
        getRowAriaLabel={(r) => `Open details for user ${r.name}`}
      />,
    );
    const row = screen.getByRole("button", { name: /Kethan Kumar/i });
    expect(row.getAttribute("tabindex")).toBe("0");
  });

  it("regression: Enter activates a focused row — previously nothing happened, only a mouse click worked", () => {
    const onRowClick = vi.fn();
    render(
      <DataTable columns={COLUMNS} data={ROWS} onRowClick={onRowClick} getRowAriaLabel={(r) => `Open details for user ${r.name}`} />,
    );
    const row = screen.getByRole("button", { name: "Open details for user Kethan Kumar" });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("regression: Space activates a focused row", () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={COLUMNS} data={ROWS} onRowClick={onRowClick} />);
    const row = screen.getAllByRole("button")[1]; // Priya Patel
    fireEvent.keyDown(row, { key: " " });
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);
  });

  it("a key other than Enter/Space does not activate the row", () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={COLUMNS} data={ROWS} onRowClick={onRowClick} />);
    const row = screen.getAllByRole("button")[0];
    fireEvent.keyDown(row, { key: "a" });
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("regression: rows have a real, content-specific accessible name — not a bare index like 'Row 1'", () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        onRowClick={() => {}}
        getRowAriaLabel={(r) => `Open details for user ${r.name}`}
      />,
    );
    expect(screen.getByRole("button", { name: "Open details for user Kethan Kumar" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Open details for user Priya Patel" })).toBeDefined();
  });

  it("falls back to a generic but still real accessible name when getRowAriaLabel is not supplied", () => {
    render(<DataTable columns={COLUMNS} data={ROWS} onRowClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Open row 1 details" })).toBeDefined();
  });

  it("regression: a visible focus-ring class is present — 'no outline suppression' means focus:outline-none must be paired with a focus-visible replacement", () => {
    render(<DataTable columns={COLUMNS} data={ROWS} onRowClick={() => {}} />);
    const row = screen.getAllByRole("button")[0];
    expect(row.className).toContain("focus-visible:ring-2");
    expect(row.className).toContain("focus-visible:ring-amber-500");
    expect(row.className).toContain("dark:focus-visible:ring-amber-400");
  });

  it("a row with no onRowClick is NOT given button semantics or a keyboard handler — this table stays a plain table when nothing is clickable", () => {
    render(<DataTable columns={COLUMNS} data={ROWS} />);
    expect(screen.queryByRole("button")).toBeNull();
    const row = screen.getByText("Kethan Kumar").closest("tr");
    expect(row?.getAttribute("tabindex")).toBeNull();
  });

  it("mouse click still works exactly as before (regression guard)", () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={COLUMNS} data={ROWS} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText("Priya Patel"));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);
  });
});

describe("DataTable — pagination accessibility (ADMIN-A11Y-003)", () => {
  const basePagination = {
    currentPage: 2,
    totalPages: 5,
    pageSize: 10,
    totalItems: 50,
    onPageChange: vi.fn(),
  };

  it("regression: Previous and Next buttons have real accessible names — previously they were icon-only with none", () => {
    render(<DataTable columns={COLUMNS} data={ROWS} pagination={basePagination} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDefined();
  });

  it("regression: the current page is announced via accessible text, not just visible '2 / 5'", () => {
    render(<DataTable columns={COLUMNS} data={ROWS} pagination={basePagination} />);
    const pageIndicator = screen.getByLabelText("Page 2 of 5");
    expect(pageIndicator).toBeDefined();
    expect(pageIndicator.getAttribute("aria-live")).toBe("polite");
  });

  it("regression: a disabled boundary button exposes aria-disabled, not just the native disabled attribute", () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        pagination={{ ...basePagination, currentPage: 1 }}
      />,
    );
    const prevBtn = screen.getByRole("button", { name: "Previous page" });
    expect(prevBtn.hasAttribute("disabled")).toBe(true);
    expect(prevBtn.getAttribute("aria-disabled")).toBe("true");

    const nextBtn = screen.getByRole("button", { name: "Next page" });
    expect(nextBtn.getAttribute("aria-disabled")).toBe("false");
  });

  it("the last page disables Next and exposes aria-disabled accordingly", () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        pagination={{ ...basePagination, currentPage: 5 }}
      />,
    );
    const nextBtn = screen.getByRole("button", { name: "Next page" });
    expect(nextBtn.hasAttribute("disabled")).toBe(true);
    expect(nextBtn.getAttribute("aria-disabled")).toBe("true");
  });
});
