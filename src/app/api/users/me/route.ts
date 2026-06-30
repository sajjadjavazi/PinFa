import { NextResponse } from "next/server";
import { getCurrentUser, publicUserSelect } from "@/lib/auth";
import { validateProfileUpdateInput } from "@/lib/profile-validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const body = await readJson(request);
  const validation = validateProfileUpdateInput(body);

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: validation.data,
    select: publicUserSelect,
  });

  return NextResponse.json({ user: updatedUser });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
