import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

function ensureVercelSQLiteDatabase() {
  const runtimeDatabasePath = path.join("/tmp", "app-droit.db");
  const seededDatabasePath = path.join(process.cwd(), "prisma", "dev.db");

  if (!existsSync(runtimeDatabasePath)) {
    mkdirSync(path.dirname(runtimeDatabasePath), { recursive: true });

    if (!existsSync(seededDatabasePath)) {
      throw new Error(
        "Seeded SQLite database not found. Expected prisma/dev.db for Vercel runtime.",
      );
    }

    copyFileSync(seededDatabasePath, runtimeDatabasePath);
  }

  return `file:${runtimeDatabasePath}`;
}

function resolveDatabaseUrl() {
  if (process.env.VERCEL) {
    return ensureVercelSQLiteDatabase();
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return process.env.DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
