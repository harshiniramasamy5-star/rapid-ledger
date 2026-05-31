import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ApprovalsPage from "../app/approvals/page";
import React from "react";

const mockPush    = jest.fn();
const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const APPROVALS = [
  {
    id: "approval-1", status: "pending",
    document: { id: "doc-1", documentCode: "RAPID-001", title: "Migrate to AWS S3", riskLevel: "high", complianceImpact: 1, decisionSummary: "Move all file storage." },
  },
  {
    id: "approval-2", status: "pending",
    document: { id: "doc-2", documentCode: "RAPID-002", title: "Update Security Policy", riskLevel: "medium", complianceImpact: 0, decisionSummary: "Revise security policy." },
  },
];

function mockFetch(approvals = APPROVALS, actionOk = true) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes("/approvals/my")) {
      return Promise.resolve({ ok: true, text: async () => JSON.stringify(approvals) });
    }
    if (actionOk) {
      return Promise.resolve({ ok: true, text: async () => JSON.stringify({ success: true }) });
    }
    return Promise.resolve({ ok: false, text: async () => JSON.stringify({ error: { message: "Not allowed" } }) });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  document.cookie = "rapid_token=test-token; path=/";
});

describe("ApprovalsPage", () => {
  it("renders skeleton while loading", () => {
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));
    renderWithQuery(<ApprovalsPage />);
    expect(document.querySelector("[data-slot='skeleton']")).toBeInTheDocument();
  });

  it("renders approval cards after fetch", async () => {
    mockFetch();
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());
    expect(screen.getByText("Update Security Policy")).toBeInTheDocument();
  });

  it("shows empty state when no approvals", async () => {
    mockFetch([]);
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText(/all caught up/i)).toBeInTheDocument());
  });

  it("shows document codes", async () => {
    mockFetch();
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("RAPID-001")).toBeInTheDocument());
    expect(screen.getByText("RAPID-002")).toBeInTheDocument();
  });

  it("shows high risk badge", async () => {
    mockFetch();
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText(/high.*risk/i)).toBeInTheDocument());
  });

  it("shows two approval cards", async () => {
    mockFetch();
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getAllByText("Approve")).toHaveLength(2));
  });

  it("View Document navigates to document page", async () => {
    mockFetch();
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getAllByText(/view document/i)[0]).toBeInTheDocument());
    fireEvent.click(screen.getAllByText(/view document/i)[0]);
    expect(mockPush).toHaveBeenCalledWith("/documents/doc-1");
  });

  it("shows error state when fetch fails", async () => {
    global.fetch = jest.fn().mockImplementation(() => Promise.reject(new Error("Network error")));
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText(/failed to load approvals/i)).toBeInTheDocument());
  });

  it("approve removes card from list", async () => {
    let calls = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/approvals/my")) {
        calls++;
        const data = calls === 1 ? APPROVALS : [APPROVALS[1]];
        return Promise.resolve({ ok: true, text: async () => JSON.stringify(data) });
      }
      return Promise.resolve({ ok: true, text: async () => JSON.stringify({ success: true }) });
    });
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getAllByText("Approve")[0]); });
    await waitFor(() => expect(screen.queryByText("Migrate to AWS S3")).not.toBeInTheDocument());
    expect(screen.getByText("Update Security Policy")).toBeInTheDocument();
  });

  it("reject removes card from list", async () => {
    let calls = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/approvals/my")) {
        calls++;
        const data = calls === 1 ? APPROVALS : [APPROVALS[1]];
        return Promise.resolve({ ok: true, text: async () => JSON.stringify(data) });
      }
      return Promise.resolve({ ok: true, text: async () => JSON.stringify({ success: true }) });
    });
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getAllByText("Reject")[0]); });
    await waitFor(() => expect(screen.queryByText("Migrate to AWS S3")).not.toBeInTheDocument());
  });

  it("request-changes removes card from list", async () => {
    let calls = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/approvals/my")) {
        calls++;
        const data = calls === 1 ? APPROVALS : [APPROVALS[1]];
        return Promise.resolve({ ok: true, text: async () => JSON.stringify(data) });
      }
      return Promise.resolve({ ok: true, text: async () => JSON.stringify({ success: true }) });
    });
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getAllByText("Request Changes")[0]); });
    await waitFor(() => expect(screen.queryByText("Migrate to AWS S3")).not.toBeInTheDocument());
  });

  it("disables buttons while action is in progress", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/approvals/my")) {
        return Promise.resolve({ ok: true, text: async () => JSON.stringify(APPROVALS) });
      }
      return new Promise(() => {});
    });
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Approve")[0]);
    await waitFor(() => {
      expect(screen.getAllByText("Approve")[0].closest("button")).toBeDisabled();
    });
  });

  it("shows error toast on failed action", async () => {
    const { toast } = await import("sonner");
    mockFetch(APPROVALS, false);
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getAllByText("Approve")[0]); });
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("notes textarea updates", async () => {
    mockFetch();
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getAllByPlaceholderText(/add notes/i)[0]).toBeInTheDocument());
    const textarea = screen.getAllByPlaceholderText(/add notes/i)[0];
    fireEvent.change(textarea, { target: { value: "looks good" } });
    expect((textarea as HTMLTextAreaElement).value).toBe("looks good");
  });

  it("shows both action rows for two approvals", async () => {
    mockFetch();
    renderWithQuery(<ApprovalsPage />);
    await waitFor(() => expect(screen.getAllByText("Approve")).toHaveLength(2));
    expect(screen.getAllByText("Reject")).toHaveLength(2);
    expect(screen.getAllByText("Request Changes")).toHaveLength(2);
  });
});
