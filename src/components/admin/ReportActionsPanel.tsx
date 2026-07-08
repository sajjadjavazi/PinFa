"use client";

import type { ReportTargetType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ReportAction =
  | "reject"
  | "remove-pin"
  | "review"
  | "resolve"
  | "suspend-user";

type ReportActionsPanelProps = {
  canAct: boolean;
  reportId: string;
  targetType: ReportTargetType;
};

const actionLabels: Record<ReportAction, string> = {
  reject: "Reject Report",
  "remove-pin": "Remove Pin",
  review: "Mark In Review",
  resolve: "Resolve Report",
  "suspend-user": "Suspend User",
};

const confirmMessageByAction: Partial<Record<ReportAction, string>> = {
  "remove-pin": "Remove the reported Pin from public areas?",
  "suspend-user": "Suspend the reported User?",
};

export function ReportActionsPanel({
  canAct,
  reportId,
  targetType,
}: ReportActionsPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<ReportAction | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  if (!canAct) {
    return (
      <div className="rounded-md bg-neutral-50 px-3 py-3 text-sm text-neutral-500">
        This report has already been reviewed.
      </div>
    );
  }

  async function submitAction(action: ReportAction) {
    const confirmMessage = confirmMessageByAction[action];

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(action);

    try {
      const response = await fetch(`/api/admin/reports/${reportId}/${action}`, {
        body: JSON.stringify({ reviewNote }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        setError(
          result.errors?.report ??
            result.errors?.reviewNote ??
            result.errors?.auth ??
            "Action failed.",
        );
        return;
      }

      setReviewNote("");
      setSuccess(`${actionLabels[action]} saved.`);
      router.refresh();
    } catch {
      setError("Action failed.");
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-neutral-950">Review note</span>
        <textarea
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          maxLength={1000}
          rows={4}
          className="min-h-24 resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
          placeholder="Optional note for the audit trail"
        />
      </label>

      <div className="grid gap-2">
        <ActionButton
          action="review"
          isSubmitting={isSubmitting}
          onClick={submitAction}
          tone="neutral"
        />
        <ActionButton
          action="resolve"
          isSubmitting={isSubmitting}
          onClick={submitAction}
          tone="primary"
        />
        <ActionButton
          action="reject"
          isSubmitting={isSubmitting}
          onClick={submitAction}
          tone="neutral"
        />
        {targetType === "PIN" ? (
          <ActionButton
            action="remove-pin"
            isSubmitting={isSubmitting}
            onClick={submitAction}
            tone="danger"
          />
        ) : null}
        {targetType === "USER" ? (
          <ActionButton
            action="suspend-user"
            isSubmitting={isSubmitting}
            onClick={submitAction}
            tone="danger"
          />
        ) : null}
      </div>

      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function ActionButton({
  action,
  isSubmitting,
  onClick,
  tone,
}: {
  action: ReportAction;
  isSubmitting: ReportAction | null;
  onClick: (action: ReportAction) => void;
  tone: "danger" | "neutral" | "primary";
}) {
  const isBusy = Boolean(isSubmitting);

  return (
    <button
      type="button"
      disabled={isBusy}
      onClick={() => onClick(action)}
      aria-label={actionLabels[action]}
      className={`h-10 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[tone]}`}
    >
      {isSubmitting === action ? "Working..." : actionLabels[action]}
    </button>
  );
}

const toneClasses = {
  danger: "bg-red-700 text-white hover:bg-red-800",
  neutral: "border border-neutral-300 text-neutral-800 hover:border-neutral-950",
  primary: "bg-neutral-950 text-white hover:bg-neutral-800",
};
