import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  NotificationReadAllButton,
  NotificationReadButton,
} from "@/components/notifications/NotificationReadButton";
import { getCurrentUser } from "@/lib/auth";
import {
  getNotificationsForUser,
  getNotificationSummary,
  type NotificationListItem,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Notifications",
};

export default async function NotificationsPage() {
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
      <AppHeader currentUser={currentUser} notificationSummary={summary} />
      <main className="mx-auto grid min-h-screen w-full max-w-4xl gap-8 px-6 py-8">
        <section className="flex flex-col gap-5 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">PinFa</p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950">
              Notifications
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              {summary.unreadCount} unread notifications.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {summary.unreadCount > 0 ? <NotificationReadAllButton /> : null}
          </div>
        </section>

        {notifications.length > 0 ? (
          <section className="grid gap-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))}
          </section>
        ) : (
          <div className="rounded-md border border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
            No notifications yet.
          </div>
        )}
      </main>
    </>
  );
}

function NotificationCard({
  notification,
}: {
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
            {notification.type}
          </p>
          <p className="mt-1 text-neutral-950">{notification.message}</p>
          {notification.actor ? (
            <p className="mt-1 text-xs text-neutral-500">
              From {notification.actor.displayName} (@{notification.actor.username})
            </p>
          ) : null}
          <p className="mt-2 text-xs text-neutral-500">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
        {!notification.isRead ? (
          <NotificationReadButton notificationId={notification.id} />
        ) : null}
      </div>

      {notification.href ? (
        <Link
          href={notification.href}
          className="w-fit text-sm font-medium text-neutral-950 underline-offset-4 hover:underline"
        >
          Open related item
        </Link>
      ) : null}
    </article>
  );
}
