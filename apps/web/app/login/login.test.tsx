import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { toast } from "sonner";
import LoginPage from "./page";

function mockFetch(data: Record<string, unknown>, ok = true) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok, json: async () => data,
  });
}

describe("LoginPage", () => {
  beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

  it("renders email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders the Sign in heading", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("does not show SOC2, GDPR or ISO labels", () => {
    render(<LoginPage />);
    expect(screen.queryByText(/SOC 2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/GDPR/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ISO/i)).not.toBeInTheDocument();
  });

  it("updates email and password on input", async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "creator@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    expect(screen.getByLabelText(/work email/i)).toHaveValue("creator@rapid.dev");
    expect(screen.getByLabelText(/password/i)).toHaveValue("password123");
  });

  it("stores token in localStorage on successful login", async () => {
    mockFetch({ token: "test-token-123", user: { name: "Charlie", role: "creator" } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "creator@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(localStorage.getItem("rapid_token")).toBe("test-token-123"));
  });

  it("redirects creator to /dashboard", async () => {
    mockFetch({ token: "tok", user: { name: "Charlie", role: "creator" } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "creator@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects approver to /approvals", async () => {
    mockFetch({ token: "tok", user: { name: "Sarah", role: "approver" } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "approver@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/approvals"));
  });

  it("redirects auditor to /audit-log", async () => {
    mockFetch({ token: "tok", user: { name: "Audit", role: "auditor" } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "auditor@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/audit-log"));
  });

  it("shows error toast on invalid credentials", async () => {
    mockFetch({ error: { message: "Invalid credentials" } }, false);
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "wrong@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid credentials"));
  });

  it("shows success toast with user name", async () => {
    mockFetch({ token: "tok", user: { name: "Alice Admin", role: "admin" } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "admin@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Welcome back, Alice Admin!"));
  });
});
