"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { ReportModal } from "@/components/social/ReportModal";
import type { FeedPinItem } from "@/lib/feed";

type BoardOption = {
  id: string;
  pinCount: number;
  title: string;
};

type FeedPinCardProps = {
  boards: BoardOption[];
  isAuthenticated: boolean;
  pin: FeedPinItem;
};

function FeedPinCardComponent({
  boards,
  isAuthenticated,
  pin,
}: FeedPinCardProps) {
  const [isLiked, setIsLiked] = useState(pin.likedByViewer);
  const [likeCount, setLikeCount] = useState(pin.likeCount);
  const [saveCount, setSaveCount] = useState(pin.saveCount);
  const [shareCount, setShareCount] = useState(pin.shareCount);
  const [selectedBoardId, setSelectedBoardId] = useState(boards[0]?.id ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveToBoard() {
    if (!selectedBoardId) {
      setMessage("Create a Board first.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const response = await fetch(`/api/pins/${pin.id}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        boardId: selectedBoardId,
      }),
    });
    const result = await response.json();

    setIsSaving(false);

    if (!response.ok) {
      setMessage(
        result.errors?.save ??
          result.errors?.boardId ??
          result.errors?.pin ??
          result.errors?.auth ??
          "Save failed.",
      );
      return;
    }

    setSaveCount((count) => count + 1);
    setMessage("Saved.");
  }

  async function toggleLike() {
    setIsLiking(true);
    setMessage(null);

    const response = await fetch(`/api/pins/${pin.id}/like`, {
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
  }

  async function sharePin() {
    setIsSharing(true);
    setMessage(null);

    const response = await fetch(`/api/pins/${pin.id}/share`, {
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
  }

  return (
    <article className="mb-5 break-inside-avoid overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm [content-visibility:auto] [contain-intrinsic-size:320px]">
      <Link href={`/pins/${pin.id}`} className="group block">
        <img
          src={pin.imageFeedUrl}
          alt={pin.title}
          loading="lazy"
          decoding="async"
          width={pin.width ?? undefined}
          height={pin.height ?? undefined}
          className="w-full bg-neutral-100 object-cover transition group-hover:brightness-95"
          style={{ aspectRatio: getAspectRatio(pin) }}
        />
        <div className="grid gap-2 p-3">
          <p className="text-xs font-medium text-neutral-500">
            {pin.category?.name ?? "Uncategorized"}
          </p>
          <h2 className="text-sm font-semibold leading-6 text-neutral-950 group-hover:underline">
            {pin.title}
          </h2>
          <p className="text-xs text-neutral-500">
            by {pin.owner.displayName}
          </p>
        </div>
      </Link>

      <div className="grid gap-3 border-t border-neutral-100 p-3">
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-neutral-500">
          <span>{likeCount} likes</span>
          <span>{saveCount} saves</span>
          <span>{shareCount} shares</span>
        </div>

        <div className="grid gap-2">
          {isAuthenticated ? (
            boards.length > 0 ? (
              <details className="rounded-md border border-neutral-200">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-neutral-800">
                  Save
                </summary>
                <div className="grid gap-2 border-t border-neutral-200 p-3">
                  <select
                    value={selectedBoardId}
                    onChange={(event) => setSelectedBoardId(event.target.value)}
                    className="h-10 rounded-md border border-neutral-300 bg-white px-2 text-sm outline-none transition focus:border-neutral-950"
                  >
                    {boards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.title} ({board.pinCount})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={saveToBoard}
                    disabled={isSaving}
                    className="h-9 rounded-md bg-neutral-950 px-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                  >
                    {isSaving ? "Saving..." : "Save Pin"}
                  </button>
                </div>
              </details>
            ) : (
              <Link
                href="/boards/new"
                className="grid h-9 place-items-center rounded-md bg-neutral-950 px-3 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Create Board
              </Link>
            )
          ) : (
            <Link
              href="/auth/login"
              className="grid h-9 place-items-center rounded-md bg-neutral-950 px-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Log in to save
            </Link>
          )}

          <div className="grid grid-cols-3 gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={toggleLike}
                disabled={isLiking}
                className="h-9 rounded-md border border-neutral-300 px-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLiking ? "..." : isLiked ? "Unlike" : "Like"}
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="grid h-9 place-items-center rounded-md border border-neutral-300 px-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
              >
                Like
              </Link>
            )}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={sharePin}
                disabled={isSharing}
                className="h-9 rounded-md border border-neutral-300 px-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSharing ? "..." : "Share"}
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="grid h-9 place-items-center rounded-md border border-neutral-300 px-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-950"
              >
                Share
              </Link>
            )}
            <ReportModal
              buttonLabel="Report"
              isAuthenticated={isAuthenticated}
              loginLabel="Report"
              targetId={pin.id}
              targetType="PIN"
            />
          </div>
        </div>

        {message ? <p className="text-xs text-neutral-600">{message}</p> : null}
      </div>
    </article>
  );
}

export const FeedPinCard = memo(FeedPinCardComponent);
FeedPinCard.displayName = "FeedPinCard";

function getAspectRatio(pin: FeedPinItem) {
  if (!pin.width || !pin.height) {
    return "4 / 3";
  }

  return `${pin.width} / ${pin.height}`;
}
