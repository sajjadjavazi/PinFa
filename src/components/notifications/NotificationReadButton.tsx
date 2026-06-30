"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NotificationReadButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function markRead() {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={markRead}
      disabled={isSubmitting}
      className="h-9 rounded-md border border-neutral-300 px-3 text-sm font-medium text-neutral-800 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSubmitting ? "Working..." : "Mark read"}
    </button>
  );
}

export function NotificationReadAllButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function markAllRead() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={markAllRead}
      disabled={isSubmitting}
      className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {isSubmitting ? "Working..." : "Mark all read"}
    </button>
  );
}

