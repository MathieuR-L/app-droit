import { Role } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
};

type AuthenticationDependencies = {
  findUserByEmail: (email: string) => Promise<AuthenticatedUser | null>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
};

export type AuthenticationResult =
  | {
      ok: true;
      user: AuthenticatedUser;
    }
  | {
      ok: false;
      reason: "not_found" | "invalid_password";
    };

export async function authenticateCredentials(
  input: {
    email: string;
    password: string;
  },
  dependencies: AuthenticationDependencies,
): Promise<AuthenticationResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await dependencies.findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      ok: false,
      reason: "not_found",
    };
  }

  const passwordIsValid = await dependencies.verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!passwordIsValid) {
    return {
      ok: false,
      reason: "invalid_password",
    };
  }

  return {
    ok: true,
    user,
  };
}
