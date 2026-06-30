import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  publicUserSelect,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { validateLoginInput } from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const validation = validateLoginInput(body);

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const userWithPassword = await prisma.user.findFirst({
    where: {
      OR: [
        { username: validation.data.identifier },
        { email: validation.data.identifier },
        { phone: validation.data.identifier },
      ],
    },
    select: {
      ...publicUserSelect,
      passwordHash: true,
    },
  });

  if (!userWithPassword) {
    return invalidLoginResponse();
  }

  const passwordIsValid = await verifyPassword(
    validation.data.password,
    userWithPassword.passwordHash,
  );

  if (!passwordIsValid) {
    return invalidLoginResponse();
  }

  if (userWithPassword.status !== "ACTIVE") {
    return NextResponse.json(
      { errors: { account: "Account is not active." } },
      { status: 403 },
    );
  }

  const { passwordHash: _passwordHash, ...user } = userWithPassword;
  const session = await createSession(user.id, request);
  const response = NextResponse.json({ user });

  setSessionCookie(response, session.sessionToken, session.expiresAt);

  return response;
}

function invalidLoginResponse() {
  return NextResponse.json(
    { errors: { credentials: "Invalid username, email, phone, or password." } },
    { status: 401 },
  );
}

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
