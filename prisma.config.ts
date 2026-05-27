import path from "node:path";
import type { PrismaConfig } from "prisma";
import { config } from "dotenv";
config();

export default {
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
} satisfies PrismaConfig;
