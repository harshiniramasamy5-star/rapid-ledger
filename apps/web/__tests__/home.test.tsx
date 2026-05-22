import { render } from "@testing-library/react";
import Home from "../app/page";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("Home Page", () => {
  test("redirects to /login when no token exists", () => {
    render(<Home />);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  test("redirects to /dashboard when token exists", () => {
    localStorage.setItem("rapid_token", "some-token");
    render(<Home />);
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });
});
