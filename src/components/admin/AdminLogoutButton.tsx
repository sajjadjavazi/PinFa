"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

export function AdminLogoutButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function logout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.push("/auth/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={logout}
      className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSubmitting ? t(dictionary, "auth.loggingOut") : t(dictionary, "nav.logout")}
    </button>
  );
}
