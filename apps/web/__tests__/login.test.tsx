import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../app/login/page";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock sonner toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("LoginPage", () => {
  test("renders email and password inputs", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test("renders sign in button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  test("shows error toast on failed login", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Invalid credentials" } }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "wrong@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Invalid credentials");
    });
  });

  test("stores token and redirects on successful login", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "test-jwt-token",
        user: { name: "Admin User", role: "admin" },
      }),
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "admin@rapid.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(localStorage.getItem("rapid_token")).toBe("test-jwt-token");
      expect(mockToastSuccess).toHaveBeenCalledWith("Welcome back, Admin User!");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("button is disabled while loading", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: "admin@rapid.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });
});
