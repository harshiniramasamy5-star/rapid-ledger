process.env.NODE_ENV = "test";
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? "postgresql://postgres:password@localhost:5432/rapid_ledger";
}
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-key-not-for-production";
