"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type BoardFollowButtonProps = {
  boardId: string;
  initialFollowing: boolean;
  locale: Locale;
};

export function BoardFollowButton({
  boardId,
  initialFollowing,
  locale,
}: BoardFollowButtonProps) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function toggleFollow() {
    setError(null);
    setIsSubmitting(true);
    const response = await fetch(`/api/boards/${boardId}/follow`, {
      method: isFollowing ? "DELETE" : "POST",
    });
    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setError(result.errors?.board ?? result.errors?.auth ?? t(dictionary, "board.followFailed"));
      return;
    }

    setIsFollowing(Boolean(result.following));
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={toggleFollow}
        disabled={isSubmitting}
        aria-label={
          isFollowing ? t(dictionary, "board.unfollowBoard") : t(dictionary, "board.followBoard")
        }
        className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting
          ? t(dictionary, "board.updating")
          : isFollowing
            ? t(dictionary, "board.following")
            : t(dictionary, "board.followBoard")}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
