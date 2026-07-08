"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BoardFollowButtonProps = {
  boardId: string;
  initialFollowing: boolean;
};

export function BoardFollowButton({
  boardId,
  initialFollowing,
}: BoardFollowButtonProps) {
  const router = useRouter();
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
      setError(result.errors?.board ?? result.errors?.auth ?? "Action failed.");
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
        aria-label={isFollowing ? "Unfollow Board" : "Follow Board"}
        className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSubmitting ? "Updating..." : isFollowing ? "Following" : "Follow Board"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
