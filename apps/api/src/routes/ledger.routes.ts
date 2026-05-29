import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { getLedgerEntries, exportLedgerCsv } from "../services/ledger.service";

export const ledgerRoutes = new Elysia({ prefix: "/ledger" })
  .use(authMiddleware)
  .get("/", async ({ user, query, set }) => {
    requirePermission(user, "ledger:read", set);
    return getLedgerEntries({ search: query.search, limit: query.limit ? Number(query.limit) : undefined, page: query.page ? Number(query.page) : 1 });
  })
  .get("/export.csv", async ({ user, set }) => {
    requirePermission(user, "ledger:read", set);
    const csv = await exportLedgerCsv();
    set.headers["content-type"] = "text/csv";
    set.headers["content-disposition"] = `attachment; filename="rapid-ledger-${new Date().toISOString().split("T")[0]}.csv"`;
    return csv;
  });
