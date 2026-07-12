"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type RemovePinFromBoardButtonProps = {
  boardId: string;
  locale: Locale;
  pinId: string;
};

export function RemovePinFromBoardButton({
  boardId,
  locale,
  pinId,
}: RemovePinFromBoardButtonProps) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function removePin() {
    if (!window.confirm(t(dictionary, "board.removeConfirm"))) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/boards/${boardId}/pins/${pinId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setError(result.errors?.pin ?? result.errors?.board ?? t(dictionary, "board.removeFailed"));
      return;
    }

    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={removePin}
        disabled={isSubmitting}
        aria-label={t(dictionary, "board.removePin")}
        className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? t(dictionary, "board.removing") : t(dictionary, "board.remove")}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
