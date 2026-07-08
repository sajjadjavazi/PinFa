import { existsSync } from "fs";
import path from "path";
import Link from "next/link";
import type { ReactNode } from "react";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { canAccessAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import {
  getNotificationSummary,
  type NotificationListItem,
} from "@/lib/notifications";

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

type NotificationSummary = {
  recentNotifications: NotificationListItem[];
  unreadCount: number;
};

type AppHeaderProps = {
  currentUser?: CurrentUser;
  notificationSummary?: NotificationSummary | null;
};

export async function AppHeader({
  currentUser,
  notificationSummary,
}: AppHeaderProps) {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  const summary =
    notificationSummary === undefined && user
      ? await getNotificationSummary({ userId: user.id }).catch(() => null)
      : (notificationSummary ?? null);
  const logoSrc = getLogoSrc();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-2 px-3 py-2 sm:px-5 lg:px-6">
        <Link
          href="/"
          className="mr-auto flex h-10 items-center gap-2 rounded-md px-1 text-neutral-950 outline-none transition focus-visible:ring-2 focus-visible:ring-neutral-950"
          aria-label="PinFa home"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="PinFa logo"
              className="h-9 w-auto max-w-12 object-contain"
            />
          ) : null}
          <span className="text-lg font-semibold tracking-normal">PinFa</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          <HeaderLink href="/">Home</HeaderLink>
          <HeaderLink href="/search">Search</HeaderLink>
          {user ? (
            <>
              <HeaderLink href="/upload">Upload</HeaderLink>
              {summary ? (
                <NotificationDropdown
                  initialNotifications={summary.recentNotifications}
                  initialUnreadCount={summary.unreadCount}
                />
              ) : (
                <HeaderLink href="/notifications">Notifications</HeaderLink>
              )}
              <HeaderLink href="/profile">Profile</HeaderLink>
              {canAccessAdmin(user) ? (
                <HeaderLink href="/admin">Admin</HeaderLink>
              ) : null}
            </>
          ) : (
            <>
              <HeaderLink href="/auth/login">Log in</HeaderLink>
              <Link
                href="/auth/register"
                className="grid h-9 place-items-center rounded-full bg-neutral-950 px-3 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function HeaderLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="grid h-9 place-items-center rounded-full px-3 text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
    >
      {children}
    </Link>
  );
}

function getLogoSrc() {
  const candidates = [
    {
      filePath: path.join(process.cwd(), "public", "brand", "pinfa-logo.png"),
      src: "/brand/pinfa-logo.png",
    },
    {
      filePath: path.join(process.cwd(), "public", "brand", "PinFa-logo.webp"),
      src: "/brand/PinFa-logo.webp",
    },
    {
      filePath: path.join(process.cwd(), "public", "brand", "pinfa-logo.webp"),
      src: "/brand/pinfa-logo.webp",
    },
  ];

  return candidates.find((candidate) => existsSync(candidate.filePath))?.src ?? null;
}
