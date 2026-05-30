import { execSync } from "child_process";

export default async function globalSetup() {
  execSync(
    'DATABASE_URL="postgresql://postgres:REDACTED@kodama.proxy.rlwy.net:58012/railway" npx prisma db seed',
    { cwd: "/Users/harshiniramasamy/rapid-ledger", stdio: "inherit" }
  );
}
