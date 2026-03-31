import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export type FileSystemAdapter = {
  copyFileSync: typeof copyFileSync;
  existsSync: typeof existsSync;
  mkdirSync: typeof mkdirSync;
};

const defaultFileSystem: FileSystemAdapter = {
  copyFileSync,
  existsSync,
  mkdirSync,
};

export function getSeedDatabasePath(rootDirectory = process.cwd()) {
  return path.join(rootDirectory, "prisma", "dev.db");
}

export function getRuntimeDatabasePath(tempDirectory = "/tmp") {
  return path.join(tempDirectory, "app-droit.db");
}

export function isVercelDemoStorageMode(
  environment: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(environment.VERCEL && !environment.DATABASE_URL);
}

export function ensureVercelSQLiteDatabase(options?: {
  rootDirectory?: string;
  tempDirectory?: string;
  fileSystem?: FileSystemAdapter;
}) {
  const rootDirectory = options?.rootDirectory ?? process.cwd();
  const tempDirectory = options?.tempDirectory ?? "/tmp";
  const fileSystem = options?.fileSystem ?? defaultFileSystem;

  const runtimeDatabasePath = getRuntimeDatabasePath(tempDirectory);
  const seededDatabasePath = getSeedDatabasePath(rootDirectory);

  if (!fileSystem.existsSync(runtimeDatabasePath)) {
    fileSystem.mkdirSync(path.dirname(runtimeDatabasePath), { recursive: true });

    if (!fileSystem.existsSync(seededDatabasePath)) {
      throw new Error(
        "Seeded SQLite database not found. Expected prisma/dev.db for Vercel runtime.",
      );
    }

    fileSystem.copyFileSync(seededDatabasePath, runtimeDatabasePath);
  }

  return runtimeDatabasePath;
}

export function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (isVercelDemoStorageMode()) {
    const runtimePath = ensureVercelSQLiteDatabase();
    return `file:${runtimePath}`;
  }

  throw new Error("DATABASE_URL is not configured.");
}
