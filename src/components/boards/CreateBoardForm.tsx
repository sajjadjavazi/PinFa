"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type ApiErrors = Record<string, string>;

export function CreateBoardForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [errors, setErrors] = useState<ApiErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/boards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
      }),
    });
    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setErrors(result.errors ?? { form: t(dictionary, "board.createFailed") });
      return;
    }

    router.push(`/boards/${result.board.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          {t(dictionary, "common.title")}
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={2}
          maxLength={80}
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.title} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="description" className="text-sm font-medium">
          {t(dictionary, "common.description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={500}
          className="resize-none rounded-md border border-neutral-300 px-3 py-2 outline-none transition focus:border-neutral-950"
        />
        <FieldError message={errors.description} />
      </div>

      <p className="text-sm text-neutral-500">{t(dictionary, "board.publicMvp")}</p>
      <FieldError message={errors.auth ?? errors.form} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting ? t(dictionary, "board.creating") : t(dictionary, "board.create")}
      </button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-red-600">{message}</p>;
}
