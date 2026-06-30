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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function toggleFollow() {
    setIsSubmitting(true);
    const response = await fetch(`/api/boards/${boardId}/follow`, {
      method: isFollowing ? "DELETE" : "POST",
    });

    setIsSubmitting(false);

    if (!response.ok) {
      return;
    }

    setIsFollowing(!isFollowing);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={isSubmitting}
      className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {isSubmitting ? "Saving..." : isFollowing ? "Following" : "Follow Board"}
    </button>
  );
}
