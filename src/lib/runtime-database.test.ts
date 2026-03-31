import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  ensureVercelSQLiteDatabase,
  getRuntimeDatabasePath,
  getSeedDatabasePath,
  isVercelDemoStorageMode,
  resolveDatabaseUrl,
} from "./runtime-database";

describe("runtime database bootstrap", () => {
  it("copies the seeded database when the runtime database is missing", () => {
    const copyFileSync = vi.fn();
    const mkdirSync = vi.fn();

    const runtimePath = ensureVercelSQLiteDatabase({
      rootDirectory: "/workspace",
      tempDirectory: "/tmp-test",
      fileSystem: {
        copyFileSync,
        mkdirSync,
        existsSync: vi.fn(
          (targetPath) => targetPath === path.join("/workspace", "prisma", "dev.db"),
        ),
      },
    });

    expect(runtimePath).toBe(path.join("/tmp-test", "app-droit.db"));
    expect(mkdirSync).toHaveBeenCalledWith(path.dirname(runtimePath), {
      recursive: true,
    });
    expect(copyFileSync).toHaveBeenCalledWith(
      path.join("/workspace", "prisma", "dev.db"),
      path.join("/tmp-test", "app-droit.db"),
    );
  });

  it("does not copy when the runtime database already exists", () => {
    const copyFileSync = vi.fn();

    const runtimePath = ensureVercelSQLiteDatabase({
      rootDirectory: "/workspace",
      tempDirectory: "/tmp-test",
      fileSystem: {
        copyFileSync,
        mkdirSync: vi.fn(),
        existsSync: vi.fn(
          (targetPath) => targetPath === path.join("/tmp-test", "app-droit.db"),
        ),
      },
    });

    expect(runtimePath).toBe(path.join("/tmp-test", "app-droit.db"));
    expect(copyFileSync).not.toHaveBeenCalled();
  });

  it("throws a clear error when the seeded database is missing", () => {
    expect(() =>
      ensureVercelSQLiteDatabase({
        rootDirectory: "/workspace",
        tempDirectory: "/tmp-test",
        fileSystem: {
          copyFileSync: vi.fn(),
          mkdirSync: vi.fn(),
          existsSync: vi.fn(() => false),
        },
      }),
    ).toThrow("Seeded SQLite database not found");
  });

  it("builds the expected helper paths", () => {
    expect(getSeedDatabasePath("/workspace")).toBe(
      path.join("/workspace", "prisma", "dev.db"),
    );
    expect(getRuntimeDatabasePath("/tmp-test")).toBe(
      path.join("/tmp-test", "app-droit.db"),
    );
  });

  it("prefers DATABASE_URL over the Vercel SQLite fallback", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("DATABASE_URL", "postgresql://demo:demo@db.example.com:5432/app");

    expect(resolveDatabaseUrl()).toBe(
      "postgresql://demo:demo@db.example.com:5432/app",
    );

    vi.unstubAllEnvs();
  });

  it("detects the Vercel demo storage fallback", () => {
    expect(isVercelDemoStorageMode({ VERCEL: "1" })).toBe(true);
    expect(
      isVercelDemoStorageMode({
        VERCEL: "1",
        DATABASE_URL: "postgresql://demo:demo@db.example.com:5432/app",
      }),
    ).toBe(false);
    expect(isVercelDemoStorageMode({})).toBe(false);
  });
});
