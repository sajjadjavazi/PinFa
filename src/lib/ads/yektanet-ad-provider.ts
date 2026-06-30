import { randomUUID } from "crypto";
import { AdProvider as PrismaAdProvider } from "@prisma/client";
import type {
  AdProvider,
  AdProviderFailureInput,
  AdProviderRenderInput,
  AdProviderTrackInput,
  FeedAdItem,
} from "@/lib/ads/ad-provider";

const DEFAULT_CLICK_URL = "https://www.yektanet.com/";

export class YektanetAdProvider implements AdProvider {
  readonly name = PrismaAdProvider.YEKTANET;

  async renderAd(input: AdProviderRenderInput): Promise<FeedAdItem | null> {
    const config = readConfig(input.slot.providerConfigJson);

    if (config.forceFailure === true) {
      throw new Error("Yektanet ad rendering was forced to fail.");
    }

    return {
      adReference:
        getString(config, "adReference") ??
        `yektanet-${input.slot.id}-${input.ordinal}-${randomUUID()}`,
      body:
        getString(config, "body") ??
        "Promoted visual inspiration selected for this feed.",
      callToAction: getString(config, "callToAction") ?? "Learn more",
      clickUrl: getString(config, "clickUrl") ?? DEFAULT_CLICK_URL,
      imageUrl: getString(config, "imageUrl"),
      label: "Advertisement",
      placement: input.slot.placement,
      provider: this.name,
      slotId: input.slot.id,
      title: getString(config, "title") ?? "Sponsored idea",
    };
  }

  async trackClick(_input: AdProviderTrackInput) {
    // Placeholder for Yektanet click callback or SDK integration.
  }

  async trackImpression(_input: AdProviderTrackInput) {
    // Placeholder for provider-side impression tracking.
  }

  async handleFailure(_input: AdProviderFailureInput) {
    // Provider failures are recorded internally by the ad event service.
  }
}

function readConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getString(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}
