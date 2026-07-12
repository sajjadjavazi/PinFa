"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";
import type { NotificationListItem } from "@/lib/notifications";

type NotificationDropdownProps = {
  initialNotifications: NotificationListItem[];
  initialUnreadCount: number;
  locale: Locale;
};

export function NotificationDropdown({
  initialNotifications,
  initialUnreadCount,
  locale,
}: NotificationDropdownProps) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  async function markAllRead() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });

      if (!response.ok) {
        return;
      }

      setUnreadCount(0);
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
        aria-label={t(dictionary, "notifications.unreadAria", {
          count: unreadCount,
        })}
      >
        {t(dictionary, "notifications.title")}
        {unreadCount > 0 ? (
          <span className="absolute -top-2 end-[-0.5rem] grid h-5 min-w-5 place-items-center rounded-full bg-red-700 px-1 text-[11px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute end-0 z-20 mt-2 grid w-80 max-w-[calc(100vw-1.5rem)] gap-3 rounded-md border border-neutral-200 bg-white p-3 text-sm shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-neutral-950">
              {t(dictionary, "notifications.title")}
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={isSubmitting}
                className="text-xs font-medium text-neutral-600 underline-offset-4 hover:text-neutral-950 hover:underline disabled:opacity-50"
              >
                {t(dictionary, "notifications.markAllRead")}
              </button>
            ) : null}
          </div>

          {notifications.length > 0 ? (
            <div className="grid max-h-80 gap-2 overflow-y-auto">
              {notifications.map((notification) => (
                <NotificationPreview
                  key={notification.id}
                  locale={locale}
                  notification={notification}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-neutral-50 px-3 py-4 text-center text-neutral-500">
              {t(dictionary, "notifications.empty")}
            </p>
          )}

          <Link
            href="/notifications"
            className="grid h-9 place-items-center rounded-md bg-neutral-950 px-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            {t(dictionary, "notifications.viewAll")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function NotificationPreview({
  locale,
  notification,
}: {
  locale: Locale;
  notification: NotificationListItem;
}) {
  const dictionary = getDictionary(locale);
  const content = (
    <div
      className={
        notification.isRead
          ? "rounded-md border border-neutral-100 px-3 py-2 text-neutral-600"
          : "rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-950"
      }
    >
      <p>{formatNotificationMessage(notification, dictionary)}</p>
      <p className="mt-1 text-xs text-neutral-500">
        {new Date(notification.createdAt).toLocaleString(
          locale === "fa" ? "fa-IR" : "en-US",
        )}
      </p>
    </div>
  );

  if (!notification.href) {
    return content;
  }

  return (
    <Link href={notification.href} className="block">
      {content}
    </Link>
  );
}

function formatNotificationMessage(
  notification: NotificationListItem,
  dictionary: ReturnType<typeof getDictionary>,
) {
  const actor = notification.actor?.displayName ?? "";
  const localized = t(dictionary, `notifications.item.${notification.type}`, {
    actor,
  });

  return localized.startsWith("notifications.item.")
    ? notification.message
    : localized;
}
