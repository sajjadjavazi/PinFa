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
  const [isSaved, setIsSaved] = useState(pin.savedByViewer);
  const [likeCount, setLikeCount] = useState(pin.likeCount);
  const [saveCount, setSaveCount] = useState(pin.saveCount);
  const [shareCount, setShareCount] = useState(pin.shareCount);
  const [selectedBoardId, setSelectedBoardId] = useState(boards[0]?.id ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveToBoard() {
    if (!isAuthenticated) {
      setMessage("Log in to save.");
      return;
    }

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

    setSaveCount(result.pin?.saveCount ?? saveCount + 1);
    setIsSaved(true);
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

  async function copyPublicLink() {
    setIsSharing(true);
    setMessage(null);

    const url = new URL(`/pins/${pin.id}`, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({
          title: pin.title,
          url,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setMessage("Link copied.");
      } else {
        setMessage(url);
      }
    } catch {
      setMessage("Share canceled.");
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <article className="group/card mb-2 break-inside-avoid overflow-visible [content-visibility:auto] [contain-intrinsic-size:260px]">
      <div className="relative">
        <div className="relative overflow-hidden rounded-lg bg-neutral-100">
          <Link
            href={`/pins/${pin.id}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
            aria-label={`Open ${pin.title}`}
          >
            <img
              src={pin.imageFeedUrl}
              alt={pin.title}
              loading="lazy"
              decoding="async"
              width={pin.width ?? undefined}
              height={pin.height ?? undefined}
              className="w-full bg-neutral-100 object-cover"
              style={{ aspectRatio: getAspectRatio(pin) }}
            />
          </Link>

          <div
            className="pointer-events-none absolute inset-0 hidden bg-black/0 transition md:block md:group-hover/card:bg-black/20 md:group-focus-within/card:bg-black/20"
            aria-hidden="true"
          />
        </div>
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2 md:opacity-0 md:transition md:group-hover/card:opacity-100 md:group-focus-within/card:opacity-100">
          <PrimarySaveControl
            boards={boards}
            isAuthenticated={isAuthenticated}
            isSaved={isSaved}
            isSaving={isSaving}
            onSave={saveToBoard}
          />
          <ActionMenu
            boards={boards}
            isAuthenticated={isAuthenticated}
            isLiked={isLiked}
            isLiking={isLiking}
            isSaved={isSaved}
            isSaving={isSaving}
            isSharing={isSharing}
            onLike={toggleLike}
            onSave={saveToBoard}
            onShare={isAuthenticated ? sharePin : copyPublicLink}
            pinId={pin.id}
            selectedBoardId={selectedBoardId}
            setSelectedBoardId={setSelectedBoardId}
          />
        </div>
      </div>

      <div className="grid gap-1 px-1.5 py-2">
        {pin.title ? (
          <Link
            href={`/pins/${pin.id}`}
            className="line-clamp-2 text-[13px] font-semibold leading-5 text-neutral-950 underline-offset-4 hover:underline"
          >
            {pin.title}
          </Link>
        ) : null}
        <p className="line-clamp-1 text-[11px] text-neutral-500">
          {pin.owner.displayName}
          {pin.category?.name ? ` - ${pin.category.name}` : ""}
        </p>
        {message ? (
          <p className="line-clamp-2 text-[11px] text-neutral-600">{message}</p>
        ) : null}
      </div>
    </article>
  );
}

export const FeedPinCard = memo(FeedPinCardComponent);
FeedPinCard.displayName = "FeedPinCard";

function PrimarySaveControl({
  boards,
  isAuthenticated,
  isSaved,
  isSaving,
  onSave,
}: {
  boards: BoardOption[];
  isAuthenticated: boolean;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className="pointer-events-auto hidden h-9 place-items-center rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 md:grid"
      >
        Save
      </Link>
    );
  }

  if (boards.length === 0) {
    return (
      <Link
        href="/boards/new"
        className="pointer-events-auto hidden h-9 place-items-center rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 md:grid"
      >
        Board
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving || isSaved}
      aria-label={isSaved ? "Pin already saved" : "Save Pin to selected Board"}
      className="pointer-events-auto hidden h-9 rounded-full bg-red-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-neutral-600 md:block"
    >
      {isSaving ? "Saving" : isSaved ? "Saved" : "Save"}
    </button>
  );
}

function ActionMenu({
  boards,
  isAuthenticated,
  isLiked,
  isLiking,
  isSaved,
  isSaving,
  isSharing,
  onLike,
  onSave,
  onShare,
  pinId,
  selectedBoardId,
  setSelectedBoardId,
}: {
  boards: BoardOption[];
  isAuthenticated: boolean;
  isLiked: boolean;
  isLiking: boolean;
  isSaved: boolean;
  isSaving: boolean;
  isSharing: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  pinId: string;
  selectedBoardId: string;
  setSelectedBoardId: (boardId: string) => void;
}) {
  return (
    <details className="pointer-events-auto relative ml-auto">
      <summary
        aria-label="Open Pin actions"
        className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full bg-white/95 text-lg font-semibold leading-none text-neutral-950 shadow-sm transition hover:bg-white [&::-webkit-details-marker]:hidden"
      >
        ...
      </summary>
      <div className="absolute right-0 z-30 mt-2 grid w-48 gap-2 rounded-lg border border-neutral-200 bg-white p-2 text-sm shadow-xl">
        <SaveMenuItem
          boards={boards}
          isAuthenticated={isAuthenticated}
          isSaved={isSaved}
          isSaving={isSaving}
          onSave={onSave}
          selectedBoardId={selectedBoardId}
          setSelectedBoardId={setSelectedBoardId}
        />

        {isAuthenticated ? (
          <button
            type="button"
            onClick={onLike}
            disabled={isLiking}
            aria-label={isLiked ? "Unlike Pin" : "Like Pin"}
            className={menuButtonClassName}
          >
            {isLiking ? "Working..." : isLiked ? "Unlike" : "Like"}
          </button>
        ) : (
          <Link href="/auth/login" className={menuLinkClassName}>
            Like
          </Link>
        )}

        <button
          type="button"
          onClick={onShare}
          disabled={isSharing}
          aria-label="Share Pin"
          className={menuButtonClassName}
        >
          {isSharing ? "Sharing..." : "Share"}
        </button>

        <ReportModal
          buttonAriaLabel="Report Pin"
          buttonLabel="Report"
          buttonClassName={menuButtonClassName}
          isAuthenticated={isAuthenticated}
          loginClassName={menuLinkClassName}
          loginLabel="Report"
          targetId={pinId}
          targetType="PIN"
        />
      </div>
    </details>
  );
}

function SaveMenuItem({
  boards,
  isAuthenticated,
  isSaved,
  isSaving,
  onSave,
  selectedBoardId,
  setSelectedBoardId,
}: {
  boards: BoardOption[];
  isAuthenticated: boolean;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  selectedBoardId: string;
  setSelectedBoardId: (boardId: string) => void;
}) {
  if (!isAuthenticated) {
    return (
      <Link href="/auth/login" className={menuLinkClassName}>
        Save
      </Link>
    );
  }

  if (boards.length === 0) {
    return (
      <Link href="/boards/new" className={menuLinkClassName}>
        Create Board
      </Link>
    );
  }

  return (
    <div className="grid gap-2 border-b border-neutral-100 pb-2">
      <label className="grid gap-1 text-xs font-medium text-neutral-500">
        Board
        <select
          value={selectedBoardId}
          onChange={(event) => setSelectedBoardId(event.target.value)}
          className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm font-normal text-neutral-950 outline-none transition focus:border-neutral-950"
        >
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || isSaved}
        aria-label={isSaved ? "Pin already saved" : "Save Pin to Board"}
        className="h-9 rounded-md bg-neutral-950 px-3 text-left text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSaving ? "Saving..." : isSaved ? "Saved" : "Save to Board"}
      </button>
    </div>
  );
}

const menuButtonClassName =
  "h-9 rounded-md px-3 text-left text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50";

const menuLinkClassName =
  "grid h-9 items-center rounded-md px-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100";

function getAspectRatio(pin: FeedPinItem) {
  if (!pin.width || !pin.height) {
    return "4 / 3";
  }

  return `${pin.width} / ${pin.height}`;
}
