"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReportModal } from "@/components/social/ReportModal";

type PinSocialActionsProps = {
  initialLiked: boolean;
  initialLikeCount: number;
  initialReportCount: number;
  initialShareCount: number;
  isAuthenticated: boolean;
  pinId: string;
};

export function PinSocialActions({
  initialLiked,
  initialLikeCount,
  initialReportCount,
  initialShareCount,
  isAuthenticated,
  pinId,
}: PinSocialActionsProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [isLiking, setIsLiking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="grid gap-3 rounded-md border border-neutral-200 p-4">
        <p className="text-sm text-neutral-600">
          Log in to like, share, or report this Pin.
        </p>
        <Link
          href="/auth/login"
          className="grid h-10 place-items-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Log in
        </Link>
      </div>
    );
  }

  async function toggleLike() {
    setIsLiking(true);
    setMessage(null);

    const response = await fetch(`/api/pins/${pinId}/like`, {
      method: isLiked ? "DELETE" : "POST",
    });
    const result = await response.json();

    setIsLiking(false);

    if (response.status === 409) {
      setIsLiked(true);
      setLikeCount(result.likeCount ?? likeCount);
      setMessage(result.errors?.like ?? null);
      return;
    }

    if (!response.ok) {
      setMessage(result.errors?.pin ?? result.errors?.auth ?? "Action failed.");
      return;
    }

    setIsLiked(Boolean(result.liked));
    setLikeCount(result.likeCount ?? likeCount);
    router.refresh();
  }

  async function sharePin() {
    setIsSharing(true);
    setMessage(null);

    const response = await fetch(`/api/pins/${pinId}/share`, {
      method: "POST",
    });
    const result = await response.json();

    setIsSharing(false);

    if (!response.ok) {
      setMessage(result.errors?.pin ?? result.errors?.auth ?? "Share failed.");
      return;
    }

    setShareCount(result.shareCount ?? shareCount);

    try {
      if (navigator.share) {
        await navigator.share({
          title: result.title,
          url: result.url,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(result.url);
        setMessage("Link copied.");
      } else {
        setMessage(result.url);
      }
    } catch {
      setMessage("Share canceled.");
    }

    router.refresh();
  }

  return (
    <div className="grid gap-3 rounded-md border border-neutral-200 p-4">
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div>
          <p className="font-semibold text-neutral-950">{likeCount}</p>
          <p className="text-neutral-500">Likes</p>
        </div>
        <div>
          <p className="font-semibold text-neutral-950">{shareCount}</p>
          <p className="text-neutral-500">Shares</p>
        </div>
        <div>
          <p className="font-semibold text-neutral-950">{initialReportCount}</p>
          <p className="text-neutral-500">Reports</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={toggleLike}
          disabled={isLiking}
          className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {isLiking ? "Saving..." : isLiked ? "Unlike" : "Like"}
        </button>
        <button
          type="button"
          onClick={sharePin}
          disabled={isSharing}
          className="h-10 rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSharing ? "Sharing..." : "Share"}
        </button>
        <ReportModal
          buttonLabel="Report"
          isAuthenticated={isAuthenticated}
          targetId={pinId}
          targetType="PIN"
        />
      </div>

      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
    </div>
  );
}
