"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ModerationAction = "approve" | "reject" | "remove";

type ModerationActionPanelProps = {
  mode: "pending" | "published";
  pinId: string;
};

const toneClasses = {
  approve: "bg-emerald-700 text-white hover:bg-emerald-800",
  reject: "bg-red-700 text-white hover:bg-red-800",
  remove: "border border-neutral-300 text-neutral-800 hover:border-neutral-950",
};

const labels: Record<ModerationAction, string> = {
  approve: "Approve",
  reject: "Reject",
  remove: "Remove",
};

export function ModerationActionPanel({
  mode,
  pinId,
}: ModerationActionPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<ModerationAction | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const actions: ModerationAction[] =
    mode === "pending" ? ["approve", "reject"] : ["remove"];

  async function submitAction(action: ModerationAction) {
    if (action === "reject" && !window.confirm("Reject this pending Pin?")) {
      return;
    }

    if (
      action === "remove" &&
      !window.confirm("Remove this published Pin from public areas?")
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
            "Action failed.",
        );
        return;
      }

      setSuccess(`${labels[action]} complete.`);
      setReviewNote("");
      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="grid content-start gap-3">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-neutral-950">Review note</span>
        <textarea
          value={reviewNote}
          maxLength={1000}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={4}
          className="resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
          placeholder="Optional note"
        />
      </label>

      <div className="grid gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            disabled={Boolean(isSubmitting)}
            onClick={() => submitAction(action)}
            className={`h-10 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[action]}`}
          >
            {isSubmitting === action ? "Working..." : labels[action]}
          </button>
        ))}
      </div>

      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
