import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Read lazily so `prisma generate` works at build time without a database.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
