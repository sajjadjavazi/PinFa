import type {
  AdPlacement,
  AdProvider as PrismaAdProvider,
  Prisma,
} from "@prisma/client";

export type FeedAdItem = {
  adReference: string;
  body: string | null;
  callToAction: string | null;
  clickUrl: string;
  imageUrl: string | null;
  label: "Advertisement";
  placement: AdPlacement;
  provider: PrismaAdProvider;
  slotId: string;
  title: string;
};

export type AdSlotForProvider = {
  frequencyEvery: number;
  id: string;
  name: string;
  placement: AdPlacement;
  provider: PrismaAdProvider;
  providerConfigJson: Prisma.JsonValue | null;
};

export type AdProviderRenderInput = {
  ordinal: number;
  slot: AdSlotForProvider;
  viewerUserId?: string | null;
};

export type AdProviderAvailabilityInput = {
  slot: AdSlotForProvider;
};

export type AdProviderTrackInput = {
  adReference: string;
  slot: AdSlotForProvider;
  userId?: string | null;
};

export type AdProviderFailureInput = {
  error: unknown;
  phase: "render" | "click" | "impression";
  slot: AdSlotForProvider;
  userId?: string | null;
};

export interface AdProvider {
  readonly name: PrismaAdProvider;
  handleFailure?(input: AdProviderFailureInput): Promise<void>;
  isEnabled?(input: AdProviderAvailabilityInput): boolean;
  renderAd(input: AdProviderRenderInput): Promise<FeedAdItem | null>;
  trackClick?(input: AdProviderTrackInput): Promise<void>;
  trackImpression?(input: AdProviderTrackInput): Promise<void>;
}
