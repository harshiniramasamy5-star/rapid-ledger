
describe("Document search and filter", () => {
  it("GET /documents accepts search query param without error", async () => {
    const login = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@rapid.com", password: "password123" }),
      })
    );
    const { token } = await login.json();
    const res = await app.handle(
      new Request("http://localhost/api/documents?search=test", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(res.status).toBe(200);
  });
});

describe("Document search and filter", () => {
  it("GET /documents accepts search query param without error", async () => {
    const login = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@rapid.com", password: "password123" }),
      })
    );
    const { token } = await login.json();
    const res = await app.handle(
      new Request("http://localhost/api/documents?search=test", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(res.status).toBe(200);
  });
});
