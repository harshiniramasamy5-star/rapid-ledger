// This file documents the t.Object additions needed in document.routes.ts
// Pattern to apply to every route handler that accepts a body:
//
// .post("/", async ({ user, body, set }) => { ... },
//   { body: t.Object({ title: t.String({ minLength: 1 }), description: t.Optional(t.String()), ... }) }
// )
//
// .post("/:id/approve", async ({ user, params, body, set }) => { ... },
//   { body: t.Object({ notes: t.Optional(t.String()) }) }
// )
//
// This closes the Elysia context typing gap entirely.
// Apply the same pattern to ledger.routes.ts and user.routes.ts.
