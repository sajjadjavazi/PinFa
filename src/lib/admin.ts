import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

type UserWithRole = {
  role: UserRole;
};

export function canAccessAdmin(user: UserWithRole | null | undefined) {
  return user?.role === UserRole.MODERATOR || user?.role === UserRole.SUPER_ADMIN;
}

export async function getCurrentAdminUser() {
  const user = await getCurrentUser();

  if (!canAccessAdmin(user)) {
    return null;
  }

  return user;
}

export async function requireAdminPageUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (!canAccessAdmin(user)) {
    notFound();
  }

  return user;
}
