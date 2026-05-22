import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../app/login/page";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock document.cookie
Object.defineProperty(document, "cookie", {
  writable: true,
  value: "",
});

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it("renders the login form with email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("renders the RAPID Ledger branding", () => {
    render(<LoginPage />);
    expect(screen.getAllByText(/RAPID Ledger/i).length).toBeGreaterThan(0);
  });

  it("email field accepts user input", async () => {
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/work email/i);
    await userEvent.type(emailInput, "admin@rapid.dev");
    expect(emailInput).toHaveValue("admin@rapid.dev");
  });

  it("password field accepts user input", async () => {
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(passwordInput, "password123");
    expect(passwordInput).toHaveValue("password123");
  });

  it("password field is of type password (hidden text)", () => {
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("submit button is disabled while loading", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/work email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole("button", { name: /continue/i });

    await userEvent.type(emailInput, "admin@rapid.dev");
    await userEvent.type(passwordInput, "password123");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });
    expect(submitBtn).toBeDisabled();
  });

  it("stores token in localStorage on successful login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "mock-jwt-token",
        user: { name: "Alice Admin", role: "admin" },
      }),
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "admin@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(localStorageMock.getItem("rapid_token")).toBe("mock-jwt-token");
    });
  });

  it("redirects admin to /dashboard after successful login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "mock-jwt-token",
        user: { name: "Alice Admin", role: "admin" },
      }),
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "admin@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects approver to /approvals after successful login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "mock-jwt-token",
        user: { name: "Aria Approver", role: "approver" },
      }),
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "approver@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/approvals");
    });
  });

  it("redirects auditor to /audit-log after successful login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "mock-jwt-token",
        user: { name: "Adam Auditor", role: "auditor" },
      }),
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "auditor@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/audit-log");
    });
  });

  it("shows error toast on failed login", async () => {
    const { toast } = await import("sonner");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { message: "Invalid credentials" },
      }),
    });

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "wrong@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
    });
  });

  it("shows error toast on network failure", async () => {
    const { toast } = await import("sonner");
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/work email/i), "admin@rapid.dev");
    await userEvent.type(screen.getByLabelText(/password/i), "password123");
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("email input has required attribute", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/work email/i)).toHaveAttribute("required");
  });

  it("password input has required attribute", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("required");
  });
});
