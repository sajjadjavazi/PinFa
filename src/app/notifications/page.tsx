import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  NotificationReadAllButton,
  NotificationReadButton,
} from "@/components/notifications/NotificationReadButton";
import { getCurrentUser } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/config";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { Dictionary } from "@/lib/i18n/t";
import { getDictionary, t } from "@/lib/i18n/t";
import {
  getNotificationsForUser,
  getNotificationSummary,
  type NotificationListItem,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return {
    robots: {
      follow: false,
      index: false,
    },
    title: t(dictionary, "notifications.title"),
  };
}

export default async function NotificationsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  const [notifications, summary] = await Promise.all([
    getNotificationsForUser({
      take: 100,
      userId: currentUser.id,
    }),
    getNotificationSummary({
      recentTake: 0,
      userId: currentUser.id,
    }),
  ]);

  return (
    <>
      <AppHeader
        currentUser={currentUser}
        locale={locale}
        notificationSummary={summary}
      />
      <main className="mx-auto grid min-h-screen w-full max-w-4xl gap-8 px-6 py-8">
        <section className="flex flex-col gap-5 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">PinFa</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950">
              {t(dictionary, "notifications.title")}
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              {t(dictionary, "notifications.unread", {
                count: summary.unreadCount,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {summary.unreadCount > 0 ? (
              <NotificationReadAllButton locale={locale} />
            ) : null}
          </div>
        </section>

        {notifications.length > 0 ? (
          <section className="grid gap-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                dictionary={dictionary}
                locale={locale}
                notification={notification}
              />
            ))}
          </section>
        ) : (
          <div className="rounded-md border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
            {t(dictionary, "notifications.empty")}
          </div>
        )}
      </main>
    </>
  );
}

function NotificationCard({
  dictionary,
  locale,
  notification,
}: {
  dictionary: Dictionary;
  locale: Locale;
  notification: NotificationListItem;
}) {
  return (
    <article
      className={
        notification.isRead
          ? "grid gap-3 rounded-md border border-neutral-200 bg-white p-4"
          : "grid gap-3 rounded-md border border-neutral-300 bg-neutral-50 p-4"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            {t(dictionary, `notifications.item.${notification.type}`, {
              actor: notification.actor?.displayName ?? "",
            })}
          </p>
          <p className="mt-1 text-neutral-950">
            {formatNotificationMessage(notification, dictionary)}
          </p>
          {notification.actor ? (
            <p className="mt-1 text-xs text-neutral-500">
              {t(dictionary, "notifications.from", {
                name: notification.actor.displayName,
                username: notification.actor.username,
              })}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-neutral-500">
            {new Date(notification.createdAt).toLocaleString(
              locale === "fa" ? "fa-IR" : "en-US",
            )}
          </p>
        </div>
        {!notification.isRead ? (
          <NotificationReadButton locale={locale} notificationId={notification.id} />
        ) : null}
      </div>

      {notification.href ? (
        <Link
          href={notification.href}
          className="w-fit text-sm font-medium text-neutral-950 underline-offset-4 hover:underline"
        >
          {t(dictionary, "notifications.openRelated")}
        </Link>
      ) : null}
    </article>
  );
}

function formatNotificationMessage(
  notification: NotificationListItem,
  dictionary: Dictionary,
) {
  const localized = t(dictionary, `notifications.item.${notification.type}`, {
    actor: notification.actor?.displayName ?? "",
  });

  return localized.startsWith("notifications.item.")
    ? notification.message
    : localized;
}
