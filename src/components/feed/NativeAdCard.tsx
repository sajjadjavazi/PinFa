"use client";

import { memo } from "react";
import type { FeedAdItem } from "@/lib/ads/ad-provider";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/t";

type NativeAdCardProps = {
  ad: FeedAdItem;
  locale: Locale;
};

function NativeAdCardComponent({ ad, locale }: NativeAdCardProps) {
  const dictionary = getDictionary(locale);
  const href = getSafeExternalUrl(ad.clickUrl);

  function recordClick() {
    const payload = JSON.stringify({
      adReference: ad.adReference,
      placement: ad.placement,
      provider: ad.provider,
      slotId: ad.slotId,
    });

    if (navigator.sendBeacon) {
      const body = new Blob([payload], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/ads/events/click", body);
      return;
    }

    void fetch("/api/ads/events/click", {
      body: payload,
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    });
  }

  return (
    <article className="mb-2 break-inside-avoid overflow-hidden rounded-lg bg-white [content-visibility:auto] [contain-intrinsic-size:260px]">
      <a
        href={href}
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
          <div className="grid aspect-[4/3] place-items-center rounded-lg bg-neutral-100 px-4 text-center">
            <span className="text-sm font-medium text-neutral-500">
              {t(dictionary, "ads.fallbackLabel")}
            </span>
          </div>
        )}

        <div className="grid gap-1.5 px-1.5 py-2">
          <span className="w-fit rounded-sm bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-500">
            {t(dictionary, "ads.label")}
          </span>
          <h2 className="line-clamp-2 text-[13px] font-semibold leading-5 text-neutral-950 group-hover:underline">
            {ad.title}
          </h2>
          {ad.body ? (
            <p className="line-clamp-2 text-[11px] leading-4 text-neutral-600">
              {ad.body}
            </p>
          ) : null}
          {ad.callToAction ? (
            <p className="text-[11px] font-semibold text-neutral-950">
              {ad.callToAction}
            </p>
          ) : null}
        </div>
      </a>
    </article>
  );
}

export const NativeAdCard = memo(NativeAdCardComponent);
NativeAdCard.displayName = "NativeAdCard";

function getSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
  } catch {
    // Fall through to the safe provider landing page.
  }

  return "https://www.yektanet.com/";
}
