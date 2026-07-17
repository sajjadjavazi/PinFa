"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { ReportModal } from "@/components/social/ReportModal";
import type { FeedPinItem } from "@/lib/feed";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type BoardOption = {
  id: string;
  pinCount: number;
  title: string;
};

type FeedPinCardProps = {
  boards: BoardOption[];
  isAuthenticated: boolean;
  locale: Locale;
  pin: FeedPinItem;
};

function FeedPinCardComponent({
  boards,
  isAuthenticated,
  locale,
  pin,
}: FeedPinCardProps) {
  const dictionary = getDictionary(locale);
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
      setMessage(t(dictionary, "feed.loginToSave"));
      return;
    }

    if (!selectedBoardId) {
      setMessage(t(dictionary, "feed.createBoardFirst"));
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
          t(dictionary, "feed.saveFailed"),
      );
      return;
    }

    setSaveCount(result.pin?.saveCount ?? saveCount + 1);
    setIsSaved(true);
    setMessage(t(dictionary, "feed.saved"));
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
      setMessage(result.errors?.pin ?? result.errors?.auth ?? t(dictionary, "feed.actionFailed"));
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
      setMessage(result.errors?.pin ?? result.errors?.auth ?? t(dictionary, "feed.shareFailed"));
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
        setMessage(t(dictionary, "feed.linkCopied"));
      } else {
        setMessage(result.url);
      }
    } catch {
      setMessage(t(dictionary, "feed.shareCanceled"));
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
        setMessage(t(dictionary, "feed.linkCopied"));
      } else {
        setMessage(url);
      }
    } catch {
      setMessage(t(dictionary, "feed.shareCanceled"));
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
            aria-label={t(dictionary, "feed.openPin", { title: pin.title })}
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
            locale={locale}
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
            locale={locale}
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
            dir="auto"
            className="line-clamp-2 text-[13px] font-semibold leading-5 text-neutral-950 underline-offset-4 hover:underline"
          >
            {pin.title}
          </Link>
        ) : null}
        <p dir="auto" className="line-clamp-1 text-[11px] text-neutral-500">
          {pin.owner.displayName}
          {pin.category?.name ? ` - ${pin.category.name}` : ""}
        </p>
        {message ? (
          <p dir="auto" className="line-clamp-2 text-[11px] text-neutral-600">
            {message}
          </p>
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
  locale,
  onSave,
}: {
  boards: BoardOption[];
  isAuthenticated: boolean;
  isSaved: boolean;
  isSaving: boolean;
  locale: Locale;
  onSave: () => void;
}) {
  const dictionary = getDictionary(locale);

  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className="pointer-events-auto hidden h-9 place-items-center rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 md:grid"
      >
        {t(dictionary, "feed.save")}
      </Link>
    );
  }

  if (boards.length === 0) {
    return (
      <Link
        href="/boards/new"
        className="pointer-events-auto hidden h-9 place-items-center rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 md:grid"
      >
        {t(dictionary, "feed.board")}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving || isSaved}
      aria-label={
        isSaved
          ? t(dictionary, "feed.alreadySaved")
          : t(dictionary, "feed.savePinToSelectedBoard")
      }
      className="pointer-events-auto hidden h-9 rounded-full bg-red-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-neutral-600 md:block"
    >
      {isSaving
        ? t(dictionary, "feed.saving")
        : isSaved
          ? t(dictionary, "feed.saved")
          : t(dictionary, "feed.save")}
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
  locale,
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
  locale: Locale;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  pinId: string;
  selectedBoardId: string;
  setSelectedBoardId: (boardId: string) => void;
}) {
  const dictionary = getDictionary(locale);

  return (
    <details className="pointer-events-auto relative ms-auto">
      <summary
        aria-label={t(dictionary, "feed.openPinActions")}
        className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-full bg-white/95 text-lg font-semibold leading-none text-neutral-950 shadow-sm transition hover:bg-white [&::-webkit-details-marker]:hidden"
      >
        ...
      </summary>
      <div className="absolute end-0 z-30 mt-2 grid w-48 gap-2 rounded-lg border border-neutral-200 bg-white p-2 text-sm shadow-xl">
        <SaveMenuItem
          boards={boards}
          isAuthenticated={isAuthenticated}
          isSaved={isSaved}
          isSaving={isSaving}
          locale={locale}
          onSave={onSave}
          selectedBoardId={selectedBoardId}
          setSelectedBoardId={setSelectedBoardId}
        />

        {isAuthenticated ? (
          <button
            type="button"
            onClick={onLike}
            disabled={isLiking}
            aria-label={
              isLiked ? t(dictionary, "social.unlikePin") : t(dictionary, "social.likePin")
            }
            className={menuButtonClassName}
          >
            {isLiking
              ? t(dictionary, "common.working")
              : isLiked
                ? t(dictionary, "social.unlike")
                : t(dictionary, "social.like")}
          </button>
        ) : (
          <Link href="/auth/login" className={menuLinkClassName}>
            {t(dictionary, "social.like")}
          </Link>
        )}

        <button
          type="button"
          onClick={onShare}
          disabled={isSharing}
          aria-label={t(dictionary, "social.share")}
          className={menuButtonClassName}
        >
          {isSharing ? t(dictionary, "social.sharing") : t(dictionary, "social.share")}
        </button>

        <ReportModal
          buttonAriaLabel={t(dictionary, "report.reportTarget", {
            target: t(dictionary, "enums.targetType.PIN"),
          })}
          buttonLabel={t(dictionary, "report.report")}
          buttonClassName={menuButtonClassName}
          isAuthenticated={isAuthenticated}
          loginClassName={menuLinkClassName}
          loginLabel={t(dictionary, "report.report")}
          locale={locale}
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
  locale,
  onSave,
  selectedBoardId,
  setSelectedBoardId,
}: {
  boards: BoardOption[];
  isAuthenticated: boolean;
  isSaved: boolean;
  isSaving: boolean;
  locale: Locale;
  onSave: () => void;
  selectedBoardId: string;
  setSelectedBoardId: (boardId: string) => void;
}) {
  const dictionary = getDictionary(locale);

  if (!isAuthenticated) {
    return (
      <Link href="/auth/login" className={menuLinkClassName}>
        {t(dictionary, "feed.save")}
      </Link>
    );
  }

  if (boards.length === 0) {
    return (
      <Link href="/boards/new" className={menuLinkClassName}>
        {t(dictionary, "feed.createBoard")}
      </Link>
    );
  }

  return (
    <div className="grid gap-2 border-b border-neutral-100 pb-2">
      <label className="grid gap-1 text-xs font-medium text-neutral-500">
        {t(dictionary, "feed.board")}
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
        aria-label={
          isSaved ? t(dictionary, "feed.alreadySaved") : t(dictionary, "feed.savePinToBoard")
        }
        className="h-9 rounded-md bg-neutral-950 px-3 text-start text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {isSaving
          ? t(dictionary, "feed.savingDots")
          : isSaved
            ? t(dictionary, "feed.saved")
            : t(dictionary, "feed.saveToBoard")}
      </button>
    </div>
  );
}

const menuButtonClassName =
  "h-9 rounded-md px-3 text-start text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50";

const menuLinkClassName =
  "grid h-9 items-center rounded-md px-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100";

function getAspectRatio(pin: FeedPinItem) {
  if (!pin.width || !pin.height) {
    return "4 / 3";
  }

  return `${pin.width} / ${pin.height}`;
}
