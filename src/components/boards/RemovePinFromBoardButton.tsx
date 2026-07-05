"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RemovePinFromBoardButtonProps = {
  boardId: string;
  pinId: string;
};

export function RemovePinFromBoardButton({
  boardId,
  pinId,
}: RemovePinFromBoardButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function removePin() {
    if (!window.confirm("Remove this Pin from the Board?")) {
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
      setError(result.errors?.pin ?? result.errors?.board ?? "Remove failed.");
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
        className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Removing..." : "Remove"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
