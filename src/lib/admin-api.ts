import { NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireAdminApiUser(): Promise<
  | {
      ok: true;
      user: CurrentUser;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      ok: false,
      response: NextResponse.json(
        { errors: { auth: "Authentication required." } },
        { status: 401 },
      ),
    };
  }

  if (!canAccessAdmin(currentUser)) {
    return {
      ok: false,
      response: NextResponse.json(
        { errors: { auth: "Admin access required." } },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    user: currentUser,
  };
}
