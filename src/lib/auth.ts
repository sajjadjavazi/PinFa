import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  verifyPassword,
} from "@/lib/password-hashing";
import { prisma } from "@/lib/prisma";

export { hashPassword, verifyPassword };

export const SESSION_COOKIE_NAME = "pinfa_session";
export const SESSION_TTL_DAYS = 30;

export const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  bio: true,
  websiteUrl: true,
  role: true,
  status: true,
  trustScore: true,
  termsAcceptedAt: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  followerCount: true,
  followingCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, request: NextRequest) {
  const sessionToken = generateSessionToken();
  const sessionTokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.userSession.create({
    data: {
      userId,
      sessionTokenHash,
      expiresAt,
      deviceInfo: request.headers.get("user-agent"),
      ipAddress: getRequestIp(request),
    },
  });

  return {
    sessionToken,
    expiresAt,
  };
}

export function setSessionCookie(
  response: NextResponse,
  sessionToken: string,
  expiresAt: Date,
) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function deleteSessionByToken(sessionToken: string) {
  await prisma.userSession.deleteMany({
    where: {
      sessionTokenHash: hashSessionToken(sessionToken),
    },
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: {
      sessionTokenHash: hashSessionToken(sessionToken),
    },
    include: {
      user: {
        select: publicUserSelect,
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.userSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  if (session.user.status !== "ACTIVE") {
    return null;
  }

  return session.user;
}

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}
