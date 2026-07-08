import { randomUUID } from "crypto";
import { AdProvider as PrismaAdProvider } from "@prisma/client";
import type {
  AdProvider,
  AdProviderAvailabilityInput,
  AdProviderFailureInput,
  AdProviderRenderInput,
  AdProviderTrackInput,
  FeedAdItem,
} from "@/lib/ads/ad-provider";

const DEFAULT_CLICK_URL = "https://www.yektanet.com/";
const DEFAULT_SCRIPT_URL = "https://cdn.yektanet.com/native/native.js";

export class YektanetAdProvider implements AdProvider {
  readonly name = PrismaAdProvider.YEKTANET;

  isEnabled(input: AdProviderAvailabilityInput) {
    const config = readConfig(input.slot.providerConfigJson);
    const yektanet = getYektanetConfig(config);

    if (yektanet.forceFailure) {
      return true;
    }

    if (yektanet.enabled === false && !yektanet.localMockEnabled) {
      return false;
    }

    if (yektanet.hasRemoteConfig) {
      return true;
    }

    return yektanet.localMockEnabled;
  }

  async renderAd(input: AdProviderRenderInput): Promise<FeedAdItem | null> {
    const config = readConfig(input.slot.providerConfigJson);
    const yektanet = getYektanetConfig(config);

    if (yektanet.forceFailure) {
      throw new Error("Yektanet ad rendering was forced to fail.");
    }

    if (!this.isEnabled({ slot: input.slot })) {
      return null;
    }

    return {
      adReference:
        getString(config, "adReference") ??
        `yektanet-${yektanet.placementId ?? input.slot.id}-${input.ordinal}-${randomUUID()}`,
      body:
        getString(config, "body") ??
        (yektanet.hasRemoteConfig
          ? "Native advertising delivered through the Yektanet provider layer."
          : "Local mock native ad for feed layout testing."),
      callToAction: getString(config, "callToAction") ?? "Learn more",
      clickUrl: getSafeExternalUrl(getString(config, "clickUrl")) ?? DEFAULT_CLICK_URL,
      imageUrl: getSafeExternalUrl(getString(config, "imageUrl")),
      label: "Advertisement",
      placement: input.slot.placement,
      provider: this.name,
      slotId: input.slot.id,
      title:
        getString(config, "title") ??
        (yektanet.hasRemoteConfig ? "Sponsored idea" : "Yektanet mock ad"),
    };
  }

  async trackClick(_input: AdProviderTrackInput) {
    // Placeholder for a future Yektanet click callback or SDK integration.
  }

  async trackImpression(_input: AdProviderTrackInput) {
    // Placeholder for future provider-side impression tracking.
  }

  async handleFailure(_input: AdProviderFailureInput) {
    // Provider failures are recorded internally by the ad event service.
  }
}

function getYektanetConfig(config: Record<string, unknown>) {
  const envEnabled = getBoolean(process.env.YEKTANET_ENABLED);
  const enabled = getBoolean(config.enabled) ?? envEnabled;
  const publisherId =
    getString(config, "publisherId") ?? process.env.YEKTANET_PUBLISHER_ID?.trim();
  const widgetId =
    getString(config, "widgetId") ?? process.env.YEKTANET_WIDGET_ID?.trim();
  const placementId =
    getString(config, "placementId") ?? process.env.YEKTANET_PLACEMENT_ID?.trim();
  const scriptUrl =
    getSafeExternalUrl(getString(config, "scriptUrl")) ??
    getSafeExternalUrl(process.env.YEKTANET_SCRIPT_URL) ??
    DEFAULT_SCRIPT_URL;
  const hasRemoteConfig = Boolean(publisherId && widgetId && placementId);
  const localMockEnabled =
    getBoolean(config.mockEnabled) ??
    getBoolean(process.env.YEKTANET_LOCAL_MOCK_ENABLED) ??
    (process.env.NODE_ENV !== "production" && enabled !== false && !hasRemoteConfig);

  return {
    enabled,
    forceFailure:
      getBoolean(config.forceFailure) === true ||
      getBoolean(process.env.YEKTANET_FORCE_FAILURE) === true,
    hasRemoteConfig,
    localMockEnabled,
    placementId,
    publisherId,
    scriptUrl,
    widgetId,
  };
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

function getBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function getSafeExternalUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
