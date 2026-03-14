import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROLE_ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getSessionSecretValue } from "@/lib/session-config";

const SESSION_COOKIE_NAME = "app-droit-session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  role: Role;
};

function getSessionSecret() {
  return new TextEncoder().encode(getSessionSecretValue());
}

async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());
}

async function readSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());

    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createUserSession(userId: string, role: Role) {
  const cookieStore = await cookies();
  const token = await signSession({ userId, role });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearUserSession() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getCurrentUser() {
  const session = await readSession();

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      city: true,
      createdAt: true,
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(allowedRole: Role | Role[]) {
  const allowedRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    redirect(ROLE_ROUTES[user.role]);
  }

  return user;
}

export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();

  if (user) {
    redirect(ROLE_ROUTES[user.role]);
  }
}
