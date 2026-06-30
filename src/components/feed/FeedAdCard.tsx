"use client";

import { memo } from "react";
import type { FeedAdItem } from "@/lib/ads/ad-provider";

type FeedAdCardProps = {
  ad: FeedAdItem;
};

function FeedAdCardComponent({ ad }: FeedAdCardProps) {
  function recordClick() {
    const payload = JSON.stringify({
      adReference: ad.adReference,
      slotId: ad.slotId,
    });

    if (navigator.sendBeacon) {
      const body = new Blob([payload], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/ads/click", body);
      return;
    }

    void fetch("/api/ads/click", {
      body: payload,
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    });
  }

  return (
    <article className="mb-5 break-inside-avoid overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm [content-visibility:auto] [contain-intrinsic-size:300px]">
      <a
        href={ad.clickUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={recordClick}
        className="group block"
      >
        {ad.imageUrl ? (
          <img
            src={ad.imageUrl}
            alt={ad.title}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full bg-neutral-100 object-cover transition group-hover:brightness-95"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center bg-neutral-100 px-6 text-center">
            <span className="text-sm font-medium text-neutral-500">
              Advertisement
            </span>
          </div>
        )}

        <div className="grid gap-2 p-3">
          <span className="w-fit rounded-sm border border-neutral-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            {ad.label}
          </span>
          <h2 className="text-sm font-semibold leading-6 text-neutral-950 group-hover:underline">
            {ad.title}
          </h2>
          {ad.body ? (
            <p className="text-xs leading-5 text-neutral-600">{ad.body}</p>
          ) : null}
          {ad.callToAction ? (
            <p className="text-xs font-semibold text-neutral-950">
              {ad.callToAction}
            </p>
          ) : null}
        </div>
      </a>
    </article>
  );
}

export const FeedAdCard = memo(FeedAdCardComponent);
FeedAdCard.displayName = "FeedAdCard";
