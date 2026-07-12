import { existsSync } from "fs";
import path from "path";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { canAccessAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getDictionary, t } from "@/lib/i18n/t";
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
  locale?: Locale;
  notificationSummary?: NotificationSummary | null;
};

export async function AppHeader({
  currentUser,
  locale,
  notificationSummary,
}: AppHeaderProps) {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  const resolvedLocale = locale ?? (await getCurrentLocale());
  const dictionary = getDictionary(resolvedLocale);
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
          className="me-auto flex h-10 items-center gap-2 rounded-md px-1 text-neutral-950 outline-none transition focus-visible:ring-2 focus-visible:ring-neutral-950"
          aria-label={t(dictionary, "nav.pinfaHome")}
        >
          {logoSrc ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm">
              <img
                src={logoSrc}
                alt={t(dictionary, "nav.logoAlt")}
                className="h-full w-full object-cover"
              />
            </span>
          ) : null}
          <span className="text-lg font-semibold tracking-normal">PinFa</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          <HeaderLink href="/">{t(dictionary, "nav.home")}</HeaderLink>
          <HeaderLink href="/search">{t(dictionary, "nav.search")}</HeaderLink>
          {user ? (
            <>
              <HeaderLink href="/upload">{t(dictionary, "nav.upload")}</HeaderLink>
              {summary ? (
                <NotificationDropdown
                  initialNotifications={summary.recentNotifications}
                  initialUnreadCount={summary.unreadCount}
                  locale={resolvedLocale}
                />
              ) : (
                <HeaderLink href="/notifications">
                  {t(dictionary, "notifications.title")}
                </HeaderLink>
              )}
              <HeaderLink href="/profile">{t(dictionary, "nav.profile")}</HeaderLink>
              {canAccessAdmin(user) ? (
                <HeaderLink href="/admin">{t(dictionary, "nav.admin")}</HeaderLink>
              ) : null}
            </>
          ) : (
            <>
              <HeaderLink href="/auth/login">{t(dictionary, "nav.login")}</HeaderLink>
              <Link
                href="/auth/register"
                className="grid h-9 place-items-center rounded-full bg-neutral-950 px-3 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                {t(dictionary, "nav.register")}
              </Link>
            </>
          )}
          <LanguageToggle locale={resolvedLocale} />
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
