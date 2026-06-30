"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReportAction = "reject" | "remove-pin" | "resolve" | "suspend-user";

type ReportActionButtonProps = {
  action: ReportAction;
  label: string;
  reportId: string;
  tone: "danger" | "neutral" | "primary";
};

const toneClasses = {
  danger: "bg-red-700 text-white hover:bg-red-800",
  neutral: "border border-neutral-300 text-neutral-800 hover:border-neutral-950",
  primary: "bg-neutral-950 text-white hover:bg-neutral-800",
};

const confirmMessageByAction: Partial<Record<ReportAction, string>> = {
  "remove-pin": "Remove the reported Pin from public areas?",
  "suspend-user": "Suspend the reported User?",
};

export function ReportActionButton({
  action,
  label,
  reportId,
  tone,
}: ReportActionButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    const confirmMessage = confirmMessageByAction[action];

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/admin/reports/${reportId}/${action}`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.errors?.report ?? result.errors?.auth ?? "Action failed.");
        return;
      }

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleClick}
        className={`h-10 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[tone]}`}
      >
        {isSubmitting ? "Working..." : label}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
