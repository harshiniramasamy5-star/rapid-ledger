import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { toast } from "sonner";

function mockFetch(data: object, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({ ok, json: async () => data }) as jest.Mock;
}

beforeEach(() => { jest.clearAllMocks(); });

describe("LoginPage", () => {
  it("renders email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/work email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });

  it("renders the Sign in heading", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeTruthy();
  });

  it("does not show SOC2, GDPR or ISO labels", () => {
    render(<LoginPage />);
    expect(screen.queryByText(/SOC2/i)).toBeNull();
    expect(screen.queryByText(/GDPR/i)).toBeNull();
    expect(screen.queryByText(/ISO/i)).toBeNull();
  });

  it("updates email and password on input", async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "test@rapid.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    expect((screen.getByLabelText(/work email/i) as HTMLInputElement).value).toBe("test@rapid.com");
    expect((screen.getByLabelText(/password/i) as HTMLInputElement).value).toBe("password123");
  });

  it("redirects creator to /dashboard", async () => {
    mockFetch({ token: "tok", user: { name: "Charlie", role: "creator", orgId: "test-org-id", totpEnabled: true } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "creator@rapid.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects approver to /dashboard", async () => {
    mockFetch({ token: "tok", user: { name: "Sarah", role: "approver", orgId: "test-org-id", totpEnabled: true } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "approver@rapid.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects viewer to /dashboard", async () => {
    mockFetch({ token: "tok", user: { name: "Viewer", role: "viewer", orgId: "test-org-id", totpEnabled: true } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "viewer@rapid.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows error toast on invalid credentials", async () => {
    mockFetch({ message: "Invalid credentials" }, false);
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "bad@rapid.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("shows success toast with user name", async () => {
    mockFetch({ token: "tok", user: { name: "Alice", role: "admin", orgId: "test-org-id", totpEnabled: true } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "admin@rapid.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/alice/i)));
  });
});
