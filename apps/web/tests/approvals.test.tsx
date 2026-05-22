import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ApprovalsPage from "../app/approvals/page";

// STABLE router object — same reference on every render.
const mockPush    = jest.fn();
const mockReplace = jest.fn();
const stableRouter = { push: mockPush, replace: mockReplace };

jest.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Stable localStorage mock
const _store: Record<string, string> = {};
Object.defineProperty(window, "localStorage", {
  value: {
    getItem:    (k: string) => _store[k] ?? null,
    setItem:    (k: string, v: string) => { _store[k] = v; },
    removeItem: (k: string) => { delete _store[k]; },
    clear:      () => { Object.keys(_store).forEach(k => delete _store[k]); },
  },
});

const APPROVALS = [
  {
    id: "approval-1",
    status: "pending",
    document: {
      id: "doc-1",
      documentCode: "RAPID-001",
      title: "Migrate to AWS S3",
      riskLevel: "high",
      complianceImpact: 1,
      decisionSummary: "Move all file storage from local disk to AWS S3.",
    },
  },
  {
    id: "approval-2",
    status: "pending",
    document: {
      id: "doc-2",
      documentCode: "RAPID-002",
      title: "Update Security Policy",
      riskLevel: "medium",
      complianceImpact: 0,
      decisionSummary: "Revise the company security policy.",
    },
  },
];

function setFetch(approvals = APPROVALS, actionOk = true) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes("/approvals/my")) {
      return Promise.resolve({ ok: true, json: async () => approvals });
    }
    return actionOk
      ? Promise.resolve({ ok: true,  json: async () => ({ success: true }) })
      : Promise.resolve({ ok: false, json: async () => ({ error: { message: "Not allowed" } }) });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

describe("ApprovalsPage", () => {
  it("redirects to login if no token", () => {
    global.fetch = jest.fn();
    render(<ApprovalsPage />);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("shows loading spinner initially", () => {
    window.localStorage.setItem("rapid_token", "t");
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));
    render(<ApprovalsPage />);
    expect(screen.getByText(/loading approvals/i)).toBeInTheDocument();
  });

  it("renders approval cards after fetch", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());
    expect(screen.getByText("Update Security Policy")).toBeInTheDocument();
  });

  it("shows empty state when no approvals", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch([]);
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText(/all caught up/i)).toBeInTheDocument());
  });

  it("shows document codes", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("RAPID-001")).toBeInTheDocument());
    expect(screen.getByText("RAPID-002")).toBeInTheDocument();
  });

  it("shows high risk badge", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText(/high.*risk/i)).toBeInTheDocument());
  });

  it("shows compliance badge for complianceImpact=1", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Compliance")).toBeInTheDocument());
  });

  it("shows decision summary text", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() =>
      expect(screen.getByText(/Move all file storage/i)).toBeInTheDocument()
    );
  });

  it("View Full Document navigates to document page", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() =>
      expect(screen.getAllByText(/view full document/i)[0]).toBeInTheDocument()
    );
    fireEvent.click(screen.getAllByText(/view full document/i)[0]);
    expect(mockPush).toHaveBeenCalledWith("/documents/doc-1");
  });

  it("Back to Dashboard navigates to dashboard", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch([]);
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText(/all caught up/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/back to dashboard/i));
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("shows error toast when fetch fails", async () => {
    const { toast } = await import("sonner");
    window.localStorage.setItem("rapid_token", "t");
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/approvals/my")) return Promise.reject(new Error("Network error"));
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<ApprovalsPage />);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to load approvals")
    );
  });

  it("approve removes card from list", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getAllByText("Approve")[0]);
    });

    await waitFor(() =>
      expect(screen.queryByText("Migrate to AWS S3")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Update Security Policy")).toBeInTheDocument();
  });

  it("reject removes card from list", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getAllByText("Reject")[0]);
    });

    await waitFor(() =>
      expect(screen.queryByText("Migrate to AWS S3")).not.toBeInTheDocument()
    );
  });

  it("request-changes removes card from list", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getAllByText("Request Changes")[0]);
    });

    await waitFor(() =>
      expect(screen.queryByText("Migrate to AWS S3")).not.toBeInTheDocument()
    );
  });

  it("disables all action buttons while action is in progress", async () => {
    window.localStorage.setItem("rapid_token", "t");
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/approvals/my")) {
        return Promise.resolve({ ok: true, json: async () => APPROVALS });
      }
      return new Promise(() => {}); // hang action
    });
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());

    fireEvent.click(screen.getAllByText("Approve")[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Approve")[0].closest("button")).toBeDisabled();
      expect(screen.getAllByText("Reject")[0].closest("button")).toBeDisabled();
      expect(screen.getAllByText("Request Changes")[0].closest("button")).toBeDisabled();
    });
  });

  it("shows error toast on failed action", async () => {
    const { toast } = await import("sonner");
    window.localStorage.setItem("rapid_token", "t");
    setFetch(APPROVALS, false);
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getByText("Migrate to AWS S3")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getAllByText("Approve")[0]);
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("notes textarea updates per approval", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() =>
      expect(screen.getAllByPlaceholderText(/add context/i)[0]).toBeInTheDocument()
    );
    const textareas = screen.getAllByPlaceholderText(/add context/i);
    fireEvent.change(textareas[0], { target: { value: "looks good" } });
    expect((textareas[0] as HTMLTextAreaElement).value).toBe("looks good");
  });

  it("shows both action button rows when two approvals exist", async () => {
    window.localStorage.setItem("rapid_token", "t");
    setFetch();
    render(<ApprovalsPage />);
    await waitFor(() => expect(screen.getAllByText("Approve")).toHaveLength(2));
    expect(screen.getAllByText("Reject")).toHaveLength(2);
    expect(screen.getAllByText("Request Changes")).toHaveLength(2);
  });
});
