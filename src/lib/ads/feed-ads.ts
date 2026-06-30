import { AdEventType, AdPlacement } from "@prisma/client";
import type { AdSlotForProvider } from "@/lib/ads/ad-provider";
import { recordAdEvent } from "@/lib/ads/ad-events";
import { getAdProvider } from "@/lib/ads/providers";
import { logAnalyticsError, logAnalyticsEvent } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import type { FeedItem, FeedPinItem } from "@/lib/feed";

export async function insertHomeFeedAds(input: {
  organicSinceLastAd?: number;
  pins: FeedPinItem[];
  viewerUserId?: string | null;
}): Promise<{
  items: FeedItem[];
  organicSinceLastAd: number;
}> {
  const pinItems = input.pins.map((pin) => wrapPin(pin));

  if (input.pins.length === 0) {
    return {
      items: pinItems,
      organicSinceLastAd: input.organicSinceLastAd ?? 0,
    };
  }

  const slot = await getActiveHomeFeedAdSlot();
  const frequency = slot ? normalizeFrequency(slot.frequencyEvery) : null;

  if (!slot || !frequency) {
    return {
      items: pinItems,
      organicSinceLastAd: 0,
    };
  }

  const mixedItems: FeedItem[] = [];
  let organicSinceLastAd = Math.min(
    Math.max(0, input.organicSinceLastAd ?? 0),
    frequency - 1,
  );
  let adOrdinal = 0;

  for (const pin of input.pins) {
    mixedItems.push(wrapPin(pin));
    organicSinceLastAd += 1;

    if (organicSinceLastAd < frequency) {
      continue;
    }

    adOrdinal += 1;
    const adItem = await requestHomeFeedAd({
      ordinal: adOrdinal,
      slot,
      viewerUserId: input.viewerUserId,
    });

    if (adItem) {
      mixedItems.push(adItem);
    }

    organicSinceLastAd = 0;
  }

  return {
    items: mixedItems,
    organicSinceLastAd,
  };
}

export async function getActiveHomeFeedAdSlot() {
  return prisma.adSlot.findFirst({
    where: {
      isActive: true,
      placement: AdPlacement.HOME_FEED_INLINE,
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      frequencyEvery: true,
      id: true,
      name: true,
      placement: true,
      provider: true,
      providerConfigJson: true,
    },
  });
}

async function requestHomeFeedAd(input: {
  ordinal: number;
  slot: AdSlotForProvider;
  viewerUserId?: string | null;
}): Promise<FeedItem | null> {
  await recordAdEvent({
    eventType: AdEventType.AD_SLOT_REQUESTED,
    metadataJson: {
      ordinal: input.ordinal,
      source: "home_feed",
    },
    placement: input.slot.placement,
    provider: input.slot.provider,
    slotId: input.slot.id,
    userId: input.viewerUserId,
  });

  const provider = getAdProvider(input.slot.provider);

  if (!provider) {
    logAnalyticsEvent("ads.provider.unsupported", {
      provider: input.slot.provider,
      slotId: input.slot.id,
    });

    await recordAdEvent({
      eventType: AdEventType.AD_FAILED,
      metadataJson: {
        ordinal: input.ordinal,
        reason: "unsupported_provider",
        source: "home_feed",
      },
      placement: input.slot.placement,
      provider: input.slot.provider,
      slotId: input.slot.id,
      userId: input.viewerUserId,
    });

    return null;
  }

  try {
    const ad = await provider.renderAd({
      ordinal: input.ordinal,
      slot: input.slot,
      viewerUserId: input.viewerUserId,
    });

    if (!ad) {
      logAnalyticsEvent("ads.provider.empty", {
        provider: input.slot.provider,
        slotId: input.slot.id,
      });

      await recordAdEvent({
        eventType: AdEventType.AD_FAILED,
        metadataJson: {
          ordinal: input.ordinal,
          reason: "empty_provider_payload",
          source: "home_feed",
        },
        placement: input.slot.placement,
        provider: input.slot.provider,
        slotId: input.slot.id,
        userId: input.viewerUserId,
      });

      return null;
    }

    await recordAdEvent({
      adReference: ad.adReference,
      eventType: AdEventType.AD_SLOT_RENDERED,
      metadataJson: {
        ordinal: input.ordinal,
        source: "home_feed",
      },
      placement: input.slot.placement,
      provider: input.slot.provider,
      slotId: input.slot.id,
      userId: input.viewerUserId,
    });

    return {
      ad,
      id: `ad:${ad.slotId}:${ad.adReference}`,
      type: "AD",
    };
  } catch (error) {
    logAnalyticsError("ads.provider.failed", error, {
      phase: "render",
      provider: input.slot.provider,
      slotId: input.slot.id,
    });

    await provider.handleFailure?.({
      error,
      phase: "render",
      slot: input.slot,
      userId: input.viewerUserId,
    });
    await recordAdEvent({
      eventType: AdEventType.AD_FAILED,
      metadataJson: {
        errorMessage: getErrorMessage(error),
        ordinal: input.ordinal,
        source: "home_feed",
      },
      placement: input.slot.placement,
      provider: input.slot.provider,
      slotId: input.slot.id,
      userId: input.viewerUserId,
    });

    return null;
  }
}

function wrapPin(pin: FeedPinItem): FeedItem {
  return {
    id: pin.id,
    pin,
    type: "PIN",
  };
}

function normalizeFrequency(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown ad provider error.";
}
