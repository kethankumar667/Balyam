import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "../LoginPage";

const submit = vi.fn();
vi.mock("../../../components/auth/useAccountAuth", () => ({
  useSignIn: () => ({
    loading: false, error: null, configured: true,
    submit, withGoogle: vi.fn(), clearError: vi.fn(),
  }),
}));

describe("login home navigation", () => {
  it("offers a home link and a linked logo without submitting the login form", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<h1>Home destination</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    const home = screen.getByRole("link", { name: "Back to home" });
    expect(home).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Bhalyam home" })).toHaveAttribute("href", "/");
    fireEvent.click(home);
    expect(screen.getByRole("heading", { name: "Home destination" })).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});
