"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type ModerationAction = "approve" | "reject" | "remove";

type ModerationActionPanelProps = {
  locale: Locale;
  mode: "pending" | "published";
  pinId: string;
};

const toneClasses = {
  approve: "bg-emerald-700 text-white hover:bg-emerald-800",
  reject: "bg-red-700 text-white hover:bg-red-800",
  remove: "border border-neutral-300 text-neutral-800 hover:border-neutral-950",
};

export function ModerationActionPanel({
  locale,
  mode,
  pinId,
}: ModerationActionPanelProps) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<ModerationAction | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const actions: ModerationAction[] =
    mode === "pending" ? ["approve", "reject"] : ["remove"];

  async function submitAction(action: ModerationAction) {
    if (action === "reject" && !window.confirm(t(dictionary, "admin.actions.rejectPin"))) {
      return;
    }

    if (
      action === "remove" &&
      !window.confirm(t(dictionary, "admin.actions.removePin"))
    ) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(action);

    try {
      const response = await fetch(
        `/api/admin/moderation/pins/${pinId}/${action}`,
        {
          body: JSON.stringify({
            reviewNote: reviewNote.trim() || null,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
      const result = await response.json();

      if (!response.ok) {
        setError(
          result.errors?.pin ??
            result.errors?.reviewNote ??
            result.errors?.auth ??
            result.errors?.action ??
            t(dictionary, "common.actionFailed"),
        );
        return;
      }

      setSuccess(
        t(dictionary, "admin.actions.complete", {
          action: getActionLabel(dictionary, action),
        }),
      );
      setReviewNote("");
      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="grid content-start gap-3">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-neutral-950">
          {t(dictionary, "admin.actions.reviewNote")}
        </span>
        <textarea
          value={reviewNote}
          maxLength={1000}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={4}
          className="resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
          placeholder={t(dictionary, "admin.actions.optionalNote")}
        />
      </label>

      <div className="grid gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            disabled={Boolean(isSubmitting)}
            onClick={() => submitAction(action)}
            aria-label={
              action === "approve"
                ? t(dictionary, "admin.actions.approvePin")
                : action === "reject"
                  ? t(dictionary, "admin.actions.rejectPin")
                  : t(dictionary, "admin.actions.removePin")
            }
            className={`h-10 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[action]}`}
          >
            {isSubmitting === action
              ? t(dictionary, "common.working")
              : getActionLabel(dictionary, action)}
          </button>
        ))}
      </div>

      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function getActionLabel(
  dictionary: ReturnType<typeof getDictionary>,
  action: ModerationAction,
) {
  if (action === "approve") {
    return t(dictionary, "admin.actions.approve");
  }

  if (action === "reject") {
    return t(dictionary, "admin.actions.reject");
  }

  return t(dictionary, "admin.actions.remove");
}
