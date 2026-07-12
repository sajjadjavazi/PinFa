"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FeedPinCard } from "@/components/feed/FeedPinCard";
import { NativeAdCard } from "@/components/feed/NativeAdCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Locale } from "@/lib/i18n/config";
import type { FeedItem, HomeFeedPage } from "@/lib/feed";
import { getDictionary, t } from "@/lib/i18n/t";

type BoardOption = {
  id: string;
  pinCount: number;
  title: string;
};

type HomeFeedProps = {
  boards: BoardOption[];
  initialPage: HomeFeedPage;
  initialError?: string | null;
  isAuthenticated: boolean;
  locale: Locale;
};

export function HomeFeed({
  boards,
  initialError = null,
  initialPage,
  isAuthenticated,
  locale,
}: HomeFeedProps) {
  const dictionary = getDictionary(locale);
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/feed/home?cursor=${encodeURIComponent(nextCursor)}&limit=24`,
      );

      if (!response.ok) {
        setError(t(dictionary, "feed.loadMoreFailed"));
        return;
      }

      const page = (await response.json()) as HomeFeedPage;

      setItems((currentItems) => mergeFeedItems(currentItems, page.items));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      setError(t(dictionary, "feed.loadMoreFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [dictionary, isLoading, nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void loadMore();
        }
      },
      {
        rootMargin: "640px 0px",
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (items.length === 0) {
    if (error) {
      return (
        <div className="grid gap-4 rounded-md border border-red-200 bg-red-50 px-4 py-8 text-center">
          <h2 className="text-base font-semibold text-red-900">
            {t(dictionary, "feed.homeCouldNotLoad")}
          </h2>
          <p className="mx-auto max-w-md text-sm leading-6 text-red-700">
            {error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mx-auto h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white transition hover:bg-red-800"
          >
            {t(dictionary, "common.retry")}
          </button>
        </div>
      );
    }

    return (
      <EmptyState
        actionHref={isAuthenticated ? "/upload" : "/auth/register"}
        actionLabel={
          isAuthenticated ? t(dictionary, "feed.uploadPin") : t(dictionary, "feed.createAccount")
        }
        description={t(dictionary, "feed.emptyDescription")}
        title={t(dictionary, "feed.emptyTitle")}
      />
    );
  }

  return (
    <section className="grid gap-5">
      <div className="columns-2 gap-2 sm:columns-3 lg:columns-4 2xl:columns-5">
        {items.map((item) => (
          <FeedItemCard
            key={item.id}
            boards={boards}
            isAuthenticated={isAuthenticated}
            item={item}
            locale={locale}
          />
        ))}
      </div>

      {isLoading ? <FeedSkeletonGrid label={t(dictionary, "feed.loadingMorePins")} /> : null}

      {error ? (
        <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadMore()}
            className="h-9 rounded-md bg-red-700 px-3 text-sm font-medium text-white transition hover:bg-red-800"
          >
            {t(dictionary, "common.retry")}
          </button>
        </div>
      ) : null}

      {hasMore ? (
        <>
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={isLoading}
            className="mx-auto h-11 rounded-md bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            {isLoading ? t(dictionary, "feed.loading") : t(dictionary, "feed.loadMore")}
          </button>
        </>
      ) : (
        <p className="text-center text-sm text-neutral-500">
          {t(dictionary, "feed.caughtUp")}
        </p>
      )}
    </section>
  );
}

function mergeFeedItems(
  currentItems: FeedItem[],
  nextItems: FeedItem[],
) {
  const seen = new Set(currentItems.map((item) => item.id));
  const merged = [...currentItems];

  for (const item of nextItems) {
    if (!seen.has(item.id)) {
      merged.push(item);
      seen.add(item.id);
    }
  }

  return merged;
}

function FeedItemCard({
  boards,
  isAuthenticated,
  item,
  locale,
}: {
  boards: BoardOption[];
  isAuthenticated: boolean;
  item: FeedItem;
  locale: Locale;
}) {
  if (item.type === "PIN") {
    return (
      <FeedPinCard
        boards={boards}
        isAuthenticated={isAuthenticated}
        locale={locale}
        pin={item.pin}
      />
    );
  }

  if (item.type === "AD") {
    return <NativeAdCard ad={item.ad} locale={locale} />;
  }

  return null;
}

function FeedSkeletonGrid({ label }: { label: string }) {
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
      aria-label={label}
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="h-48 animate-pulse rounded-lg bg-neutral-100 sm:h-56"
        />
      ))}
    </div>
  );
}
