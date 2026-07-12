"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type BoardOption = {
  id: string;
  title: string;
  pinCount: number;
};

type SaveToBoardFormProps = {
  boards: BoardOption[];
  locale: Locale;
  pinId: string;
};

export function SaveToBoardForm({ boards, locale, pinId }: SaveToBoardFormProps) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const boardId = formData.get("boardId");

    if (typeof boardId !== "string" || boardId.length === 0) {
      setError(t(dictionary, "board.selectBoard"));
      setIsSubmitting(false);
      return;
    }

    const response = await fetch(`/api/boards/${boardId}/pins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinId,
      }),
    });
    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setError(
        result.errors?.save ??
          result.errors?.boardId ??
          result.errors?.pin ??
          result.errors?.auth ??
          t(dictionary, "board.saveFailed"),
      );
      return;
    }

    setMessage(t(dictionary, "board.savedToBoard"));
    router.refresh();
  }

  if (boards.length === 0) {
    return (
      <div className="grid gap-3 rounded-md border border-neutral-200 p-4">
        <p className="text-sm text-neutral-600">{t(dictionary, "board.createFirst")}</p>
        <Link
          href="/boards/new"
          className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          {t(dictionary, "board.create")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <label htmlFor="boardId" className="text-sm font-medium text-neutral-950">
        {t(dictionary, "board.saveToBoard")}
      </label>
      <select
        id="boardId"
        name="boardId"
        className="h-11 rounded-md border border-neutral-300 bg-white px-3 outline-none transition focus:border-neutral-950"
      >
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.title} ({board.pinCount})
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isSubmitting}
        aria-label={t(dictionary, "feed.savePinToSelectedBoard")}
        className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting ? t(dictionary, "common.saving") : t(dictionary, "board.save")}
      </button>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
