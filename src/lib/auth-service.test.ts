import { Role } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { authenticateCredentials } from "./auth-service";

describe("authenticateCredentials", () => {
  it("authenticates a valid user", async () => {
    const result = await authenticateCredentials(
      {
        email: "BATONNIER@DEMO.FR ",
        password: "demo1234",
      },
      {
        findUserByEmail: vi.fn(async (email) => ({
          id: "user_1",
          email,
          passwordHash: "hashed",
          role: Role.BATONNIER,
        })),
        verifyPassword: vi.fn(async () => true),
      },
    );

    expect(result).toEqual({
      ok: true,
      user: {
        id: "user_1",
        email: "batonnier@demo.fr",
        passwordHash: "hashed",
        role: Role.BATONNIER,
      },
    });
  });

  it("returns not_found when the email does not exist", async () => {
    const result = await authenticateCredentials(
      {
        email: "missing@demo.fr",
        password: "demo1234",
      },
      {
        findUserByEmail: vi.fn(async () => null),
        verifyPassword: vi.fn(async () => true),
      },
    );

    expect(result).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("returns invalid_password when the hash comparison fails", async () => {
    const result = await authenticateCredentials(
      {
        email: "avocat@demo.fr",
        password: "wrong-password",
      },
      {
        findUserByEmail: vi.fn(async () => ({
          id: "user_2",
          email: "avocat@demo.fr",
          passwordHash: "hashed",
          role: Role.AVOCAT,
        })),
        verifyPassword: vi.fn(async () => false),
      },
    );

    expect(result).toEqual({
      ok: false,
      reason: "invalid_password",
    });
  });
});
