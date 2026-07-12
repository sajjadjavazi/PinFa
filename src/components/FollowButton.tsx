"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type FollowButtonProps = {
  userId: string;
  initialFollowing: boolean;
  locale: Locale;
};

export function FollowButton({
  userId,
  initialFollowing,
  locale,
}: FollowButtonProps) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function toggleFollow() {
    setIsSubmitting(true);
    const response = await fetch(`/api/users/${userId}/follow`, {
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
      aria-label={
        isFollowing ? t(dictionary, "follow.unfollowUser") : t(dictionary, "follow.followUser")
      }
      className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
    >
      {isSubmitting
        ? t(dictionary, "follow.saving")
        : isFollowing
          ? t(dictionary, "follow.following")
          : t(dictionary, "follow.follow")}
    </button>
  );
}
