"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ModerationAction = "approve" | "reject" | "remove";

type ModerationActionButtonProps = {
  action: ModerationAction;
  label: string;
  pinId: string;
  tone: "approve" | "reject" | "remove";
};

const toneClasses = {
  approve: "bg-emerald-700 text-white hover:bg-emerald-800",
  reject: "bg-red-700 text-white hover:bg-red-800",
  remove: "border border-neutral-300 text-neutral-800 hover:border-neutral-950",
};

export function ModerationActionButton({
  action,
  label,
  pinId,
  tone,
}: ModerationActionButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    if (
      action === "remove" &&
      !window.confirm("Remove this published Pin from public areas?")
    ) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/admin/pins/${pinId}/${action}`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.errors?.pin ?? result.errors?.auth ?? "Action failed.");
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
