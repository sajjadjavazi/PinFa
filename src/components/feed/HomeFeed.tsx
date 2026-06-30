"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FeedAdCard } from "@/components/feed/FeedAdCard";
import { FeedPinCard } from "@/components/feed/FeedPinCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FeedItem, HomeFeedPage } from "@/lib/feed";

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
};

export function HomeFeed({
  boards,
  initialError = null,
  initialPage,
  isAuthenticated,
}: HomeFeedProps) {
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.next_cursor);
  const [hasMore, setHasMore] = useState(initialPage.has_more);
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
        `/feed/home?cursor=${encodeURIComponent(nextCursor)}&limit=24`,
      );

      if (!response.ok) {
        setError("Feed could not load more Pins.");
        return;
      }

      const page = (await response.json()) as HomeFeedPage;

      setItems((currentItems) => mergeFeedItems(currentItems, page.items));
      setNextCursor(page.next_cursor);
      setHasMore(page.has_more);
    } catch {
      setError("Feed could not load more Pins.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nextCursor]);

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
            Home Feed could not load.
          </h2>
          <p className="mx-auto max-w-md text-sm leading-6 text-red-700">
            {error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mx-auto h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white transition hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <EmptyState
        actionHref={isAuthenticated ? "/upload" : "/auth/register"}
        actionLabel={isAuthenticated ? "Upload a Pin" : "Create an account"}
        description="Published Pins will appear here after image processing and moderation."
        title="No published Pins yet"
      />
    );
  }

  return (
    <section className="grid gap-6">
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
        {items.map((item) =>
          item.type === "PIN" ? (
            <FeedPinCard
              key={getFeedItemKey(item)}
              boards={boards}
              isAuthenticated={isAuthenticated}
              pin={item.pin}
            />
          ) : (
            <FeedAdCard key={getFeedItemKey(item)} ad={item.ad} />
          ),
        )}
      </div>

      {isLoading ? <FeedSkeletonGrid /> : null}

      {error ? (
        <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadMore()}
            className="h-9 rounded-md bg-red-700 px-3 text-sm font-medium text-white transition hover:bg-red-800"
          >
            Retry
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
            {isLoading ? "Loading..." : "Load more"}
          </button>
        </>
      ) : (
        <p className="text-center text-sm text-neutral-500">You are caught up.</p>
      )}
    </section>
  );
}

function mergeFeedItems(currentItems: FeedItem[], nextItems: FeedItem[]) {
  const seen = new Set(currentItems.map(getFeedItemKey));
  const merged = [...currentItems];

  for (const item of nextItems) {
    const key = getFeedItemKey(item);

    if (!seen.has(key)) {
      merged.push(item);
      seen.add(key);
    }
  }

  return merged;
}

function getFeedItemKey(item: FeedItem) {
  return `${item.type}:${item.id}`;
}

function FeedSkeletonGrid() {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-label="Loading more Pins"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-md bg-neutral-100"
        />
      ))}
    </div>
  );
}
