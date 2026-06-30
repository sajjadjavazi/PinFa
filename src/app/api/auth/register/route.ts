import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  hashPassword,
  publicUserSelect,
  setSessionCookie,
} from "@/lib/auth";
import { validateRegisterInput } from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const validation = validateRegisterInput(body);

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const duplicate = await findDuplicateUser(validation.data);

  if (duplicate) {
    return NextResponse.json(
      { errors: { [duplicate]: `${duplicate} is already in use.` } },
      { status: 409 },
    );
  }

  try {
    const passwordHash = await hashPassword(validation.data.password);
    const user = await prisma.user.create({
      data: {
        username: validation.data.username,
        displayName: validation.data.displayName,
        email: validation.data.email,
        phone: validation.data.phone,
        passwordHash,
        termsAcceptedAt: new Date(),
      },
      select: publicUserSelect,
    });
    const session = await createSession(user.id, request);
    const response = NextResponse.json({ user }, { status: 201 });

    setSessionCookie(response, session.sessionToken, session.expiresAt);

    return response;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { errors: { account: "Username, email, or phone is already in use." } },
        { status: 409 },
      );
    }

    throw error;
  }
}

async function findDuplicateUser(input: {
  username: string;
  email: string | null;
  phone: string | null;
}) {
  const checks: Prisma.UserWhereInput[] = [{ username: input.username }];

  if (input.email) {
    checks.push({ email: input.email });
  }

  if (input.phone) {
    checks.push({ phone: input.phone });
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: checks,
    },
    select: {
      username: true,
      email: true,
      phone: true,
    },
  });

  if (!existingUser) {
    return null;
  }

  if (existingUser.username === input.username) {
    return "username";
  }

  if (input.email && existingUser.email === input.email) {
    return "email";
  }

  if (input.phone && existingUser.phone === input.phone) {
    return "phone";
  }

  return "account";
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
