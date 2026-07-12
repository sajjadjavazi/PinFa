"use client";

import type { ReportTargetType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/t";
import { getDictionary, t } from "@/lib/i18n/t";

type ReportAction =
  | "reject"
  | "remove-pin"
  | "review"
  | "resolve"
  | "suspend-user";

type ReportActionsPanelProps = {
  canAct: boolean;
  locale: Locale;
  reportId: string;
  targetType: ReportTargetType;
};

export function ReportActionsPanel({
  canAct,
  locale,
  reportId,
  targetType,
}: ReportActionsPanelProps) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<ReportAction | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  if (!canAct) {
    return (
      <div className="rounded-md bg-neutral-50 px-3 py-3 text-sm text-neutral-500">
        {t(dictionary, "admin.reports.alreadyReviewed")}
      </div>
    );
  }

  async function submitAction(action: ReportAction) {
    const confirmMessage = getConfirmMessage(dictionary, action);

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
            t(dictionary, "common.actionFailed"),
        );
        return;
      }

      setReviewNote("");
      setSuccess(
        t(dictionary, "admin.actions.complete", {
          action: getActionLabel(dictionary, action),
        }),
      );
      router.refresh();
    } catch {
      setError(t(dictionary, "common.actionFailed"));
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-neutral-950">
          {t(dictionary, "admin.actions.reviewNote")}
        </span>
        <textarea
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          maxLength={1000}
          rows={4}
          className="min-h-24 resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-950"
          placeholder={t(dictionary, "admin.actions.optionalAuditNote")}
        />
      </label>

      <div className="grid gap-2">
        <ActionButton
          action="review"
          dictionary={dictionary}
          isSubmitting={isSubmitting}
          onClick={submitAction}
          tone="neutral"
        />
        <ActionButton
          action="resolve"
          dictionary={dictionary}
          isSubmitting={isSubmitting}
          onClick={submitAction}
          tone="primary"
        />
        <ActionButton
          action="reject"
          dictionary={dictionary}
          isSubmitting={isSubmitting}
          onClick={submitAction}
          tone="neutral"
        />
        {targetType === "PIN" ? (
          <ActionButton
            action="remove-pin"
            dictionary={dictionary}
            isSubmitting={isSubmitting}
            onClick={submitAction}
            tone="danger"
          />
        ) : null}
        {targetType === "USER" ? (
          <ActionButton
            action="suspend-user"
            dictionary={dictionary}
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
  dictionary,
  isSubmitting,
  onClick,
  tone,
}: {
  action: ReportAction;
  dictionary: Dictionary;
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
      aria-label={getActionLabel(dictionary, action)}
      className={`h-10 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[tone]}`}
    >
      {isSubmitting === action
        ? t(dictionary, "common.working")
        : getActionLabel(dictionary, action)}
    </button>
  );
}

function getActionLabel(dictionary: Dictionary, action: ReportAction) {
  if (action === "review") {
    return t(dictionary, "admin.actions.markInReview");
  }

  if (action === "resolve") {
    return t(dictionary, "admin.actions.resolveReport");
  }

  if (action === "reject") {
    return t(dictionary, "admin.actions.rejectReport");
  }

  if (action === "remove-pin") {
    return t(dictionary, "admin.actions.removePin");
  }

  return t(dictionary, "admin.actions.suspendUser");
}

function getConfirmMessage(dictionary: Dictionary, action: ReportAction) {
  if (action === "remove-pin") {
    return t(dictionary, "admin.actions.removePin");
  }

  if (action === "suspend-user") {
    return t(dictionary, "admin.actions.suspendUser");
  }

  return null;
}

const toneClasses = {
  danger: "bg-red-700 text-white hover:bg-red-800",
  neutral: "border border-neutral-300 text-neutral-800 hover:border-neutral-950",
  primary: "bg-neutral-950 text-white hover:bg-neutral-800",
};
